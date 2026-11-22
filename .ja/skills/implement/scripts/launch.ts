#!/usr/bin/env node
/// <reference types="node" />
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type GateLocation, gateLocation, git, readJson, treeHash } from "../../../hooks/_lib/gate_record.ts";
import { type ChildOutcome, type ChildRun, endAll, GIVE_REPLY, runClaudeOnce } from "../../../workflows/_lib/claude-run.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";
import { type HolderStop, type Holding, hold } from "./holders.ts";

export const TYPE_BY_PREFIX: Record<string, string> = { bug: "fix", feature: "feat", docs: "docs", chore: "chore" };

const DONE_GATE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "hooks", "lifecycle", "done_gate.ts");
const LAUNCH_FILE = "launch.json";
const CHILD_TIMEOUT_MS = 3_600_000;
const DESCRIPTION = /^[a-z0-9]+(-[a-z0-9]+){1,3}$/;
const DIGEST = /^[0-9a-f]{64}$/;

const USAGE =
  "usage: launch.ts prepare --repo <abs path> --issue <number> [--description <words>] [--gate-mode record|enforce]\n" +
  "       launch.ts implement --worktree <abs path> [--model <name>] [--fresh]\n" +
  "       launch.ts review --worktree <abs path> [--model <name>]\n" +
  "       launch.ts repair --worktree <abs path> [--model <name>]\n" +
  "       launch.ts agree --worktree <abs path>\n" +
  "       launch.ts reread --worktree <abs path> [--model <name>]\n" +
  "       launch.ts continue --worktree <abs path> [--model <name>]\n" +
  "       launch.ts run --worktree <abs path> [--model <name>]\n" +
  "       launch.ts publishable --worktree <abs path>\n" +
  "       launch.ts published --worktree <abs path>\n" +
  "       launch.ts body --worktree <abs path>\n";

const promptFor = (issue: number, repository: string, doneGate: string): string =>
  `Implement GitHub Issue #${issue} of ${repository} in this worktree.

1. Read the Issue with \`gh issue view ${issue} --repo ${repository} --json title,body\`. The Issue is the agreed requirement. Do not change its scope, and do not do what it lists as out of scope.
2. Make the change the Issue asks for, following the repository's rules that apply to the files you touch.
3. Run \`${doneGate} check\`. It runs the repository's full check and records the result for the current working tree. Fix what fails and run it again.
4. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: the files you changed, what \`${doneGate} status\` printed, each decision you made that the Issue does not state, and each step the Issue hands over to a named person.
`;

const resumePrompt = (issue: number, repository: string, base: string, doneGate: string): string =>
  `Your turn implementing GitHub Issue #${issue} of ${repository} in this worktree was interrupted before you replied.

1. Find where the work stopped. Read \`git status --short\` and \`git diff ${base}\`, and recall what you had done and what was left. Keep the changes that are in the worktree. If you had not read the Issue yet, read it with \`gh issue view ${issue} --repo ${repository} --json title,body\`. The Issue is the agreed requirement. Do not change its scope, and do not do what it lists as out of scope.
2. Finish the change the Issue asks for, following the repository's rules that apply to the files you touch.
3. Run \`${doneGate} check\`. It runs the repository's full check and records the result for the current working tree. Fix what fails and run it again.
4. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: the files you changed, what \`${doneGate} status\` printed, each decision you made that the Issue does not state, and each step the Issue hands over to a named person.
`;

const repairPrompt = (issue: number, base: string, findings: string, doneGate: string): string =>
  `The reviews of your change for Issue #${issue} reported findings that must be settled before the change is published. The change is everything in this worktree that differs from commit ${base}, committed or not. Each line below is one finding as a JSON object. \`key\` names the finding, \`side\` is the review that reported it, \`location\` is where it is, \`condition\` is the input or state that triggers it, \`problem\` is what goes wrong, and \`action\` is what the review suggests. \`reopened\` lists the reviews that judged the finding still open after an earlier repair, each with its reason.

${findings}

1. For each finding, read the code it names and reproduce the problem, and judge whether the finding holds. Fix each finding that holds, and add or change a test that fails without the fix. Do not change the scope of the Issue.
2. Run \`${doneGate} check\`. Fix what fails and run it again.
3. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: for each finding, its \`key\` and what you changed, or why you changed nothing; the files you changed; what \`${doneGate} status\` printed; each decision you made for this Issue that the Issue does not state, including the ones from your earlier turns and leaving out the ones you later undid; and each step the Issue hands over to a named person.
`;

const rereadPrompt = (issue: number, repository: string, base: string, doneGate: string): string =>
  `GitHub Issue #${issue} of ${repository} changed after you last read it. The Issue as it is now is the agreed requirement.

1. Read the Issue again with \`gh issue view ${issue} --repo ${repository} --json title,body\`, and find what changed from the version you read before.
2. Compare every requirement, done condition, and out-of-scope item of the Issue with your change. The change is everything in this worktree that differs from commit ${base}, committed or not. Read it with \`git diff ${base}\` and \`git status --short\`. Change the code, the tests, and the documents that no longer match the Issue. Do not change what the Issue does not ask for.
3. Run \`${doneGate} check\`. Fix what fails and run it again.
4. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: what changed in the Issue; for each change, what you changed or why you changed nothing; the files you changed; what \`${doneGate} status\` printed; each decision you made for this Issue that the Issue does not state, including the ones from your earlier turns and leaving out the ones you later undid; and each step the Issue hands over to a named person.
`;

const continuePrompt = (issue: number, repository: string, base: string, doneGate: string): string =>
  `Your work on GitHub Issue #${issue} of ${repository} in this worktree is not finished. \`${doneGate} status\` does not print \`done\`. Your last turn may have been interrupted, or the check may have failed or gone stale after an edit.

1. Find where the work stopped. Read \`git status --short\` and \`git diff ${base}\`, and recall what you were doing: implementing the Issue, settling review findings, or bringing the change in line with a changed Issue. Keep the changes that are in the worktree, and finish that work.
2. Run \`${doneGate} check\`. Fix what fails and run it again.
3. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: what was unfinished; what you changed; the files you changed; what \`${doneGate} status\` printed; each decision you made for this Issue that the Issue does not state, including the ones from your earlier turns and leaving out the ones you later undid; and each step the Issue hands over to a named person.
`;

const REVIEW_TOOLS = "Read,Glob,Grep,LS";

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings", "verified"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["required", "location", "condition", "problem", "action"],
        properties: {
          required: { type: "boolean" },
          location: { type: "string" },
          condition: { type: "string" },
          problem: { type: "string" },
          action: { type: "string" },
        },
      },
    },
    verified: { type: "string" },
  },
};

const PREVIOUS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["key", "state", "reason"],
    properties: {
      key: { type: "string" },
      state: { type: "string", enum: ["fixed", "open", "withdrawn"] },
      reason: { type: "string" },
    },
  },
};

const JUDGING_SCHEMA = {
  ...REVIEW_SCHEMA,
  required: [...REVIEW_SCHEMA.required, "previous"],
  properties: { ...REVIEW_SCHEMA.properties, previous: PREVIOUS_SCHEMA },
};

const STATES: readonly unknown[] = PREVIOUS_SCHEMA.items.properties.state.enum;

const ASSESSED = ["code", "requirements", "tests", "documentation"] as const;

const PUBLISHED_PROPERTIES = {
  assessments: {
    type: "object",
    additionalProperties: false,
    required: [...ASSESSED],
    properties: Object.fromEntries(ASSESSED.map((name) => [name, { type: "string" }])),
  },
  documents: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["path", "role", "reason"],
      properties: {
        path: { type: "string" },
        role: { type: "string", enum: ["current", "historical", "proposal"] },
        reason: { type: "string" },
      },
    },
  },
  handoff: { type: "array", items: { type: "string" } },
};

const ROLES: readonly unknown[] = PUBLISHED_PROPERTIES.documents.items.properties.role.enum;

const publishing = <Schema extends typeof REVIEW_SCHEMA>(schema: Schema) => ({
  ...schema,
  required: [...schema.required, ...Object.keys(PUBLISHED_PROPERTIES)],
  properties: { ...schema.properties, ...PUBLISHED_PROPERTIES },
});

const INDEPENDENT_REVIEW_SCHEMA = publishing(REVIEW_SCHEMA);

const INDEPENDENT_JUDGING_SCHEMA = publishing(JUDGING_SCHEMA);

const REVIEW_POINTS = `Assess four separate things:
1. Code: correctness at the input boundaries, state written to disk, behavior when something fails, and concrete redundancy (the same file read or the same judgment computed twice).
2. Requirements and scope: every item the Issue scopes is present and behaves as the Issue's tables say, and nothing the Issue lists as out of scope changed. Check each sentence the Issue says to insert verbatim against the Issue mechanically.
3. Tests: each done condition in the Issue has a test that would fail if the behavior were removed. Run the targeted tests. For at least two tests, break the code in a temporary copy to show the test fails, and say what you broke.
4. Documentation and repository rules that apply to the changed files. Read the repository's instruction files, such as CLAUDE.md and AGENTS.md and the rules they point to, to find them.`;

const REVIEW_CLOSING = `Do not edit any file in this worktree. Do not commit. Scratch files go under the directory in $TMPDIR.

Give the result through the structured output. \`findings\` lists every finding. Set \`required\` to true only for a defect you demonstrated or a requirement of the Issue that is not met, which must be fixed before the change is published. Set it to false for every other concern. \`location\` is \`file:line\`, or an empty string when no line applies. \`condition\` is the input or state that triggers the finding, \`problem\` is what goes wrong, and \`action\` is what to do. \`verified\` says what you checked and how. An empty \`findings\` is a valid result.`;

const PUBLISHED_FIELDS = `The pull request body publishes these fields of your result: \`assessments\`, \`documents\`, \`handoff\`, the \`reason\` of each judgment in \`previous\`, and \`condition\`, \`problem\`, and \`action\` of each finding that is not required. Write all of them in the language the Issue body is written in.

Give each explanation one home. \`assessments.code\` explains the final change and why. \`assessments.requirements\` maps the change to the behavior the Issue agreed. \`assessments.tests\` states what was actually verified and the limits of that verification. \`assessments.documentation\` explains which documents and sources apply, where they agree with the change, and which premises changed. Give a substantive reason in all four, also when one of them does not apply. Do not repeat the same change, conclusion, or caveat across them, and do not retell the history of review rounds and repairs.

For a judgment of \`fixed\` or \`withdrawn\`, \`reason\` is the complete public response: name the problem and its conditions, and the current resolution or why the finding did not hold.

In \`documents\`, list the principal repository documents you actually consulted. \`path\` is relative to the repository root and must be a regular file in this worktree. \`role\` is \`current\` for a document that states what holds now, \`historical\` for a record of the past, and \`proposal\` for something not adopted. \`reason\` says why you consulted it.

\`handoff\` lists only what is specific to this Issue: conditions left unverified, required follow-up, and steps handed to a named owner. The publishing side adds the routine tasks itself (publication, CI, the check of the published body, and human review, approval, and merge), so do not repeat them. Return \`[]\` when nothing remains.`;

const selfOpening = (issue: number, base: string): string =>
  `Before your change for Issue #${issue} is published, review it yourself and try to refute it. The change is everything in this worktree that differs from commit ${base}, committed or not. Read the change again with \`git diff ${base}\` and \`git status --short\`, each untracked file, and the code the change calls or is called by.`;

const independentOpening = (issue: number, repository: string, base: string): string =>
  `Independently review the change in this worktree against GitHub Issue #${issue} of ${repository}. The change is everything in this worktree that differs from commit ${base}, committed or not. You did not write this change, and you have no context from the session that did. New files may be untracked, so read the change with \`git diff ${base}\` and \`git status --short\`, and read each untracked file.

Read the Issue with \`gh issue view ${issue} --repo ${repository} --json title,body\`, the change, and the code the change calls or is called by.`;

const earlierParagraph = (earlier: string): string =>
  `An earlier review round reported the findings below as required, and the change may have been repaired since. Each line is one finding as a JSON object with its \`key\`.

${earlier}`;

const replyParagraph = (reply: string): string =>
  `The implementing session replied to the earlier findings as follows. Treat the reply as a claim to check, not as a fact.

${reply}`;

const JUDGE_EARLIER =
  "Judge each earlier finding against the current change. In `previous`, return exactly one entry for every `key`. `state` is `fixed` when the problem no longer occurs, `open` when it still occurs, and `withdrawn` when you now judge that the finding did not hold. `reason` says what you checked and what you saw. Do not repeat an earlier finding in `findings`. `findings` is for problems the earlier rounds did not report.";

const reviewPrompt = (opening: string, judging: string[], published: string[]): string =>
  [opening, ...judging, REVIEW_POINTS, ...published, REVIEW_CLOSING].join("\n\n");

type Flags = Record<string, string>;
type Result = Record<string, unknown> & { ok: boolean };

interface Launch {
  issue: number;
  repository: string;
  branch: string;
  base: string;
  issue_digest: string;
}

const readFlags = (argv: string[], allowed: readonly string[], switches: readonly string[] = []): Flags | null => {
  const flags: Flags = {};
  for (let index = 0; index < argv.length; ) {
    const [name, value] = [argv[index], argv[index + 1]];
    if (Object.hasOwn(flags, name)) return null;
    if (switches.includes(name)) {
      flags[name] = "";
      index += 1;
      continue;
    }
    if (!allowed.includes(name) || value === undefined || value === "") return null;
    flags[name] = value;
    index += 2;
  }
  return flags;
};

const stopped = (action: string, reason: string, detail: string, extra: Record<string, unknown> = {}): Result => ({
  action,
  ok: false,
  ...extra,
  reason,
  detail,
});

const oneLine = (text: string): string => text.trim().replace(/\s+/g, " ");

const outputOf = (run: SpawnSyncReturns<string>): string =>
  oneLine(`${run.stdout ?? ""} ${run.stderr ?? ""} ${run.error?.message ?? ""}`);

const runQuiet = (file: string, args: string[], cwd: string): SpawnSyncReturns<string> =>
  spawnSync(file, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const runShown = (file: string, args: string[], cwd: string): SpawnSyncReturns<Buffer> =>
  spawnSync(file, args, { cwd, stdio: ["ignore", 2, 2] });

const exitOf = (run: SpawnSyncReturns<Buffer>): string =>
  `exited ${run.status ?? run.error?.message ?? run.signal}; its output is on stderr`;

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

const objectOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const parseObject = (text: string): Record<string, unknown> | null => {
  try {
    return objectOf(JSON.parse(text));
  } catch {
    return null;
  }
};

const parseArray = (text: string): unknown[] | null => {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
};

const descriptionOf = (title: string): string | null => {
  const words = (title.replace(/^\[\w+\]/, "").toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, 4);
  return words.length >= 2 ? words.join("-") : null;
};

const setupSteps = (setup: unknown): string[][] | null => {
  if (setup === undefined || setup === null) return [];
  if (typeof setup === "string") return setup.trim() === "" ? [] : [["/bin/sh", "-c", setup]];
  const isArgv = (step: unknown): step is string[] =>
    Array.isArray(step) && step.length > 0 && step.every((part) => typeof part === "string") && step[0] !== "";
  return Array.isArray(setup) && setup.every(isArgv) ? setup : null;
};

const CONFIG_KEYS = ["repository", "remote", "baseBranch", "setup", "check", "feedbackCheck", "ciChecks", "capture"];

const isCommandArgv = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === "string") && value[0].trim() !== "";

const isShellOrArgv = (value: unknown): boolean => nonEmpty(value) || isCommandArgv(value);

const isUniqueNames = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(nonEmpty) && new Set(value).size === value.length;

const isRepoRelative =(path: unknown): boolean =>
  nonEmpty(path) && !path.startsWith("/") && !path.split("/").includes("..");

const isCapture = (value: unknown): boolean => {
  if (value === null) return true;
  const capture = objectOf(value);
  return capture !== null && isCommandArgv(capture.command) && isRepoRelative(capture.destination) && typeof capture.required === "boolean";
};

const CONFIG_RULES: [(config: Record<string, unknown>) => boolean, string][] = [
  [(c) => Object.keys(c).every((key) => CONFIG_KEYS.includes(key)), `only these fields are allowed: ${CONFIG_KEYS.join(", ")}`],
  [(c) => typeof c.repository === "string" && /^[\w.-]+\/[\w.-]+$/.test(c.repository), "repository must be owner/name"],
  [(c) => typeof c.remote === "string" && /^[\w.-]+$/.test(c.remote), "remote must be a remote name"],
  [(c) => typeof c.baseBranch === "string" && /^[\w][\w./-]*$/.test(c.baseBranch), "baseBranch must be a branch name"],
  [
    (c) => nonEmpty(c.setup) || (Array.isArray(c.setup) && c.setup.every(isCommandArgv)),
    "setup must be a shell string or an array of argv arrays ([] when none)",
  ],
  [(c) => isShellOrArgv(c.check), "check must be a shell string or a non-empty argv array"],
  [
    (c) => c.feedbackCheck === undefined || isShellOrArgv(c.feedbackCheck),
    "feedbackCheck must be omitted, a shell string, or a non-empty argv array",
  ],
  [
    (c) => isUniqueNames(c.ciChecks),
    "ciChecks must be an array of unique non-empty check names",
  ],
  [
    (c) => "capture" in c && isCapture(c.capture),
    "capture must be null or {command, destination, required} (null when no media is needed)",
  ],
];

const configProblems = (config: Record<string, unknown> | null): string[] =>
  config === null ? [".dotagents.json is not a JSON object"] : CONFIG_RULES.filter(([holds]) => !holds(config)).map(([, message]) => message);

const runSetup = (worktree: string): string | null => {
  const config = parseObject(existsSync(join(worktree, ".dotagents.json")) ? readFileSync(join(worktree, ".dotagents.json"), "utf8") : "");
  const steps = setupSteps(config?.setup);
  if (steps === null) return "setup in .dotagents.json is neither a shell string nor an array of argv arrays";
  for (const [file, ...args] of steps) {
    const run = runShown(file, args, worktree);
    if (run.status !== 0) return `setup step ${JSON.stringify([file, ...args])} ${exitOf(run)}`;
  }
  return null;
};

interface PrepareCall {
  repo: string;
  issue: number;
  description: string | undefined;
  gateMode: string;
}

interface Plan {
  repository: string;
  remote: string;
  baseBranch: string;
  branch: string;
  worktree: string;
  issueDigest: string;
}

const prepareCall = (argv: string[]): PrepareCall | null => {
  const flags = readFlags(argv, ["--repo", "--issue", "--description", "--gate-mode"]);
  if (flags === null) return null;
  const call = {
    repo: flags["--repo"] ?? "",
    issue: Number(flags["--issue"]),
    description: flags["--description"],
    gateMode: flags["--gate-mode"] ?? "record",
  };
  const fits =
    isAbsolute(call.repo) &&
    /^[1-9]\d*$/.test(flags["--issue"] ?? "") &&
    (call.description === undefined || DESCRIPTION.test(call.description)) &&
    (call.gateMode === "record" || call.gateMode === "enforce");
  return fits ? call : null;
};

type ViewedIssue = Record<string, unknown> & { title: string; state: string };

const viewIssue = (issue: number, repository: string, fields: string, cwd: string): ViewedIssue | string => {
  const viewed = runQuiet("gh", ["issue", "view", String(issue), "--repo", repository, "--json", fields], cwd);
  const found = viewed.status === 0 ? parseObject(viewed.stdout) : null;
  if (!found || typeof found.title !== "string" || typeof found.state !== "string") {
    return `gh could not read Issue #${issue} of ${repository}: ${outputOf(viewed)}`;
  }
  return found as ViewedIssue;
};

const digestOf = ({ title, body, state }: Record<string, unknown>): string =>
  createHash("sha256").update(JSON.stringify([title, body, state])).digest("hex");

const issueChange = ({ issue, repository, issue_digest }: Launch, worktree: string): { reason: string; detail: string } | null => {
  const found = viewIssue(issue, repository, "title,body,state", worktree);
  if (typeof found === "string") return { reason: "issue-unreadable", detail: found };
  if (digestOf(found) === issue_digest) return null;
  const detail = `The title, body, or state of Issue #${issue} of ${repository} changed after the agreed version was recorded.`;
  return { reason: "requirements-changed", detail };
};

const prepareStop = (issue: number, reason: string, detail: string): Result =>
  stopped("prepare", reason, detail, { issue });

const REMOTE_LINE = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/;
const GITHUB_URL = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/;
const PUSH_PERMISSIONS = ["ADMIN", "MAINTAIN", "WRITE"];

const remotePointsAt = (repo: string, remote: string, repository: string): boolean => {
  const listed = runQuiet("git", ["-C", repo, "remote", "-v"], repo);
  const lines = (listed.status === 0 ? listed.stdout : "")
    .split("\n")
    .map((line) => REMOTE_LINE.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null && match[1] === remote);
  const kinds = new Set(lines.map((match) => match[3]));
  return kinds.has("fetch") && kinds.has("push") && lines.every((match) => GITHUB_URL.exec(match[2])?.[1] === repository);
};

type Problem = { reason: string; detail: string };

const remoteProblem = (repo: string, remote: string, repository: string): Problem | null => {
  const host = (process.env.GH_HOST ?? "").trim();
  if (host !== "" && host !== "github.com") {
    return { reason: "gh-host", detail: `GH_HOST points at ${host}. launch.ts handles only github.com.` };
  }
  if (remotePointsAt(repo, remote, repository)) return null;
  const detail = `The fetch and push URLs of remote ${remote} in ${repo} do not all point at ${repository} on github.com. Fix .dotagents.json or the remote.`;
  return { reason: "remote-mismatch", detail };
};

const publishTargetProblem = (repository: string, repo: string): Problem | null => {
  const viewed = runQuiet("gh", ["repo", "view", repository, "--json", "nameWithOwner,viewerPermission"], repo);
  const found = viewed.status === 0 ? parseObject(viewed.stdout) : null;
  if (!found || typeof found.nameWithOwner !== "string") {
    return { reason: "repo-unreadable", detail: `gh could not read the repository ${repository}: ${outputOf(viewed)}` };
  }
  const { nameWithOwner, viewerPermission } = found;
  if (nameWithOwner !== repository) {
    const detail = `GitHub names the repository ${nameWithOwner}, which differs from repository ${repository} in .dotagents.json.`;
    return { reason: "repository-mismatch", detail };
  }
  if (typeof viewerPermission === "string" && PUSH_PERMISSIONS.includes(viewerPermission)) return null;
  const permission = typeof viewerPermission === "string" && viewerPermission !== "" ? viewerPermission : "unknown";
  return { reason: "no-permission", detail: `The permission of the gh user on ${repository} is ${permission}, which cannot push.` };
};

const prepareProblemStop = (issue: number, problem: Problem | null): Result | null =>
  problem === null ? null : prepareStop(issue, problem.reason, problem.detail);

const planOf = ({ repo, issue, description }: PrepareCall): Plan | Result => {
  const status = runQuiet("git", ["-C", repo, "status", "--porcelain", "--untracked-files=all", "--", ".dotagents.json"], repo);
  if (status.status === 0 && status.stdout !== "") {
    const detail = `.dotagents.json of ${repo} has uncommitted changes. launch.ts reads the committed file, and neither stashes the changes nor carries them over.`;
    return prepareStop(issue, "uncommitted-start-inputs", detail);
  }
  const shown = runQuiet("git", ["-C", repo, "show", "HEAD:.dotagents.json"], repo);
  if (shown.status !== 0) return prepareStop(issue, "no-config", `HEAD of ${repo} has no .dotagents.json.`);
  const config = parseObject(shown.stdout);
  const problems = configProblems(config);
  if (config === null || problems.length > 0) {
    return prepareStop(issue, "invalid-config", `.dotagents.json at HEAD of ${repo} is not valid: ${problems.join("; ")}.`);
  }
  const { repository, remote, baseBranch, ciChecks } = config as { repository: string; remote: string; baseBranch: string; ciChecks: string[] };
  if (ciChecks.length === 0) {
    return prepareStop(issue, "no-ci-checks", `ciChecks in .dotagents.json of ${repo} is empty, so no check can confirm the published change.`);
  }
  const sourceStop = prepareProblemStop(issue, remoteProblem(repo, remote, repository));
  if (sourceStop !== null) return sourceStop;
  const found = viewIssue(issue, repository, "number,title,body,state", repo);
  if (typeof found === "string") return prepareStop(issue, "issue-unreadable", found);
  if (found.state !== "OPEN") return prepareStop(issue, "issue-not-open", `Issue #${issue} is ${found.state}, not OPEN.`);
  const prefix = (/^\[(\w+)\]/.exec(found.title)?.[1] ?? "").toLowerCase();
  if (!Object.hasOwn(TYPE_BY_PREFIX, prefix)) {
    const accepted = Object.keys(TYPE_BY_PREFIX).map((key) => `[${key[0].toUpperCase()}${key.slice(1)}]`);
    return prepareStop(issue, "issue-untyped", `The title of Issue #${issue} starts with none of ${accepted.join(", ")}.`);
  }
  const words = description ?? descriptionOf(found.title);
  if (words === null) {
    return prepareStop(issue, "no-description", `The title of Issue #${issue} has fewer than 2 English words; pass --description.`);
  }
  const targetStop = prepareProblemStop(issue, publishTargetProblem(repository, repo));
  if (targetStop !== null) return targetStop;
  const branch = `${TYPE_BY_PREFIX[prefix]}/${issue}-${words}`;
  const worktree = join(repo, ".claude", "worktrees", `implement-${issue}`);
  return { repository, remote, baseBranch, branch, worktree, issueDigest: digestOf(found) };
};

const createWorktree = ({ repo, issue }: PrepareCall, { remote, baseBranch, branch, worktree }: Plan): string | Result => {
  const fetched = runShown("git", ["-C", repo, "fetch", remote, baseBranch], repo);
  if (fetched.status !== 0) return prepareStop(issue, "fetch-failed", `git fetch ${remote} ${baseBranch} ${exitOf(fetched)}.`);
  const headConfig = git(["rev-parse", "--verify", "--quiet", "HEAD:.dotagents.json"], repo);
  const baseConfig = git(["rev-parse", "--verify", "--quiet", `refs/remotes/${remote}/${baseBranch}:.dotagents.json`], repo);
  if (headConfig === null || headConfig !== baseConfig) {
    const detail = `.dotagents.json at HEAD of ${repo} is not the file at ${remote}/${baseBranch}. The worktree is created from ${remote}/${baseBranch}, so push or pull until the two are the same.`;
    return prepareStop(issue, "config-differs", detail);
  }
  if (git(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], repo) !== null) {
    return prepareStop(issue, "branch-exists", `The branch ${branch} already exists in ${repo}.`);
  }
  if (existsSync(worktree)) return prepareStop(issue, "worktree-exists", `${worktree} already exists.`);
  const added = runShown("git", ["-C", repo, "worktree", "add", "-b", branch, worktree, `refs/remotes/${remote}/${baseBranch}`], repo);
  const base = added.status === 0 ? git(["rev-parse", "HEAD"], worktree) : null;
  return base ?? prepareStop(issue, "worktree-failed", `git worktree add for ${branch} at ${worktree} ${exitOf(added)}.`);
};

const prepare = (argv: string[]): Result | null => {
  const call = prepareCall(argv);
  if (call === null) return null;
  const plan = planOf(call);
  if ("ok" in plan) return plan;
  const base = createWorktree(call, plan);
  if (typeof base !== "string") return base;
  const { issue, gateMode } = call;
  const { repository, branch, worktree, issueDigest } = plan;
  const kept = `The worktree ${worktree} and the branch ${branch} are left in place.`;
  const setupFailure = runSetup(worktree);
  if (setupFailure !== null) return prepareStop(issue, "setup-failed", `${setupFailure}. ${kept}`);
  const gateOn = runShown(process.execPath, [DONE_GATE, "on", "--mode", gateMode], worktree);
  const gate = gateOn.status === 0 ? gateLocation(worktree) : null;
  if (gate === null) return prepareStop(issue, "gate-failed", `done_gate.ts on --mode ${gateMode} ${exitOf(gateOn)}. ${kept}`);
  const launch: Launch = { issue, repository, branch, base, issue_digest: issueDigest };
  writeFileSync(join(gate.dir, LAUNCH_FILE), `${JSON.stringify(launch, null, 2)}\n`);
  return { action: "prepare", ok: true, issue, branch, worktree, base, gate_mode: gateMode };
};

const launchOf = (value: unknown): Launch | null => {
  const fields = objectOf(value);
  if (!fields) return null;
  const { issue, repository, branch, base, issue_digest } = fields;
  if (!Number.isInteger(issue) || !nonEmpty(repository) || !nonEmpty(branch) || !nonEmpty(base)) return null;
  if (typeof issue_digest !== "string" || !DIGEST.test(issue_digest)) return null;
  return { issue: issue as number, repository, branch, base, issue_digest };
};

interface WorktreeCall {
  worktree: string;
  model: string;
  fresh: boolean;
}

const MODEL_FLAGS = ["--worktree", "--model"];

const worktreeCall = (argv: string[], allowed: readonly string[], switches: readonly string[] = []): WorktreeCall | null => {
  const flags = readFlags(argv, allowed, switches);
  const worktree = flags?.["--worktree"];
  if (!flags || !worktree || !isAbsolute(worktree)) return null;
  return { worktree, model: flags["--model"] ?? "opus", fresh: Object.hasOwn(flags, "--fresh") };
};

interface Prepared {
  gate: GateLocation;
  launchPath: string;
  stored: Record<string, unknown>;
  launch: Launch;
}

const preparedAt = (worktree: string): Prepared | null => {
  const gate = existsSync(worktree) ? gateLocation(worktree) : null;
  const launchPath = gate ? join(gate.dir, LAUNCH_FILE) : "";
  const stored = gate ? objectOf(readJson(launchPath)) : null;
  const launch = launchOf(stored);
  return gate && stored && launch ? { gate, launchPath, stored, launch } : null;
};

const notPrepared = (worktree: string): string => `${worktree} has no launch.json that prepare wrote.`;

type ImplementState = "none" | "unfinished" | "finished";

const implementStateOf = (stored: Record<string, unknown>): ImplementState => {
  const record = objectOf(stored.implement);
  if (!nonEmpty(record?.session_id)) return "none";
  return typeof record?.at === "string" ? "finished" : "unfinished";
};

const finishedSessionOf = (stored: Record<string, unknown>): string | null =>
  implementStateOf(stored) === "finished" ? (objectOf(stored.implement)?.session_id as string) : null;

const notImplemented = (worktree: string, stored: Record<string, unknown>): string =>
  implementStateOf(stored) === "none"
    ? `launch.json of ${worktree} has no implement.session_id.`
    : `The implementing session of ${worktree} has not finished. Call implement or run to resume it.`;

const alreadyImplemented = (worktree: string): string =>
  `The implementing session of ${worktree} has finished. Call implement with --fresh to discard its records and start a new session.`;

const NO_SESSION = "No conversation found with session ID";

const noSessionOf = (outcome: ChildOutcome): boolean => outcome.code !== 0 && outcome.stderr.includes(NO_SESSION);

const tailOf = (outcome: ChildOutcome): string => oneLine(outcome.stderr.split("\n").slice(-3).join(" "));

const failureOf = (outcome: ChildOutcome): string | null => {
  if (outcome.timedOut) return `claude -p was ended at its ${CHILD_TIMEOUT_MS} ms limit. ${tailOf(outcome)}`;
  if (outcome.code !== 0) return `claude -p exited ${outcome.code}. ${tailOf(outcome)}`;
  return null;
};

const replyOf = (outcome: ChildOutcome): Record<string, unknown> | string =>
  failureOf(outcome) ?? parseObject(outcome.stdout) ?? `claude -p printed no JSON object. ${tailOf(outcome)}`;

const turnResultsOf = (stdout: string): Record<string, unknown>[] =>
  stdout
    .split("\n")
    .map(parseObject)
    .filter((line): line is Record<string, unknown> => line?.type === "result");

const everyTurnReplyOf = (outcome: ChildOutcome): Record<string, unknown> | string => {
  const failure = failureOf(outcome);
  if (failure !== null) return failure;
  const turns = turnResultsOf(outcome.stdout);
  if (turns.length === 0) return `claude -p printed no result event. ${tailOf(outcome)}`;
  const said = turns.map((turn) => turn.result).filter(nonEmpty);
  return { ...turns[turns.length - 1], result: said.map((text) => text.trim()).join("\n\n") };
};

const sessionReplyOf = (outcome: ChildOutcome): (Record<string, unknown> & { session_id: string }) | string => {
  const reply = everyTurnReplyOf(outcome);
  if (typeof reply === "string") return reply;
  if (typeof reply.session_id !== "string") return "the JSON claude -p printed has no session_id string.";
  return reply as Record<string, unknown> & { session_id: string };
};

const shownOf = (reply: Record<string, unknown>) => ({
  result: reply.result,
  cost_usd: reply.total_cost_usd,
  duration_ms: reply.duration_ms,
});

interface ImplementChild {
  outcome: ChildOutcome;
  resumed: boolean;
  issueDigest: unknown;
  base: Record<string, unknown>;
}

let holding: Holding | null = null;

const runChild = async (run: ChildRun): Promise<ChildOutcome> => {
  const outcome = await runClaudeOnce({ ...run, onStart: (pid) => holding?.started(pid) });
  holding?.ended();
  return outcome;
};

const implement = async ({ worktree, model, fresh }: WorktreeCall): Promise<Result> => {
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("implement", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const state = implementStateOf(stored);
  if (state === "finished" && !fresh) return stop("already-implemented", alreadyImplemented(worktree));
  const changed = issueChange(launch, worktree);
  if (changed !== null) return stop(changed.reason, changed.detail);

  const common = { model, effort: undefined, schema: undefined, cwd: worktree, timeoutMs: CHILD_TIMEOUT_MS, everyTurn: true };
  const startNew = async (): Promise<ImplementChild> => {
    const sessionId = randomUUID();
    const kept = Object.hasOwn(stored, "publications") ? { publications: stored.publications } : {};
    const implementRecord = { session_id: sessionId, issue_digest: launch.issue_digest, started_at: new Date().toISOString() };
    const base = { ...launch, ...kept, implement: implementRecord };
    writeFileSync(launchPath, `${JSON.stringify(base, null, 2)}\n`);
    const outcome = await runChild({ ...common, prompt: promptFor(launch.issue, launch.repository, DONE_GATE), sessionId });
    return { outcome, resumed: false, issueDigest: launch.issue_digest, base };
  };
  const resume = async (): Promise<ImplementChild> => {
    const earlier = objectOf(stored.implement) ?? {};
    const outcome = await runChild({
      ...common,
      prompt: resumePrompt(launch.issue, launch.repository, launch.base, DONE_GATE),
      resume: earlier.session_id as string,
    });
    return noSessionOf(outcome) ? startNew() : { outcome, resumed: true, issueDigest: earlier.issue_digest, base: stored };
  };
  const child = state === "unfinished" && !fresh ? await resume() : await startNew();
  const reply = sessionReplyOf(child.outcome);
  if (typeof reply === "string") return stop("child-failed", reply);

  const status = runQuiet(process.execPath, [DONE_GATE, "status"], worktree);
  const tree = treeHash(gate.root);
  const finished = {
    session_id: reply.session_id,
    tree,
    issue_digest: child.issueDigest,
    reply: typeof reply.result === "string" ? reply.result : "",
    at: new Date().toISOString(),
  };
  writeFileSync(launchPath, `${JSON.stringify({ ...child.base, implement: finished }, null, 2)}\n`);
  const shown = { session_id: reply.session_id, tree, ...shownOf(reply), ...(child.resumed ? { resumed: true } : {}) };
  if (status.status !== 0) return stop("not-done", `done_gate.ts status is not done: ${outputOf(status)}`, shown);
  return { action: "implement", ok: true, ...shown };
};

type Side = "self" | "independent";
type Verdict = "accepted" | "rejected";

const SIDES: readonly Side[] = ["self", "independent"];

interface Review {
  verdict: Verdict;
  findings: Record<string, unknown>[];
  previous: Record<string, unknown>[];
  verified: unknown;
  session_id: unknown;
  cost_usd: unknown;
  duration_ms: unknown;
  assessments?: unknown;
  documents?: unknown;
  handoff?: unknown;
}

type Published = Pick<Review, "assessments" | "documents" | "handoff">;

type PublishedCheck = (output: Record<string, unknown>) => Published | null;

const verdictOf = (rejected: boolean): Verdict => (rejected ? "rejected" : "accepted");

const previousOf = (value: unknown, keys: readonly string[]): Record<string, unknown>[] | null => {
  if (!Array.isArray(value)) return null;
  const judged = value.map(objectOf);
  const named = judged.map((judgment) => judgment?.key);
  const shaped = judged.every((judgment) => typeof judgment?.key === "string" && STATES.includes(judgment.state));
  const sameKeys = named.length === keys.length && new Set(named).size === named.length && keys.every((key) => named.includes(key));
  return shaped && sameKeys ? (judged as Record<string, unknown>[]) : null;
};

const assessedOf = (value: unknown): boolean => {
  const assessments = objectOf(value);
  return assessments !== null && ASSESSED.every((name) => nonEmpty(assessments[name]));
};

const regularFileIn = (root: string, tree: string | null, path: string): boolean => {
  if (tree === null) return false;
  const listed = git(["ls-tree", "-z", tree, "--", path], root);
  const entries = (listed ?? "").split("\0").filter((entry) => entry !== "");
  if (entries.length !== 1) return false;
  const [entry] = entries;
  const mode = entry.slice(0, entry.indexOf(" "));
  return (mode === "100644" || mode === "100755") && entry.slice(entry.indexOf("\t") + 1) === path;
};

const documentsOf = (value: unknown, holds: (path: string) => boolean): boolean => {
  if (!Array.isArray(value)) return false;
  const documents = value.map(objectOf);
  const paths = documents.map((document) => document?.path);
  const shaped = documents.every(
    (document) =>
      typeof document?.path === "string" && ROLES.includes(document.role) && nonEmpty(document.reason) && holds(document.path),
  );
  return shaped && new Set(paths).size === paths.length;
};

const handoffOf = (value: unknown): boolean => Array.isArray(value) && value.every(nonEmpty);

const publishedFieldsOf = (
  { assessments, documents, handoff }: Record<string, unknown>,
  holds: (path: string) => boolean,
): Published | null =>
  assessedOf(assessments) && documentsOf(documents, holds) && handoffOf(handoff) ? { assessments, documents, handoff } : null;

const publishedCheck =
  (root: string, tree: string | null): PublishedCheck =>
  (output) =>
    publishedFieldsOf(output, (path) => regularFileIn(root, tree, path));

const reviewOf = (reply: Record<string, unknown>, keys: readonly string[] | null, published: PublishedCheck | null): Review | null => {
  const output = objectOf(reply.structured_output);
  const findings = output?.findings;
  if (!output || !Array.isArray(findings)) return null;
  const shaped = findings.map(objectOf);
  if (!shaped.every((finding) => typeof finding?.required === "boolean")) return null;
  const previous = keys === null ? [] : previousOf(output.previous, keys);
  if (previous === null) return null;
  const publishedFields = published === null ? {} : published(output);
  if (publishedFields === null) return null;
  return {
    verdict: verdictOf(findings.some((finding) => finding.required === true) || previous.some((judgment) => judgment.state === "open")),
    findings,
    previous,
    verified: output.verified,
    session_id: reply.session_id,
    cost_usd: reply.total_cost_usd,
    duration_ms: reply.duration_ms,
    ...publishedFields,
  };
};

const unshapedOf = (keys: readonly string[] | null, published: PublishedCheck | null): string => {
  const shape =
    keys === null
      ? "its structured_output is not an object whose findings array has a boolean required in every element"
      : "its structured_output is not an object whose findings array has a boolean required in every element and whose previous array judges each earlier key exactly once as fixed, open, or withdrawn";
  return published === null ? shape : `${shape} and whose assessments, documents, and handoff are as the prompt asks`;
};

const runReview = async (run: ChildRun, keys: readonly string[] | null, published: PublishedCheck | null): Promise<Review | string> => {
  const unshaped = unshapedOf(keys, published);
  const first = replyOf(await runChild(run));
  if (typeof first === "string") return first;
  const review = reviewOf(first, keys, published);
  if (review !== null) return review;
  if (!nonEmpty(first.session_id)) return `${unshaped}, and the JSON has no session_id to ask again in.`;
  const again = replyOf(await runChild({ ...run, prompt: GIVE_REPLY, resume: first.session_id, fork: undefined }));
  if (typeof again === "string") return `${unshaped}; asked once more, ${again}`;
  return reviewOf(again, keys, published) ?? `${unshaped}, also after asking once more.`;
};

const recordOf = ({ session_id, verdict, findings, previous, verified, assessments, documents, handoff }: Review) => ({
  session_id,
  verdict,
  findings,
  previous,
  verified,
  assessments,
  documents,
  handoff,
});

const earlierRequired = (records: unknown[]): Record<string, unknown>[] | null => {
  const required = objectOf(records[records.length - 1])?.required;
  return Array.isArray(required) && required.length > 0 ? required.map((entry) => objectOf(entry) ?? {}) : null;
};

const earlierLine = ({ key, side, location, condition, problem, action }: Record<string, unknown>): string =>
  JSON.stringify({ key, side, location, condition, problem, action });

const repairAnswering = (stored: Record<string, unknown>, reviewRound: unknown): Record<string, unknown> | null => {
  const repairs = Array.isArray(stored.repairs) ? stored.repairs : [];
  const last = objectOf(repairs[repairs.length - 1]);
  return last !== null && last.review_round === reviewRound ? last : null;
};

const repairReplyTo = (stored: Record<string, unknown>, reviewRound: unknown): string | null => {
  const reply = repairAnswering(stored, reviewRound)?.reply;
  return typeof reply === "string" && reply !== "" ? reply : null;
};

const requiredAfter = (round: number, earlier: Record<string, unknown>[], reviews: Record<Side, Review>) => {
  const carried = earlier.flatMap(({ key, side, location, condition, problem, action }) => {
    const reopened = SIDES.flatMap((judge) =>
      reviews[judge].previous
        .filter((judgment) => judgment.key === key && judgment.state === "open")
        .map((judgment) => ({ side: judge, reason: judgment.reason })),
    );
    return reopened.length > 0 ? [{ key, side, location, condition, problem, action, reopened }] : [];
  });
  const reported = SIDES.flatMap((side) =>
    reviews[side].findings
      .filter((finding) => finding.required === true)
      .map(({ location, condition, problem, action }, index) => ({
        key: `${round}-${side}-${index + 1}`,
        side,
        location,
        condition,
        problem,
        action,
        reopened: [],
      })),
  );
  return [...carried, ...reported];
};

const changeDuringReviews = (tree: string | null, after: string | null, launch: Launch, worktree: string): { reason: string; detail: string } | null =>
  after === tree
    ? issueChange(launch, worktree)
    : { reason: "tree-changed", detail: `The working tree was ${tree} before the reviews and ${after} after them.` };

const review = async ({ worktree, model }: WorktreeCall): Promise<Result> => {
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("review", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = finishedSessionOf(stored);
  if (implemented === null) return stop("not-implemented", notImplemented(worktree, stored));
  const status = runQuiet(process.execPath, [DONE_GATE, "status"], worktree);
  if (status.status !== 0) return stop("not-done", `done_gate.ts status is not done: ${outputOf(status)}`);
  const changedBefore = issueChange(launch, worktree);
  if (changedBefore !== null) return stop(changedBefore.reason, changedBefore.detail);

  const earlier = Array.isArray(stored.reviews) ? stored.reviews : [];
  const round = earlier.length + 1;
  const judged = earlierRequired(earlier) ?? [];
  const keys = judged.length > 0 ? judged.map((entry) => String(entry.key)) : null;
  const reply = keys === null ? null : repairReplyTo(stored, objectOf(earlier[earlier.length - 1])?.round);
  const judging = keys === null ? [] : [earlierParagraph(judged.map(earlierLine).join("\n"))];
  const closing = keys === null ? [] : [JUDGE_EARLIER];

  const tree = treeHash(gate.root);
  const common = { model, effort: undefined, cwd: worktree, timeoutMs: CHILD_TIMEOUT_MS, tools: REVIEW_TOOLS };
  const selfSchema = keys === null ? REVIEW_SCHEMA : JUDGING_SCHEMA;
  const independentSchema = keys === null ? INDEPENDENT_REVIEW_SCHEMA : INDEPENDENT_JUDGING_SCHEMA;
  const selfPrompt = reviewPrompt(selfOpening(launch.issue, launch.base), [...judging, ...closing], []);
  const independentJudging = [...judging, ...(reply === null ? [] : [replyParagraph(reply)]), ...closing];
  const independentOpened = independentOpening(launch.issue, launch.repository, launch.base);
  const independentPrompt = reviewPrompt(independentOpened, independentJudging, [PUBLISHED_FIELDS]);
  const [self, independent] = await Promise.all([
    runReview({ ...common, schema: selfSchema, prompt: selfPrompt, resume: implemented, fork: true }, keys, null),
    runReview({ ...common, schema: independentSchema, prompt: independentPrompt }, keys, publishedCheck(gate.root, tree)),
  ]);
  const results: Record<Side, Review | string> = { self, independent };
  const readable = Object.fromEntries(Object.entries(results).filter(([, result]) => typeof result !== "string"));
  const failures = Object.entries(results).filter((entry): entry is [Side, string] => typeof entry[1] === "string");
  if (failures.length > 0) {
    const detail = failures.map(([side, why]) => `The ${side} review gave no readable result: ${why}`).join(" ");
    return stop("review-failed", detail, { reviews: readable });
  }
  const reviews = readable as Record<Side, Review>;
  const changedAfter = changeDuringReviews(tree, treeHash(gate.root), launch, worktree);
  if (changedAfter !== null) return stop(changedAfter.reason, changedAfter.detail, { reviews });

  const required = requiredAfter(round, judged, reviews);
  const verdict = verdictOf(required.length > 0);
  const record = {
    round,
    tree,
    issue_digest: launch.issue_digest,
    at: new Date().toISOString(),
    verdict,
    required,
    self: recordOf(reviews.self),
    independent: recordOf(reviews.independent),
  };
  writeFileSync(launchPath, `${JSON.stringify({ ...stored, reviews: [...earlier, record] }, null, 2)}\n`);
  return { action: "review", ok: true, round, tree, verdict, required, reviews };
};

const repairLine = (entry: unknown): string => {
  const { key, side, location, condition, problem, action, reopened } = objectOf(entry) ?? {};
  return JSON.stringify({ key, side, location, condition, problem, action, reopened });
};

const repair = async ({ worktree, model }: WorktreeCall): Promise<Result> => {
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("repair", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = finishedSessionOf(stored);
  if (implemented === null) return stop("not-implemented", notImplemented(worktree, stored));
  const reviews = stored.reviews;
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return stop("not-reviewed", `launch.json of ${worktree} has no review record.`);
  }
  const last = objectOf(reviews[reviews.length - 1]) ?? {};
  const required = last.required;
  if (!Array.isArray(required)) {
    return stop("not-reviewed", `The last review record of ${worktree} has no required array.`);
  }
  if (required.length === 0) {
    return stop("nothing-to-repair", `The last review of ${worktree} left no required finding.`);
  }
  const before = treeHash(gate.root);
  if (before !== last.tree) {
    return stop("review-stale", `The last review saw the working tree ${String(last.tree)}, and it is ${before} now.`);
  }
  if (last.issue_digest !== launch.issue_digest) {
    return stop("review-stale", `The last review judged a version of Issue #${launch.issue} other than the agreed one.`);
  }
  const changed = issueChange(launch, worktree);
  if (changed !== null) return stop(changed.reason, changed.detail);

  const reply = sessionReplyOf(
    await runChild({
      prompt: repairPrompt(launch.issue, launch.base, required.map(repairLine).join("\n"), DONE_GATE),
      model,
      effort: undefined,
      schema: undefined,
      cwd: worktree,
      timeoutMs: CHILD_TIMEOUT_MS,
      resume: implemented,
      everyTurn: true,
    }),
  );
  if (typeof reply === "string") return stop("child-failed", reply);

  const tree = treeHash(gate.root);
  const earlier = Array.isArray(stored.repairs) ? stored.repairs : [];
  const record = {
    round: earlier.length + 1,
    review_round: last.round,
    session_id: reply.session_id,
    tree,
    changed: tree !== before,
  };
  writeFileSync(
    launchPath,
    `${JSON.stringify({ ...stored, repairs: [...earlier, { ...record, reply: typeof reply.result === "string" ? reply.result : "", at: new Date().toISOString() }] }, null, 2)}\n`,
  );
  const shown = { ...record, ...shownOf(reply) };
  const status = runQuiet(process.execPath, [DONE_GATE, "status"], worktree);
  if (status.status !== 0) return stop("not-done", `done_gate.ts status is not done: ${outputOf(status)}`, shown);
  return { action: "repair", ok: true, ...shown };
};

const agree = ({ worktree }: WorktreeCall): Result => {
  const stop = (reason: string, detail: string) => stopped("agree", reason, detail);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { launchPath, stored, launch } = prepared;
  const found = viewIssue(launch.issue, launch.repository, "title,body,state", worktree);
  if (typeof found === "string") return stop("issue-unreadable", found);
  if (typeof found.body !== "string") {
    return stop("issue-unreadable", `gh returned no body string for Issue #${launch.issue} of ${launch.repository}.`);
  }
  if (found.state !== "OPEN") return stop("issue-not-open", `Issue #${launch.issue} is ${found.state}, not OPEN.`);
  const digest = digestOf(found);
  const changed = digest !== launch.issue_digest;
  if (changed) writeFileSync(launchPath, `${JSON.stringify({ ...stored, issue_digest: digest }, null, 2)}\n`);
  return { action: "agree", ok: true, issue: launch.issue, issue_digest: digest, changed, title: found.title, body: found.body };
};

const readDigestOf = (stored: Record<string, unknown>): unknown => {
  const rereads = Array.isArray(stored.rereads) ? stored.rereads : [];
  return rereads.length > 0 ? objectOf(rereads[rereads.length - 1])?.issue_digest : objectOf(stored.implement)?.issue_digest;
};

const reread = async ({ worktree, model }: WorktreeCall): Promise<Result> => {
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("reread", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = finishedSessionOf(stored);
  if (implemented === null) return stop("not-implemented", notImplemented(worktree, stored));
  if (readDigestOf(stored) === launch.issue_digest) {
    return stop("nothing-to-reread", `The implementing session of ${worktree} has already read the agreed version of Issue #${launch.issue}.`);
  }
  const issueChanged = issueChange(launch, worktree);
  if (issueChanged !== null) return stop(issueChanged.reason, issueChanged.detail);

  const before = treeHash(gate.root);
  const reply = sessionReplyOf(
    await runChild({
      prompt: rereadPrompt(launch.issue, launch.repository, launch.base, DONE_GATE),
      model,
      effort: undefined,
      schema: undefined,
      cwd: worktree,
      timeoutMs: CHILD_TIMEOUT_MS,
      resume: implemented,
      everyTurn: true,
    }),
  );
  if (typeof reply === "string") return stop("child-failed", reply);

  const status = runQuiet(process.execPath, [DONE_GATE, "status"], worktree);
  const tree = treeHash(gate.root);
  const earlier = Array.isArray(stored.rereads) ? stored.rereads : [];
  const record = {
    round: earlier.length + 1,
    session_id: reply.session_id,
    tree,
    changed: tree !== before,
    issue_digest: launch.issue_digest,
  };
  const shown = { ...record, ...shownOf(reply) };
  if (status.status !== 0) return stop("not-done", `done_gate.ts status is not done: ${outputOf(status)}`, shown);
  writeFileSync(
    launchPath,
    `${JSON.stringify({ ...stored, rereads: [...earlier, { ...record, reply: typeof reply.result === "string" ? reply.result : "", at: new Date().toISOString() }] }, null, 2)}\n`,
  );
  return { action: "reread", ok: true, ...shown };
};

const gateStatusOf = (worktree: string): SpawnSyncReturns<string> => runQuiet(process.execPath, [DONE_GATE, "status"], worktree);

const continueWork = async ({ worktree, model }: WorktreeCall): Promise<Result> => {
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("continue", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = finishedSessionOf(stored);
  if (implemented === null) return stop("not-implemented", notImplemented(worktree, stored));
  const gateBefore = gateStatusOf(worktree);
  if (gateBefore.status === 0) {
    return stop("nothing-to-continue", `done_gate.ts status of ${worktree} is already done, so no work is left to finish.`);
  }
  if (gateBefore.status !== 1) {
    const exit = gateBefore.status ?? gateBefore.signal;
    return stop("gate-unreadable", `done_gate.ts status exited ${exit}, which resuming the implementing session cannot fix: ${outputOf(gateBefore)}`);
  }
  const issueChanged = issueChange(launch, worktree);
  if (issueChanged !== null) return stop(issueChanged.reason, issueChanged.detail);

  const before = treeHash(gate.root);
  const reply = sessionReplyOf(
    await runChild({
      prompt: continuePrompt(launch.issue, launch.repository, launch.base, DONE_GATE),
      model,
      effort: undefined,
      schema: undefined,
      cwd: worktree,
      timeoutMs: CHILD_TIMEOUT_MS,
      resume: implemented,
      everyTurn: true,
    }),
  );
  if (typeof reply === "string") return stop("child-failed", reply);

  const status = gateStatusOf(worktree);
  const tree = treeHash(gate.root);
  const earlier = Array.isArray(stored.continues) ? stored.continues : [];
  const record = { round: earlier.length + 1, session_id: reply.session_id, tree, changed: tree !== before };
  const done = status.status === 0;
  writeFileSync(
    launchPath,
    `${JSON.stringify({ ...stored, continues: [...earlier, { ...record, done, reply: typeof reply.result === "string" ? reply.result : "", at: new Date().toISOString() }] }, null, 2)}\n`,
  );
  const shown = { ...record, ...shownOf(reply) };
  if (!done) return stop("not-done", `done_gate.ts status is not done: ${outputOf(status)}`, shown);
  return { action: "continue", ok: true, ...shown };
};

type StepAction = "implement" | "reread" | "review" | "repair" | "continue";
type Next = { kind: "call"; action: StepAction } | { kind: "done" } | { kind: "stop"; reason: string; detail: string };

const STEP_ACTIONS: Record<StepAction, (call: WorktreeCall) => Promise<Result>> = {
  implement,
  reread,
  review,
  repair,
  continue: continueWork,
};

const STEP_FIELDS: Record<StepAction, readonly string[]> = {
  implement: ["action", "ok", "cost_usd", "duration_ms", "resumed", "reason"],
  reread: ["action", "ok", "round", "changed", "cost_usd", "duration_ms", "reason"],
  review: ["action", "ok", "round", "verdict", "required_keys", "cost_usd", "reason"],
  repair: ["action", "ok", "round", "changed", "cost_usd", "duration_ms", "reason"],
  continue: ["action", "ok", "round", "changed", "cost_usd", "duration_ms", "reason"],
};

const amountOf = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const currentReviewOf = (stored: Record<string, unknown>): (Record<string, unknown> & { required: unknown[] }) | null => {
  const reviews = Array.isArray(stored.reviews) ? stored.reviews : [];
  const last = objectOf(reviews[reviews.length - 1]);
  return last !== null && Array.isArray(last.required) ? (last as Record<string, unknown> & { required: unknown[] }) : null;
};

const requiredKeysOf = (record: unknown): unknown[] => {
  const required = objectOf(record)?.required;
  return Array.isArray(required) ? required.map((entry) => objectOf(entry)?.key) : [];
};

const reopenedAgain = (entry: unknown): boolean => {
  const reopened = objectOf(entry)?.reopened;
  return Array.isArray(reopened) && reopened.length > 0;
};

const convergenceStop = (stored: Record<string, unknown>, current: { required: unknown[] }): Next | null => {
  const reviews = stored.reviews as unknown[];
  const before = objectOf(reviews[reviews.length - 2]);
  const unchanged = before !== null && repairAnswering(stored, before.round)?.changed === false;
  if (unchanged && current.required.some(reopenedAgain)) {
    const kept = current.required.filter(reopenedAgain).map((entry) => String(objectOf(entry)?.key));
    const detail = `The repair after review round ${String(before.round)} changed nothing, and the next review kept ${kept.join(", ")} open.`;
    return { kind: "stop", reason: "disagreement", detail };
  }
  if (reviews.length < 3) return null;
  const [first, second, third] = reviews.slice(-3).map(requiredKeysOf);
  const stuck = third.filter((key) => typeof key === "string" && first.includes(key) && second.includes(key));
  if (stuck.length === 0) return null;
  const detail = `${stuck.join(", ")} stayed required in each of the last 3 review rounds.`;
  return { kind: "stop", reason: "not-converging", detail };
};

const reviewOrContinue = (worktree: string, { gate, stored }: Prepared): Next => {
  if (gateStatusOf(worktree).status === 0) return { kind: "call", action: "review" };
  const continues = Array.isArray(stored.continues) ? stored.continues : [];
  const last = objectOf(continues[continues.length - 1]);
  if (last !== null && last.done === false && last.tree === treeHash(gate.root)) {
    const detail = `continue round ${String(last.round)} ended without passing the check, and the working tree has not changed since. Call continue directly to try again.`;
    return { kind: "stop", reason: "not-done", detail };
  }
  return { kind: "call", action: "continue" };
};

const nextOf = (worktree: string): Next => {
  const prepared = preparedAt(worktree);
  if (prepared === null) return { kind: "stop", reason: "not-prepared", detail: notPrepared(worktree) };
  const { gate, stored, launch } = prepared;
  if (implementStateOf(stored) !== "finished") return { kind: "call", action: "implement" };
  if (readDigestOf(stored) !== launch.issue_digest) return { kind: "call", action: "reread" };
  const toReview = () => reviewOrContinue(worktree, prepared);
  const current = currentReviewOf(stored);
  if (current === null) return toReview();
  if (repairAnswering(stored, current.round) !== null) return toReview();
  if (treeHash(gate.root) !== current.tree) return toReview();
  if (current.issue_digest !== launch.issue_digest) return toReview();
  if (current.required.length === 0) {
    const changed = issueChange(launch, worktree);
    return changed === null ? { kind: "done" } : { kind: "stop", ...changed };
  }
  return convergenceStop(stored, current) ?? { kind: "call", action: "repair" };
};

const stepOf = (action: StepAction, result: Result): Record<string, unknown> => {
  const reviews = objectOf(result.reviews);
  const fields: Record<string, unknown> =
    action === "review"
      ? {
          ...result,
          required_keys: Array.isArray(result.required) ? requiredKeysOf(result) : undefined,
          cost_usd: reviews === null ? undefined : SIDES.reduce((sum, side) => sum + amountOf(objectOf(reviews[side])?.cost_usd), 0),
        }
      : result;
  return Object.fromEntries(STEP_FIELDS[action].filter((name) => fields[name] !== undefined).map((name) => [name, fields[name]]));
};

const launchFileOf = (worktree: string): string | null => {
  const gate = existsSync(worktree) ? gateLocation(worktree) : null;
  return gate === null ? null : join(gate.dir, LAUNCH_FILE);
};

const runFields = (worktree: string, steps: Record<string, unknown>[], cost: number): Record<string, unknown> => {
  const stored = preparedAt(worktree)?.stored ?? {};
  const current = currentReviewOf(stored);
  return {
    verdict: current?.verdict ?? null,
    required: current?.required ?? [],
    rounds: Array.isArray(stored.reviews) ? stored.reviews.length : 0,
    steps,
    cost_usd: cost,
    launch_file: launchFileOf(worktree),
  };
};

const runOutput = (worktree: string, steps: Record<string, unknown>[], cost: number, stop: Next | null): Result => {
  const fields = runFields(worktree, steps, cost);
  return stop?.kind === "stop" ? stopped("run", stop.reason, stop.detail, fields) : { action: "run", ok: true, ...fields };
};

const runRounds = async ({ worktree, model }: WorktreeCall): Promise<Result> => {
  const childCall = { worktree, model, fresh: false };
  const steps: Record<string, unknown>[] = [];
  let cost = 0;
  let previous: StepAction | null = null;
  for (;;) {
    const next = nextOf(worktree);
    if (next.kind !== "call") return runOutput(worktree, steps, cost, next);
    if (next.action === previous) {
      const detail = `${previous} succeeded without advancing launch.json, and the next step would call ${previous} again.`;
      return runOutput(worktree, steps, cost, { kind: "stop", reason: "no-progress", detail });
    }
    previous = next.action;
    const result = await STEP_ACTIONS[next.action](childCall);
    const step = stepOf(next.action, result);
    steps.push(step);
    cost += amountOf(step.cost_usd);
    process.stderr.write(`${JSON.stringify({ ...step, total_cost_usd: cost })}\n`);
    if (!result.ok) {
      return runOutput(worktree, steps, cost, { kind: "stop", reason: String(result.reason), detail: String(result.detail) });
    }
  }
};

interface Publication {
  commit: string;
  number: number;
  url: string;
  bodyDigest: unknown;
}

type HeadState = "first" | "published" | "stacked";

const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0;

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
  const shown = runQuiet("git", ["show", `${base}:.dotagents.json`], worktree);
  const config = shown.status === 0 ? parseObject(shown.stdout) : null;
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
  if (status.status !== 0) return { reason: "not-done", detail: `done_gate.ts status is not done: ${outputOf(status)}` };
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

const isDigest = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

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
  if (differing.length > 0) {
    const { repository } = facts.prepared.launch;
    const detail = `The pull request ${pull.html_url} differs from the publication launch.json records: ${differing.join(", ")}. Reconcile it on GitHub, then call again. A pull request marked ready is turned back to a draft with \`gh pr ready ${pull.number} --undo --repo ${repository}\`.`;
    return { reason: "pr-mismatch", detail };
  }
  if (!isDigest(last.bodyDigest) || (typeof pull.body === "string" && sha256Of(pull.body) === last.bodyDigest)) return { pull };
  const detail = `The body of the pull request ${pull.html_url} changed after launch.ts recorded it. launch.ts does not overwrite a change someone else made. A human decides how to keep it.`;
  return { reason: "body-changed", detail };
};

const publishableAt = (worktree: string, facts: PublishFacts): { fields: Record<string, unknown> } | Problem => {
  const { launch } = facts.prepared;
  if (facts.last === null) return branchPullProblem(worktree, launch.repository, launch.branch) ?? { fields: {} };
  if (facts.state === "published") {
    const detail = `HEAD of ${worktree} is the commit ${facts.last.commit} that ${facts.last.url} already has, and it holds the reviewed tree. There is nothing to push.`;
    return { reason: "already-published", detail };
  }
  const found = stackedPullOf(worktree, facts, facts.last);
  if ("reason" in found) return found;
  return { fields: { number: found.pull.number, url: found.pull.html_url } };
};

const publishable = ({ worktree }: WorktreeCall): Result => {
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

const publishedPullOf = (worktree: string, facts: PublishFacts): { pull: Record<string, unknown>; text: string } | Problem => {
  const found = selectedPullOf(worktree, facts);
  if ("reason" in found) return found;
  const { pull } = found;
  const { last, state } = facts;
  if (state === "stacked" && last !== null && headShaOf(pull) === last.commit) {
    const { branch } = facts.prepared.launch;
    const detail = `The pull request ${pull.html_url} still has the published commit ${last.commit} as its head. Push the commit ${facts.head} to the branch ${branch} of ${facts.config.remote}, then call again.`;
    return { reason: "not-pushed", detail };
  }
  const text = bodyTextOf(worktree, facts);
  if (typeof text !== "string") return text;
  const differing = [...differingOf(pull, facts, facts.head), ...(pull.body === text ? [] : ["body"])];
  if (differing.length === 0) return { pull, text };
  const detail = `The pull request ${pull.html_url} differs from what launch.ts confirmed before the push: ${differing.join(", ")}. Reconcile it on GitHub, then call again.`;
  return { reason: "pr-mismatch", detail };
};

const published = ({ worktree }: WorktreeCall): Result => {
  const stop = ({ reason, detail }: Problem) => stopped("published", reason, detail);

  const facts = publishFactsOf(worktree);
  if ("reason" in facts) return stop(facts);
  const commit = facts.head;
  const found = publishedPullOf(worktree, facts);
  if ("reason" in found) return stop(found);
  const { pull, text } = found;
  const { launchPath, stored } = facts.prepared;
  const record = {
    number: pull.number,
    url: pull.html_url,
    commit,
    tree: facts.tree,
    base_branch: facts.config.baseBranch,
    actor: facts.actor,
    body_digest: sha256Of(text),
    at: new Date().toISOString(),
  };
  const publications = Array.isArray(stored.publications) ? [...stored.publications, record] : [record];
  writeFileSync(launchPath, `${JSON.stringify({ ...stored, publications }, null, 2)}\n`);
  return {
    action: "published",
    ok: true,
    ...publishFields(facts, commit),
    number: record.number,
    url: record.url,
    body_digest: record.body_digest,
    at: record.at,
    launch_file: launchPath,
  };
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
  const shown = runQuiet("git", ["show", `${base}:.dotagents.json`], worktree);
  const config = shown.status === 0 ? parseObject(shown.stdout) : null;
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
  const reviews = (Array.isArray(stored.reviews) ? stored.reviews : []).map((entry) => objectOf(entry) ?? {});
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
}

const documentLink = (repository: string, commit: string, path: string): string =>
  `https://github.com/${repository}/blob/${commit}/${path.split("/").map(encodeURIComponent).join("/")}`;

const bodyOf = ({ issue, repository, commit, config, fields, findingLines, publicText }: BodyInput): string =>
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
    "## Remaining work and owners",
    "When this body was written, the draft publication, CI, the body check, the switch to ready, and human approval were not complete.",
    `- Assigned AI: publish this PR as a draft and confirm that CI on the same head (${config.ciChecks.join(", ")}) registers and succeeds.`,
    ...fields.handoff.map((step) => `- ${publicText(step)}`),
    "- Assigned AI: compare the latest public body with the Issue, the target commit, the accepted review, and the verification results (published_body_check). After confirming the body and CI on the same head, recheck, switch to ready, and read it back (mark_ready). Keep the draft while anything is unconfirmed.",
    "- Human: decide any change to requirements or permissions, and decide review, approval, and merge.",
  ].join("\n\n")}\n`;

const bodyTextOf = (worktree: string, facts: PublishFacts): string | Problem => {
  const { stored, launch } = facts.prepared;
  const config = bodyConfigOf(worktree, launch.base);
  if ("reason" in config) return config;
  const fields = bodyFieldsOf(worktree, stored);
  if ("reason" in fields) return fields;
  const publicText = publicTextOf([worktree, ...repoRootOf(worktree)]);
  const findingLines = [...requiredLines(stored, publicText), ...concernLines(fields.findings, publicText)];
  return bodyOf({ issue: launch.issue, repository: launch.repository, commit: String(facts.head), config, fields, findingLines, publicText });
};

const body = ({ worktree }: WorktreeCall): Result => {
  const stop = ({ reason, detail }: Problem) => stopped("body", reason, detail);

  const facts = publishFactsOf(worktree);
  if ("reason" in facts) return stop(facts);
  const { gate, launchPath, launch } = facts.prepared;
  const text = bodyTextOf(worktree, facts);
  if (typeof text !== "string") return stop(text);
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
    launch_file: launchPath,
  };
};

interface HeldAction {
  parse: (argv: string[]) => WorktreeCall | null;
  act: (call: WorktreeCall) => Result | Promise<Result>;
}

const HELD_ACTIONS: Record<string, HeldAction> = {
  implement: { parse: (argv) => worktreeCall(argv, MODEL_FLAGS, ["--fresh"]), act: implement },
  review: { parse: (argv) => worktreeCall(argv, MODEL_FLAGS), act: review },
  repair: { parse: (argv) => worktreeCall(argv, MODEL_FLAGS), act: repair },
  agree: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: agree },
  reread: { parse: (argv) => worktreeCall(argv, MODEL_FLAGS), act: reread },
  continue: { parse: (argv) => worktreeCall(argv, MODEL_FLAGS), act: continueWork },
  run: { parse: (argv) => worktreeCall(argv, MODEL_FLAGS), act: runRounds },
  publishable: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: publishable },
  published: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: published },
  body: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: body },
};

const gateDirOf = (worktree: string): string | null => {
  const gate = existsSync(worktree) ? gateLocation(worktree) : null;
  return gate !== null && statSync(gate.dir, { throwIfNoEntry: false })?.isDirectory() ? gate.dir : null;
};

const holderStopped = (action: string, worktree: string, { reason, detail, holder }: HolderStop): Result => {
  const extra = action === "run" ? runFields(worktree, [], 0) : {};
  return stopped(action, reason, detail, holder === undefined ? extra : { ...extra, holder });
};

const actOn = async (action: string, argv: string[]): Promise<Result | null> => {
  if (action === "prepare") return prepare(argv);
  if (!Object.hasOwn(HELD_ACTIONS, action)) return null;
  const { parse, act } = HELD_ACTIONS[action];
  const call = parse(argv);
  if (call === null) return null;
  const gateDir = gateDirOf(call.worktree);
  if (gateDir === null) return act(call);
  const held = hold(gateDir, action, call.worktree);
  if ("reason" in held) return holderStopped(action, call.worktree, held);
  holding = held;
  const result = await act(call);
  held.release();
  return result;
};

const ENDS_CLAUDE_ON_SIGNAL = new Set(["implement", "reread", "review", "repair", "continue", "run"]);

const endClaudeAndExit = () => {
  endAll();
  process.exit(143);
};

export async function launch(argv: string[]): Promise<number> {
  const [action, ...rest] = argv;
  if (ENDS_CLAUDE_ON_SIGNAL.has(action ?? "")) {
    for (const name of ["SIGTERM", "SIGINT", "SIGHUP"] as const) process.on(name, endClaudeAndExit);
  }
  const result = await actOn(action ?? "", rest);
  if (result === null) {
    process.stderr.write(USAGE);
    return 2;
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.ok ? 0 : 1;
}

if (isMainModule(import.meta.url)) process.exitCode = await launch(process.argv.slice(2));
