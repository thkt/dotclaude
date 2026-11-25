/// <reference types="node" />
import { type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { git } from "../../../hooks/_lib/gate_record.ts";
import { agreedIssueOf, ASSESSED, baseConfigOf, gateStatusOf, isDigest, isPositiveInteger, isShellOrArgv, isUniqueNames, type Launch, listOf, nonEmpty, notDoneOf, notPrepared, objectOf, oneLine, outputOf, type Prepared, preparedAt, type Problem, publishTargetProblem, remoteProblem, type Result, runQuiet, stopped, type WorktreeCall, writeLaunch } from "./launch-state.ts";
import { captureConfigOf } from "./capture.ts";
import { currentReviewOf, nextOf, publishedFieldsOf } from "./rounds.ts";

const parseArray = (text: string): unknown[] | null => {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
};

interface Publication {
  commit: string;
  number: number;
  url: string;
  bodyDigest: unknown;
}

type HeadState = "first" | "published" | "stacked";

const lastPublicationOf = ({ stored, launchPath }: Prepared): Publication | null | Problem => {
  const { publications } = stored;
  if (!Array.isArray(publications) || publications.length === 0) return null;
  const last = objectOf(publications[publications.length - 1]);
  if (last !== null && nonEmpty(last.commit) && isPositiveInteger(last.number) && nonEmpty(last.url)) {
    return { commit: last.commit, number: last.number, url: last.url, bodyDigest: last.body_digest };
  }
  const detail = `The last entry of publications in ${launchPath} lacks a commit, a positive integer number, or a url. launch.ts does not repair it.`;
  return { reason: "publications-unreadable", detail };
};

const headStateOf = (worktree: string, base: string, tree: unknown, last: Publication | null): HeadState | Problem => {
  const [head = null, ...parents] = (git(["rev-list", "--parents", "-n", "1", "HEAD"], worktree) ?? "").split(" ").filter((id) => id !== "");
  const holdsTree = git(["rev-parse", "--verify", "--quiet", "HEAD^{tree}"], worktree) === tree;
  const onTopOf = (commit: string) => parents.length === 1 && parents[0] === commit && holdsTree;
  if (last === null) {
    if (onTopOf(base)) return "first";
    const detail = `HEAD of ${worktree} is not one commit on top of ${base} that holds the reviewed tree ${String(tree)}. Commit the reviewed working tree as one commit, and nothing else.`;
    return { reason: "commit-mismatch", detail };
  }
  if (head === last.commit && holdsTree) return "published";
  if (onTopOf(last.commit)) return "stacked";
  const detail = `HEAD of ${worktree} is neither the published commit ${last.commit} nor one commit on top of it, or it does not hold the reviewed tree ${String(tree)}. Commit the reviewed working tree as one commit on top of ${last.commit}, and nothing else.`;
  return { reason: "commit-mismatch", detail };
};

const publishConfigOf = (worktree: string, { base, repository }: Launch): { remote: string; baseBranch: string } | Problem => {
  const config = baseConfigOf(worktree, base);
  if (config !== null && nonEmpty(config.remote) && nonEmpty(config.baseBranch) && config.repository === repository) {
    return { remote: config.remote, baseBranch: config.baseBranch };
  }
  const detail = `The base commit ${base} of ${worktree} has no .dotagents.json with remote and baseBranch strings and the repository ${repository}.`;
  return { reason: "no-config", detail };
};

const actorOf = (worktree: string): string | Problem => {
  const user = runQuiet("gh", ["api", "user", "--jq", ".login"], worktree);
  if (user.status === 0 && nonEmpty(user.stdout)) return user.stdout.trim();
  return { reason: "no-actor", detail: "gh api user returned no login. Fix the gh authentication." };
};

const openPullsOf = (worktree: string, repository: string, branch: string): unknown[] | Problem => {
  const owner = repository.slice(0, repository.indexOf("/"));
  const args = ["api", `repos/${repository}/pulls`, "--method", "GET", "-f", "state=open", "-f", `head=${owner}:${branch}`];
  const listed = runQuiet("gh", args, worktree);
  const pulls = listed.status === 0 ? parseArray(listed.stdout) : null;
  if (pulls !== null) return pulls;
  const detail = `gh could not list the open pull requests of ${repository} for the branch ${branch}: ${outputOf(listed)}`;
  return { reason: "pulls-unreadable", detail };
};

const branchPullsOf = (pulls: unknown[], repository: string, branch: string): Record<string, unknown>[] =>
  pulls
    .map(objectOf)
    .filter((pull): pull is Record<string, unknown> => {
      const head = objectOf(pull?.head);
      return head?.ref === branch && objectOf(head?.repo)?.full_name === repository;
    });

const urlOf = (pull: Record<string, unknown>): string => (typeof pull.html_url === "string" ? pull.html_url : "unknown");

const branchPullProblem = (worktree: string, repository: string, branch: string): Problem | null => {
  const pulls = openPullsOf(worktree, repository, branch);
  if (!Array.isArray(pulls)) return pulls;
  const [found] = branchPullsOf(pulls, repository, branch);
  if (found === undefined) return null;
  return { reason: "branch-pr-exists", detail: `An open pull request already uses the branch ${branch}: ${urlOf(found)}.` };
};

interface PublishFacts {
  prepared: Prepared;
  tree: unknown;
  head: string | null;
  last: Publication | null;
  state: HeadState;
  config: { remote: string; baseBranch: string };
  actor: string;
}

const publishFactsOf = (worktree: string): PublishFacts | Problem => {
  const prepared = preparedAt(worktree);
  if (prepared === null) return { reason: "not-prepared", detail: notPrepared(worktree) };
  const { stored, launch } = prepared;
  const next = nextOf(worktree);
  if (next.kind === "stop") return { reason: next.reason, detail: next.detail };
  if (next.kind === "call") {
    const detail = `run would call ${next.action} next for ${worktree}, so the current working tree has no accepted review against the agreed Issue. Call run first.`;
    return { reason: "not-accepted", detail };
  }
  const status = gateStatusOf(worktree);
  if (status.status !== 0) return { reason: "not-done", detail: notDoneOf(status) };
  const tree = currentReviewOf(stored)?.tree;
  const last = lastPublicationOf(prepared);
  if (last !== null && "reason" in last) return last;
  const state = headStateOf(worktree, launch.base, tree, last);
  if (typeof state !== "string") return state;
  const config = publishConfigOf(worktree, launch);
  if ("reason" in config) return config;
  const target = remoteProblem(worktree, config.remote, launch.repository) ?? publishTargetProblem(launch.repository, worktree);
  if (target !== null) return target;
  const actor = actorOf(worktree);
  if (typeof actor !== "string") return actor;
  return { prepared, tree, head: git(["rev-parse", "HEAD"], worktree), last, state, config, actor };
};

const publishFields = ({ prepared: { launch }, config, tree, actor }: PublishFacts, commit: string | null) => ({
  issue: launch.issue,
  repository: launch.repository,
  remote: config.remote,
  base_branch: config.baseBranch,
  branch: launch.branch,
  base: launch.base,
  commit,
  tree,
  actor,
});

interface Expected {
  number: number | null;
  actor: string;
  commit: string | null;
  baseBranch: string;
  repository: string;
}

const PULL_FIELDS: [string, (pull: Record<string, unknown>, expected: Expected) => boolean][] = [
  ["number", (pull, { number }) => number === null || pull.number === number],
  ["draft", (pull) => pull.draft === true],
  ["author", (pull, { actor }) => objectOf(pull.user)?.login === actor],
  ["head", (pull, { commit }) => objectOf(pull.head)?.sha === commit],
  [
    "base",
    (pull, { baseBranch, repository }) => {
      const base = objectOf(pull.base);
      return base?.ref === baseBranch && objectOf(base?.repo)?.full_name === repository;
    },
  ],
];

const differingOf = (pull: Record<string, unknown>, facts: PublishFacts, commit: string | null): string[] => {
  const expected = {
    number: facts.last?.number ?? null,
    actor: facts.actor,
    commit,
    baseBranch: facts.config.baseBranch,
    repository: facts.prepared.launch.repository,
  };
  return PULL_FIELDS.filter(([, same]) => !same(pull, expected)).map(([name]) => name);
};

const sha256Of = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

const headShaOf = (pull: Record<string, unknown>): unknown => objectOf(pull.head)?.sha;

const selectedPullOf = (worktree: string, facts: PublishFacts): { pull: Record<string, unknown> } | Problem => {
  const { repository, branch } = facts.prepared.launch;
  const pulls = openPullsOf(worktree, repository, branch);
  if (!Array.isArray(pulls)) return pulls;
  const selected = branchPullsOf(pulls, repository, branch);
  if (selected.length === 0) {
    const detail =
      facts.last === null
        ? `No open pull request of ${repository} uses the branch ${branch}. If the commit ${facts.head} is not published yet, push it and open a draft pull request into ${facts.config.baseBranch}, then call again.`
        : `No open pull request of ${repository} uses the branch ${branch}. The pull request ${facts.last.url} that launch.json records is closed or merged.`;
    return { reason: "no-pr", detail };
  }
  if (selected.length > 1) {
    const detail = `${selected.length} open pull requests of ${repository} use the branch ${branch}: ${selected.map(urlOf).join(", ")}. Close all but the one this launch opened, then call again.`;
    return { reason: "several-prs", detail };
  }
  const [pull] = selected;
  if (!isPositiveInteger(pull.number) || !nonEmpty(pull.html_url)) {
    const detail = `gh listed an open pull request for the branch ${branch} that lacks a positive integer number or a non-empty html_url.`;
    return { reason: "pulls-unreadable", detail };
  }
  return { pull };
};

const stackedPullOf = (worktree: string, facts: PublishFacts, last: Publication): { pull: Record<string, unknown> } | Problem => {
  const found = selectedPullOf(worktree, facts);
  if ("reason" in found) return found;
  const { pull } = found;
  if (headShaOf(pull) === facts.head) {
    return { reason: "already-pushed", detail: `The pull request ${pull.html_url} already has the commit ${facts.head} as its head. Call published.` };
  }
  const differing = differingOf(pull, facts, last.commit);
  if (differing.length > 0) return recordedMismatchOf(pull, differing, facts.prepared.launch.repository);
  if (!isDigest(last.bodyDigest) || (typeof pull.body === "string" && sha256Of(pull.body) === last.bodyDigest)) return { pull };
  return bodyChangedOf(pull);
};

const recordedMismatchOf = (pull: Record<string, unknown>, differing: string[], repository: string): Problem => {
  const detail = `The pull request ${pull.html_url} differs from the publication launch.json records: ${differing.join(", ")}. Reconcile it on GitHub, then call again. A pull request marked ready is turned back to a draft with \`gh pr ready ${pull.number} --undo --repo ${repository}\`.`;
  return { reason: "pr-mismatch", detail };
};

const bodyChangedOf = (pull: Record<string, unknown>): Problem => {
  const detail = `The body of the pull request ${pull.html_url} changed after launch.ts recorded it. launch.ts does not overwrite a change someone else made. A human decides how to keep it.`;
  return { reason: "body-changed", detail };
};

const publishableAt = (
  worktree: string,
  facts: PublishFacts,
): { fields: Record<string, unknown>; pull?: Record<string, unknown> } | Problem => {
  const { launch } = facts.prepared;
  if (facts.last === null) return branchPullProblem(worktree, launch.repository, launch.branch) ?? { fields: {} };
  if (facts.state === "published") {
    const detail = `HEAD of ${worktree} is the commit ${facts.last.commit} that ${facts.last.url} already has, and it holds the reviewed tree. There is nothing to push.`;
    return { reason: "already-published", detail };
  }
  const found = stackedPullOf(worktree, facts, facts.last);
  if ("reason" in found) return found;
  return { fields: { number: found.pull.number, url: found.pull.html_url }, pull: found.pull };
};

export const publishable = ({ worktree }: WorktreeCall): Result => {
  const stop = ({ reason, detail }: Problem) => stopped("publishable", reason, detail);

  const facts = publishFactsOf(worktree);
  if ("reason" in facts) return stop(facts);
  const pull = publishableAt(worktree, facts);
  if ("reason" in pull) return stop(pull);
  return {
    action: "publishable",
    ok: true,
    ...publishFields(facts, facts.head),
    ...pull.fields,
    launch_file: facts.prepared.launchPath,
  };
};

const ASSET_PREFIX = "https://github.com/user-attachments/assets/";
const ASSET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ASSET_ID_LENGTH = 36;

const referenceOf = (path: string): string => `![${path}](${path})`;

const isVideo = (path: string): boolean => /\.(mp4|webm)$/i.test(path);

const assetAt = (text: string, at: number): boolean =>
  text.startsWith(ASSET_PREFIX, at) && ASSET_ID.test(text.slice(at + ASSET_PREFIX.length, at + ASSET_PREFIX.length + ASSET_ID_LENGTH));

const attachedLengthAt = (text: string, at: number, path: string): number | null => {
  const assetLength = ASSET_PREFIX.length + ASSET_ID_LENGTH;
  if (isVideo(path)) return assetAt(text, at) ? assetLength : null;
  const opening = `![${path}](`;
  if (!text.startsWith(opening, at) || !assetAt(text, at + opening.length)) return null;
  return text.startsWith(")", at + opening.length + assetLength) ? opening.length + assetLength + 1 : null;
};

const nextReferenceOf = (text: string, from: number, media: string[]): { at: number; path: string } | null =>
  media
    .map((path) => ({ at: text.indexOf(referenceOf(path), from), path }))
    .filter(({ at }) => at !== -1)
    .reduce<{ at: number; path: string } | null>((first, found) => (first === null || found.at < first.at ? found : first), null);

const unattachedOf = (built: string, actual: string, media: string[]): string[] | null => {
  const unattached: string[] = [];
  let builtAt = 0;
  let actualAt = 0;
  for (let found = nextReferenceOf(built, 0, media); found !== null; found = nextReferenceOf(built, builtAt, media)) {
    const literal = built.slice(builtAt, found.at);
    if (!actual.startsWith(literal, actualAt)) return null;
    actualAt += literal.length;
    const reference = referenceOf(found.path);
    const attached = attachedLengthAt(actual, actualAt, found.path);
    if (attached !== null) actualAt += attached;
    else if (actual.startsWith(reference, actualAt)) {
      actualAt += reference.length;
      if (!unattached.includes(found.path)) unattached.push(found.path);
    } else return null;
    builtAt = found.at + reference.length;
  }
  return actual.slice(actualAt) === built.slice(builtAt) ? unattached : null;
};

const publishedPullOf = (
  worktree: string,
  facts: PublishFacts,
  mediaAt = "HEAD",
): { pull: Record<string, unknown>; body: string } | Problem => {
  const found = selectedPullOf(worktree, facts);
  if ("reason" in found) return found;
  const { pull } = found;
  const { last, state } = facts;
  if (state === "stacked" && last !== null && headShaOf(pull) === last.commit) {
    const { branch } = facts.prepared.launch;
    const detail = `The pull request ${pull.html_url} still has the published commit ${last.commit} as its head. Push the commit ${facts.head} to the branch ${branch} of ${facts.config.remote}, then call again.`;
    return { reason: "not-pushed", detail };
  }
  const built = bodyTextOf(worktree, facts, mediaAt);
  if ("reason" in built) return built;
  const unattached = typeof pull.body === "string" ? unattachedOf(built.text, pull.body, built.media) : null;
  const differing = [...differingOf(pull, facts, facts.head), ...(unattached === null ? ["body"] : [])];
  if (differing.length > 0) {
    const detail = `The pull request ${pull.html_url} differs from what launch.ts confirmed before the push: ${differing.join(", ")}. Reconcile it on GitHub, then call again.`;
    return { reason: "pr-mismatch", detail };
  }
  if (unattached !== null && unattached.length > 0) {
    const bodyFile = join(facts.prepared.gate.dir, BODY_FILE);
    const detail = `The body of ${pull.html_url} still holds the relative reference of ${unattached.join(", ")}. In ${worktree}, run gh pr edit ${pull.number} --body-file ${bodyFile} with one --attach for every media of the body (${built.media.join(", ")}), then call published again.`;
    return { reason: "media-unattached", detail };
  }
  return { pull, body: pull.body as string };
};

export const published = ({ worktree }: WorktreeCall): Result => {
  const stop = ({ reason, detail }: Problem) => stopped("published", reason, detail);

  const facts = publishFactsOf(worktree);
  if ("reason" in facts) return stop(facts);
  const found = publishedPullOf(worktree, facts);
  if ("reason" in found) return stop(found);
  return publishedOutput("published", facts, recordPublication(facts, found.pull, found.body));
};

const recordPublication = (facts: PublishFacts, pull: Record<string, unknown>, publicBody: string) => {
  const { launchPath, stored } = facts.prepared;
  const record = {
    number: pull.number,
    url: pull.html_url,
    commit: facts.head,
    tree: facts.tree,
    base_branch: facts.config.baseBranch,
    actor: facts.actor,
    body_digest: sha256Of(publicBody),
    at: new Date().toISOString(),
  };
  writeLaunch(launchPath, { ...stored, publications: [...listOf(stored, "publications"), record] });
  return record;
};

const publishedOutput = (action: string, facts: PublishFacts, record: ReturnType<typeof recordPublication>): Result => ({
  action,
  ok: true,
  ...publishFields(facts, record.commit),
  number: record.number,
  url: record.url,
  body_digest: record.body_digest,
  at: record.at,
  launch_file: facts.prepared.launchPath,
});

const PUBLISHED_INSTEAD = "If this launch opened the pull request, call launch.ts published.";
const PUBLISHED_AFTER_FIX = "After fixing it on GitHub, call launch.ts published.";
const STDERR_LIMIT = 500;
const PR_NUMBER = /^[1-9]\d*$/;

const withSentence = ({ reason, detail }: Problem, sentence: string): Problem => ({ reason, detail: `${detail} ${sentence}` });

const stderrOf = (run: SpawnSyncReturns<string>): string =>
  oneLine(`${run.stderr ?? ""} ${run.error?.message ?? ""}`).slice(0, STDERR_LIMIT);

const commandFailure = (reason: string, command: string, run: SpawnSyncReturns<string>): Problem => ({
  reason,
  detail: `${command} exited ${run.status ?? run.signal}: ${stderrOf(run)}`,
});

const pushedPullOf = (worktree: string, facts: PublishFacts, built: { text: string; media: string[] }): { pull: Record<string, unknown> } | Problem => {
  const found = selectedPullOf(worktree, facts);
  if ("reason" in found) return found;
  const { pull } = found;
  const differing = differingOf(pull, facts, facts.head);
  if (differing.length > 0) return recordedMismatchOf(pull, differing, facts.prepared.launch.repository);
  if (typeof pull.body !== "string") return bodyChangedOf(pull);
  const recorded = facts.last?.bodyDigest;
  if (isDigest(recorded) && sha256Of(pull.body) === recorded) return { pull };
  return unattachedOf(built.text, pull.body, built.media) === null ? bodyChangedOf(pull) : { pull };
};

const remoteHeadOf = (worktree: string, remote: string, branch: string): { sha: string | null } | Problem => {
  const ref = `refs/heads/${branch}`;
  const listed = runQuiet("git", ["ls-remote", remote, ref], worktree);
  if (listed.status !== 0) return commandFailure("remote-unreadable", `git ls-remote ${remote} ${ref}`, listed);
  const line = listed.stdout.split("\n").find((entry) => entry.endsWith(`\t${ref}`));
  return { sha: line === undefined ? null : line.slice(0, line.indexOf("\t")) };
};

const pushCommit = (worktree: string, remote: string, commit: string, branch: string): Problem | null => {
  const pushed = runQuiet("git", ["push", "--no-follow-tags", remote, `${commit}:refs/heads/${branch}`], worktree);
  return pushed.status === 0 ? null : commandFailure("push-failed", `git push of ${commit} to refs/heads/${branch} of ${remote}`, pushed);
};

const createdNumberOf = (stdout: string): number | null => {
  const last = stdout.split("\n").map((line) => line.trim()).filter((line) => line !== "").at(-1) ?? "";
  const number = last.slice(last.lastIndexOf("/") + 1);
  return last.includes("/") && PR_NUMBER.test(number) ? Number(number) : null;
};

const editPull = (worktree: string, number: unknown, repository: string, bodyFile: string, media: string[]): Problem | null => {
  const attaches = media.flatMap((path) => ["--attach", path]);
  const edited = runQuiet("gh", ["pr", "edit", String(number), "--repo", repository, "--body-file", bodyFile, ...attaches], worktree);
  return edited.status === 0 ? null : commandFailure("pr-edit-failed", "gh pr edit", edited);
};

interface Sharing {
  title: string;
  bodyFile: string;
  built: { text: string; media: string[] };
  pull: Record<string, unknown> | null;
  pushed: boolean;
}

const sharePull = (worktree: string, facts: PublishFacts, { title, bodyFile, built, pull, pushed }: Sharing): { created: boolean; attached: boolean } | Problem => {
  const { repository, branch } = facts.prepared.launch;
  const { text, media } = built;
  if (pull === null) {
    const args = ["pr", "create", "--draft", "--repo", repository, "--base", facts.config.baseBranch, "--head", branch, "--title", title, "--body-file", bodyFile];
    const created = runQuiet("gh", args, worktree);
    if (created.status !== 0) return commandFailure("pr-create-failed", "gh pr create", created);
    const number = createdNumberOf(created.stdout);
    if (number === null) {
      const detail = `gh pr create printed no pull request URL that ends in a positive integer: ${oneLine(created.stdout).slice(0, STDERR_LIMIT)}`;
      return { reason: "pr-create-failed", detail };
    }
    if (media.length === 0) return { created: true, attached: false };
    return editPull(worktree, number, repository, bodyFile, media) ?? { created: true, attached: true };
  }
  const settled = typeof pull.body === "string" && unattachedOf(text, pull.body, media)?.length === 0;
  if (!pushed && settled) return { created: false, attached: false };
  return editPull(worktree, pull.number, repository, bodyFile, media) ?? { created: false, attached: media.length > 0 };
};

export const publish = ({ worktree }: WorktreeCall): Result => {
  const stop = ({ reason, detail }: Problem) => stopped("publish", reason, detail);

  const facts = publishFactsOf(worktree);
  if ("reason" in facts) return stop(facts);
  const ready = publishableAt(worktree, facts);
  if ("reason" in ready && ready.reason !== "already-pushed") {
    return stop(ready.reason === "branch-pr-exists" ? withSentence(ready, PUBLISHED_INSTEAD) : ready);
  }
  const commit = String(facts.head);
  const { gate, launch } = facts.prepared;
  const agreed = agreedIssueOf(launch, worktree);
  if (!("found" in agreed)) return stop(agreed);
  const built = bodyTextOf(worktree, facts, commit);
  if ("reason" in built) return stop(built);
  const bodyFile = join(gate.dir, BODY_FILE);
  writeFileSync(bodyFile, built.text, "utf8");
  const existing = "reason" in ready ? pushedPullOf(worktree, facts, built) : { pull: ready.pull ?? null };
  if ("reason" in existing) return stop(existing);

  const remoteHead = remoteHeadOf(worktree, facts.config.remote, launch.branch);
  if ("reason" in remoteHead) return stop(remoteHead);
  const pushed = remoteHead.sha !== commit;
  const pushFailure = pushed ? pushCommit(worktree, facts.config.remote, commit, launch.branch) : null;
  if (pushFailure !== null) return stop(pushFailure);
  const title = `${agreed.found.title} (#${launch.issue})`;
  const shared = sharePull(worktree, facts, { title, bodyFile, built, pull: existing.pull, pushed });
  if ("reason" in shared) return stop(shared);

  const confirmed = publishedPullOf(worktree, facts, commit);
  if ("reason" in confirmed) return stop(withSentence(confirmed, PUBLISHED_AFTER_FIX));
  const record = recordPublication(facts, confirmed.pull, confirmed.body);
  return { ...publishedOutput("publish", facts, record), pushed, created: shared.created, attached: shared.attached };
};

const BODY_FILE = "pr-body.md";
const OMITTED = "(internal path omitted)";
const PATH_SUFFIX = /[A-Za-z0-9_./\\:@%+~=-]*/.source;
const HOME_OR_DRIVE = new RegExp(`(?<![\\w/:])(?:file:///|~/|[A-Za-z]:\\\\)${PATH_SUFFIX}`, "g");

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publicTextOf =
  (roots: string[]) =>
  (value: string): string =>
    roots
      .reduce(
        (text, root) => text.replace(new RegExp(`(?<![\\w/:])${escapeRegExp(root)}(?![\\w.-])${PATH_SUFFIX}`, "g"), OMITTED),
        value,
      )
      .replace(HOME_OR_DRIVE, OMITTED);

const repoRootOf = (worktree: string): string[] => {
  const common = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], worktree);
  return common === null ? [] : [dirname(common)];
};

interface BodyConfig {
  check: unknown;
  ciChecks: string[];
}

const bodyConfigOf = (worktree: string, base: string): BodyConfig | Problem => {
  const config = baseConfigOf(worktree, base);
  const ciChecks = config?.ciChecks;
  if (config !== null && isShellOrArgv(config.check) && isUniqueNames(ciChecks) && ciChecks.length > 0) {
    return { check: config.check, ciChecks };
  }
  const detail = `The base commit ${base} of ${worktree} has no .dotagents.json with check and ciChecks.`;
  return { reason: "no-config", detail };
};

interface BodyDocument {
  path: string;
  role: string;
  reason: string;
}

interface BodyFields {
  assessments: Record<(typeof ASSESSED)[number], string>;
  documents: BodyDocument[];
  handoff: string[];
  findings: unknown[];
}

const bodyFieldsOf = (worktree: string, stored: Record<string, unknown>): BodyFields | Problem => {
  const independent = objectOf(currentReviewOf(stored)?.independent);
  const fields = independent === null ? null : publishedFieldsOf(independent, (path) => path !== "");
  if (independent !== null && fields !== null) {
    return { ...(fields as Omit<BodyFields, "findings">), findings: Array.isArray(independent.findings) ? independent.findings : [] };
  }
  const detail = `The last review round of ${worktree} has no assessments, documents, and handoff from the independent review. Call review to record them.`;
  return { reason: "no-assessments", detail };
};

const textOf = (value: unknown): string => (typeof value === "string" ? value : "");

interface RequiredFirst {
  side: unknown;
  problem: string;
}

const requiredLines = (stored: Record<string, unknown>, publicText: (value: string) => string): string[] => {
  const reviews = listOf(stored, "reviews").map((entry) => objectOf(entry) ?? {});
  const firsts = new Map<string, RequiredFirst>();
  for (const record of reviews) {
    for (const entry of Array.isArray(record.required) ? record.required : []) {
      const { key, side, problem } = objectOf(entry) ?? {};
      if (typeof key === "string" && !firsts.has(key)) firsts.set(key, { side, problem: textOf(problem) });
    }
  }
  const judgmentOf = (key: string): Record<string, unknown> | undefined =>
    reviews
      .map((record) => {
        const previous = objectOf(record.independent)?.previous;
        return (Array.isArray(previous) ? previous : []).map((judgment) => objectOf(judgment)).find((judgment) => judgment?.key === key);
      })
      .filter((judgment): judgment is Record<string, unknown> => judgment !== undefined && judgment !== null)
      .at(-1);
  return [...firsts].map(([key, { side, problem }]) => {
    const judgment = judgmentOf(key);
    const state = judgment === undefined ? "unjudged" : String(judgment.state);
    const reason = judgment !== undefined && nonEmpty(judgment.reason) ? judgment.reason : problem;
    return `- reported by ${String(side)} / ${state}: ${publicText(reason)}`;
  });
};

const concernLines = (findings: unknown[], publicText: (value: string) => string): string[] =>
  findings
    .map(objectOf)
    .filter((finding): finding is Record<string, unknown> => finding?.required === false)
    .map(
      ({ condition, problem, action }) =>
        `- concern: ${publicText(textOf(condition))} Problem: ${publicText(textOf(problem))} Suggested action: ${publicText(textOf(action))}`,
    );

interface BodyInput {
  issue: number;
  repository: string;
  commit: string;
  config: BodyConfig;
  fields: BodyFields;
  findingLines: string[];
  publicText: (value: string) => string;
  media: string[];
}

const documentLink = (repository: string, commit: string, path: string): string =>
  `https://github.com/${repository}/blob/${commit}/${path.split("/").map(encodeURIComponent).join("/")}`;

const mediaSection = (media: string[]): string[] =>
  media.length === 0 ? [] : ["## Media", ...media.flatMap((path) => [`\`${path}\``, referenceOf(path)])];

const mediaSteps = (media: string[]): string[] =>
  media.length === 0
    ? []
    : [
        `- Assigned AI: attach the media of the target commit (${media.join(", ")}) with \`gh pr edit --body-file\` and \`--attach\`, and confirm with \`launch.ts published\` that every media reference in the public body points at an uploaded file.`,
        "- Assigned AI: on the PR page, confirm that each media displays or plays and matches its path (rendered_media_check).",
      ];

const bodyOf = ({ issue, repository, commit, config, fields, findingLines, publicText, media }: BodyInput): string =>
  `${[
    `Closes #${issue}`,
    "## Changes and rationale",
    publicText(fields.assessments.code),
    "## Requirements coverage",
    publicText(fields.assessments.requirements),
    "## Verification and unverified items",
    `Target commit: ${commit}`,
    `launch.ts: the target commit holds the tree that the last review round accepted. The local check (${publicText(JSON.stringify(config.check))}) passed. Self review: accepted. Independent review: accepted.`,
    publicText(fields.assessments.tests),
    ...(findingLines.length > 0 ? ["## Findings and responses", ...findingLines] : []),
    "## Documents and sources",
    publicText(fields.assessments.documentation),
    ...fields.documents.map(
      ({ path, role, reason }) => `- [${path}](${documentLink(repository, commit, path)}) (${role}): ${publicText(reason)}`,
    ),
    ...mediaSection(media),
    "## Remaining work and owners",
    `When this body was written, the draft publication, CI, the ${media.length === 0 ? "body check" : "body and media checks"}, the switch to ready, and human approval were not complete.`,
    `- Assigned AI: publish this PR as a draft and confirm that CI on the same head (${config.ciChecks.join(", ")}) registers and succeeds.`,
    ...mediaSteps(media),
    ...fields.handoff.map((step) => `- ${publicText(step)}`),
    `- Assigned AI: compare the latest public body with the Issue, the target commit, the accepted review, and the verification results (published_body_check). After confirming ${media.length === 0 ? "the body and CI" : "the body, the media, and CI"} on the same head, recheck, switch to ready, and read it back (mark_ready). Keep the draft while anything is unconfirmed.`,
    "- Human: decide any change to requirements or permissions, and decide review, approval, and merge.",
  ].join("\n\n")}\n`;

const MEDIA_FILE = /\.(png|jpe?g|webp|mp4|webm)$/i;
const MEDIA_PATH = /^[A-Za-z0-9._/-]+$/;

const mediaOf = (worktree: string, base: string, commit: string): string[] => {
  const config = captureConfigOf(worktree, base);
  if (config === null || "reason" in config) return [];
  const dir = config.destination.replace(/\/+$/, "");
  const diff = runQuiet("git", ["diff", "--name-only", "-z", "--no-renames", "--diff-filter=AM", base, commit, "--", dir], worktree);
  if (diff.status !== 0) return [];
  return diff.stdout.split("\0").filter((path) => path.startsWith(`${dir}/`) && MEDIA_FILE.test(path));
};

const bodyTextOf = (worktree: string, facts: PublishFacts, mediaAt = "HEAD"): { text: string; media: string[] } | Problem => {
  const { stored, launch } = facts.prepared;
  const config = bodyConfigOf(worktree, launch.base);
  if ("reason" in config) return config;
  const fields = bodyFieldsOf(worktree, stored);
  if ("reason" in fields) return fields;
  const media = mediaOf(worktree, launch.base, mediaAt);
  const unsupported = media.find((path) => !MEDIA_PATH.test(path));
  if (unsupported !== undefined) {
    const detail = `The media path ${JSON.stringify(unsupported)} has a character that launch.ts does not write into a pull request body.`;
    return { reason: "media-path-unsupported", detail };
  }
  const publicText = publicTextOf([worktree, ...repoRootOf(worktree)]);
  const findingLines = [...requiredLines(stored, publicText), ...concernLines(fields.findings, publicText)];
  const text = bodyOf({ issue: launch.issue, repository: launch.repository, commit: String(facts.head), config, fields, findingLines, publicText, media });
  return { text, media };
};

export const body = ({ worktree }: WorktreeCall): Result => {
  const stop = ({ reason, detail }: Problem) => stopped("body", reason, detail);

  const facts = publishFactsOf(worktree);
  if ("reason" in facts) return stop(facts);
  const { gate, launchPath, launch } = facts.prepared;
  const built = bodyTextOf(worktree, facts);
  if ("reason" in built) return stop(built);
  const { text, media } = built;
  const bodyFile = join(gate.dir, BODY_FILE);
  writeFileSync(bodyFile, text, "utf8");
  return {
    action: "body",
    ok: true,
    issue: launch.issue,
    repository: launch.repository,
    branch: launch.branch,
    commit: String(facts.head),
    tree: facts.tree,
    body_file: bodyFile,
    body_digest: sha256Of(text),
    media,
    launch_file: launchPath,
  };
};
