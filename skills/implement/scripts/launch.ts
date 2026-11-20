#!/usr/bin/env node
/// <reference types="node" />
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type GateLocation, gateLocation, git, readJson, treeHash } from "../../../hooks/_lib/gate_record.ts";
import { type ChildOutcome, type ChildRun, endAll, GIVE_REPLY, runClaudeOnce } from "../../../workflows/_lib/claude-run.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

export const TYPE_BY_PREFIX: Record<string, string> = { bug: "fix", feature: "feat", docs: "docs", chore: "chore" };

const DONE_GATE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "hooks", "lifecycle", "done_gate.ts");
const LAUNCH_FILE = "launch.json";
const CHILD_TIMEOUT_MS = 3_600_000;
const DESCRIPTION = /^[a-z0-9]+(-[a-z0-9]+){1,3}$/;
const DIGEST = /^[0-9a-f]{64}$/;

const USAGE =
  "usage: launch.ts prepare --repo <abs path> --issue <number> [--description <words>] [--gate-mode record|enforce]\n" +
  "       launch.ts implement --worktree <abs path> [--model <name>]\n" +
  "       launch.ts review --worktree <abs path> [--model <name>]\n" +
  "       launch.ts repair --worktree <abs path> [--model <name>]\n" +
  "       launch.ts agree --worktree <abs path>\n" +
  "       launch.ts reread --worktree <abs path> [--model <name>]\n" +
  "       launch.ts run --worktree <abs path> [--model <name>]\n";

const promptFor = (issue: number, repository: string, doneGate: string): string =>
  `Implement GitHub Issue #${issue} of ${repository} in this worktree.

1. Read the Issue with \`gh issue view ${issue} --repo ${repository} --json title,body\`. The Issue is the agreed requirement. Do not change its scope, and do not do what it lists as out of scope.
2. Make the change the Issue asks for, following the repository's rules that apply to the files you touch.
3. Run \`${doneGate} check\`. It runs the repository's full check and records the result for the current working tree. Fix what fails and run it again.
4. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: the files you changed, what \`${doneGate} status\` printed, each decision you made that the Issue does not state, and each step the Issue hands over to a named person.
`;

const repairPrompt = (issue: number, findings: string, doneGate: string): string =>
  `The reviews of your uncommitted change for Issue #${issue} reported findings that must be settled before the change is published. Each line below is one finding as a JSON object. \`key\` names the finding, \`side\` is the review that reported it, \`location\` is where it is, \`condition\` is the input or state that triggers it, \`problem\` is what goes wrong, and \`action\` is what the review suggests. \`reopened\` lists the reviews that judged the finding still open after an earlier repair, each with its reason.

${findings}

1. For each finding, read the code it names and reproduce the problem, and judge whether the finding holds. Fix each finding that holds, and add or change a test that fails without the fix. Do not change the scope of the Issue.
2. Run \`${doneGate} check\`. Fix what fails and run it again.
3. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: for each finding, its \`key\` and what you changed, or why you changed nothing; the files you changed; and what \`${doneGate} status\` printed.
`;

const rereadPrompt = (issue: number, repository: string, doneGate: string): string =>
  `GitHub Issue #${issue} of ${repository} changed after you last read it. The Issue as it is now is the agreed requirement.

1. Read the Issue again with \`gh issue view ${issue} --repo ${repository} --json title,body\`, and find what changed from the version you read before.
2. Compare every requirement, done condition, and out-of-scope item of the Issue with your uncommitted change. Change the code, the tests, and the documents that no longer match the Issue. Do not change what the Issue does not ask for.
3. Run \`${doneGate} check\`. Fix what fails and run it again.
4. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: what changed in the Issue; for each change, what you changed or why you changed nothing; the files you changed; and what \`${doneGate} status\` printed.
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

const REVIEW_POINTS = `Assess four separate things:
1. Code: correctness at the input boundaries, state written to disk, behavior when something fails, and concrete redundancy (the same file read or the same judgment computed twice).
2. Requirements and scope: every item the Issue scopes is present and behaves as the Issue's tables say, and nothing the Issue lists as out of scope changed. Check each sentence the Issue says to insert verbatim against the Issue mechanically.
3. Tests: each done condition in the Issue has a test that would fail if the behavior were removed. Run the targeted tests. For at least two tests, break the code in a temporary copy to show the test fails, and say what you broke.
4. Documentation and repository rules that apply to the changed files. Read the repository's instruction files, such as CLAUDE.md and AGENTS.md and the rules they point to, to find them.`;

const REVIEW_CLOSING = `Do not edit any file in this worktree. Do not commit. Scratch files go under the directory in $TMPDIR.

Give the result through the structured output. \`findings\` lists every finding. Set \`required\` to true only for a defect you demonstrated or a requirement of the Issue that is not met, which must be fixed before the change is published. Set it to false for every other concern. \`location\` is \`file:line\`, or an empty string when no line applies. \`condition\` is the input or state that triggers the finding, \`problem\` is what goes wrong, and \`action\` is what to do. \`verified\` says what you checked and how. An empty \`findings\` is a valid result.`;

const selfOpening = (issue: number): string =>
  `Before your uncommitted change for Issue #${issue} is published, review it yourself and try to refute it. Read the change again with \`git diff HEAD\` and \`git status --short\`, each untracked file, and the code the change calls or is called by.`;

const independentOpening = (issue: number, repository: string): string =>
  `Independently review the uncommitted change in this worktree against GitHub Issue #${issue} of ${repository}. You did not write this change, and you have no context from the session that did. New files may be untracked, so read the change with \`git diff HEAD\` and \`git status --short\`, and read each untracked file.

Read the Issue with \`gh issue view ${issue} --repo ${repository} --json title,body\`, the change, and the code the change calls or is called by.`;

const earlierParagraph = (earlier: string): string =>
  `An earlier review round reported the findings below as required, and the change may have been repaired since. Each line is one finding as a JSON object with its \`key\`.

${earlier}`;

const replyParagraph = (reply: string): string =>
  `The implementing session replied to the earlier findings as follows. Treat the reply as a claim to check, not as a fact.

${reply}`;

const JUDGE_EARLIER =
  "Judge each earlier finding against the current change. In `previous`, return exactly one entry for every `key`. `state` is `fixed` when the problem no longer occurs, `open` when it still occurs, and `withdrawn` when you now judge that the finding did not hold. `reason` says what you checked and what you saw. Do not repeat an earlier finding in `findings`. `findings` is for problems the earlier rounds did not report.";

const reviewPrompt = (opening: string, judging: string[]): string =>
  [opening, ...judging, REVIEW_POINTS, REVIEW_CLOSING].join("\n\n");

type Flags = Record<string, string>;
type Result = Record<string, unknown> & { ok: boolean };

interface Launch {
  issue: number;
  repository: string;
  branch: string;
  base: string;
  issue_digest: string;
}

const readFlags = (argv: string[], allowed: readonly string[]): Flags | null => {
  const flags: Flags = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [name, value] = [argv[index], argv[index + 1]];
    if (!allowed.includes(name) || Object.hasOwn(flags, name) || value === undefined || value === "") return null;
    flags[name] = value;
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

const planOf = ({ repo, issue, description }: PrepareCall): Plan | Result => {
  const config = parseObject(runQuiet("git", ["-C", repo, "show", "HEAD:.dotagents.json"], repo).stdout ?? "");
  if (!config || !nonEmpty(config.repository) || !nonEmpty(config.remote) || !nonEmpty(config.baseBranch)) {
    return prepareStop(issue, "no-config", `HEAD of ${repo} has no .dotagents.json with non-empty repository, remote, and baseBranch strings.`);
  }
  const { repository, remote, baseBranch } = config;
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
  const branch = `${TYPE_BY_PREFIX[prefix]}/${issue}-${words}`;
  const worktree = join(repo, ".claude", "worktrees", `implement-${issue}`);
  return { repository, remote, baseBranch, branch, worktree, issueDigest: digestOf(found) };
};

const createWorktree = ({ repo, issue }: PrepareCall, { remote, baseBranch, branch, worktree }: Plan): string | Result => {
  const fetched = runShown("git", ["-C", repo, "fetch", remote, baseBranch], repo);
  if (fetched.status !== 0) return prepareStop(issue, "fetch-failed", `git fetch ${remote} ${baseBranch} ${exitOf(fetched)}.`);
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

const worktreeCall = (argv: string[]): { worktree: string; model: string } | null => {
  const flags = readFlags(argv, ["--worktree", "--model"]);
  const worktree = flags?.["--worktree"];
  if (!flags || !worktree || !isAbsolute(worktree)) return null;
  return { worktree, model: flags["--model"] ?? "opus" };
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

const notImplemented = (worktree: string): string => `launch.json of ${worktree} has no implement.session_id.`;

const replyOf = (outcome: ChildOutcome): Record<string, unknown> | string => {
  const tail = oneLine(outcome.stderr.split("\n").slice(-3).join(" "));
  if (outcome.timedOut) return `claude -p was ended at its ${CHILD_TIMEOUT_MS} ms limit. ${tail}`;
  if (outcome.code !== 0) return `claude -p exited ${outcome.code}. ${tail}`;
  return parseObject(outcome.stdout) ?? `claude -p printed no JSON object. ${tail}`;
};

const sessionReplyOf = (outcome: ChildOutcome): (Record<string, unknown> & { session_id: string }) | string => {
  const reply = replyOf(outcome);
  if (typeof reply === "string") return reply;
  if (typeof reply.session_id !== "string") return "the JSON claude -p printed has no session_id string.";
  return reply as Record<string, unknown> & { session_id: string };
};

const shownOf = (reply: Record<string, unknown>) => ({
  result: reply.result,
  cost_usd: reply.total_cost_usd,
  duration_ms: reply.duration_ms,
});

const implement = async (argv: string[]): Promise<Result | null> => {
  const call = worktreeCall(argv);
  if (call === null) return null;
  const { worktree, model } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("implement", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, launch } = prepared;
  const changed = issueChange(launch, worktree);
  if (changed !== null) return stop(changed.reason, changed.detail);

  const reply = sessionReplyOf(
    await runClaudeOnce({
      prompt: promptFor(launch.issue, launch.repository, DONE_GATE),
      model,
      effort: undefined,
      schema: undefined,
      cwd: worktree,
      timeoutMs: CHILD_TIMEOUT_MS,
    }),
  );
  if (typeof reply === "string") return stop("child-failed", reply);

  const status = runQuiet(process.execPath, [DONE_GATE, "status"], worktree);
  const tree = treeHash(gate.root);
  writeFileSync(
    launchPath,
    `${JSON.stringify({ ...launch, implement: { session_id: reply.session_id, tree, issue_digest: launch.issue_digest, at: new Date().toISOString() } }, null, 2)}\n`,
  );
  const shown = { session_id: reply.session_id, tree, ...shownOf(reply) };
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
}

const verdictOf = (rejected: boolean): Verdict => (rejected ? "rejected" : "accepted");

const previousOf = (value: unknown, keys: readonly string[]): Record<string, unknown>[] | null => {
  if (!Array.isArray(value)) return null;
  const judged = value.map(objectOf);
  const named = judged.map((judgment) => judgment?.key);
  const shaped = judged.every((judgment) => typeof judgment?.key === "string" && STATES.includes(judgment.state));
  const sameKeys = named.length === keys.length && new Set(named).size === named.length && keys.every((key) => named.includes(key));
  return shaped && sameKeys ? (judged as Record<string, unknown>[]) : null;
};

const reviewOf = (reply: Record<string, unknown>, keys: readonly string[] | null): Review | null => {
  const output = objectOf(reply.structured_output);
  const findings = output?.findings;
  if (!output || !Array.isArray(findings)) return null;
  const shaped = findings.map(objectOf);
  if (!shaped.every((finding) => typeof finding?.required === "boolean")) return null;
  const previous = keys === null ? [] : previousOf(output.previous, keys);
  if (previous === null) return null;
  return {
    verdict: verdictOf(findings.some((finding) => finding.required === true) || previous.some((judgment) => judgment.state === "open")),
    findings,
    previous,
    verified: output.verified,
    session_id: reply.session_id,
    cost_usd: reply.total_cost_usd,
    duration_ms: reply.duration_ms,
  };
};

const unshapedOf = (keys: readonly string[] | null): string =>
  keys === null
    ? "its structured_output is not an object whose findings array has a boolean required in every element"
    : "its structured_output is not an object whose findings array has a boolean required in every element and whose previous array judges each earlier key exactly once as fixed, open, or withdrawn";

const runReview = async (run: ChildRun, keys: readonly string[] | null): Promise<Review | string> => {
  const unshaped = unshapedOf(keys);
  const first = replyOf(await runClaudeOnce(run));
  if (typeof first === "string") return first;
  const review = reviewOf(first, keys);
  if (review !== null) return review;
  if (!nonEmpty(first.session_id)) return `${unshaped}, and the JSON has no session_id to ask again in.`;
  const again = replyOf(await runClaudeOnce({ ...run, prompt: GIVE_REPLY, resume: first.session_id, fork: undefined }));
  if (typeof again === "string") return `${unshaped}; asked once more, ${again}`;
  return reviewOf(again, keys) ?? `${unshaped}, also after asking once more.`;
};

const recordOf = ({ session_id, verdict, findings, previous, verified }: Review) => ({
  session_id,
  verdict,
  findings,
  previous,
  verified,
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

const review = async (argv: string[]): Promise<Result | null> => {
  const call = worktreeCall(argv);
  if (call === null) return null;
  const { worktree, model } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("review", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = objectOf(stored.implement)?.session_id;
  if (!nonEmpty(implemented)) return stop("not-implemented", notImplemented(worktree));
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
  const schema = keys === null ? REVIEW_SCHEMA : JUDGING_SCHEMA;
  const common = { model, effort: undefined, schema, cwd: worktree, timeoutMs: CHILD_TIMEOUT_MS, tools: REVIEW_TOOLS };
  const selfPrompt = reviewPrompt(selfOpening(launch.issue), [...judging, ...closing]);
  const independentJudging = [...judging, ...(reply === null ? [] : [replyParagraph(reply)]), ...closing];
  const independentPrompt = reviewPrompt(independentOpening(launch.issue, launch.repository), independentJudging);
  const [self, independent] = await Promise.all([
    runReview({ ...common, prompt: selfPrompt, resume: implemented, fork: true }, keys),
    runReview({ ...common, prompt: independentPrompt }, keys),
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

const repair = async (argv: string[]): Promise<Result | null> => {
  const call = worktreeCall(argv);
  if (call === null) return null;
  const { worktree, model } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("repair", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = objectOf(stored.implement)?.session_id;
  if (!nonEmpty(implemented)) return stop("not-implemented", notImplemented(worktree));
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
    await runClaudeOnce({
      prompt: repairPrompt(launch.issue, required.map(repairLine).join("\n"), DONE_GATE),
      model,
      effort: undefined,
      schema: undefined,
      cwd: worktree,
      timeoutMs: CHILD_TIMEOUT_MS,
      resume: implemented,
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

const agree = (argv: string[]): Result | null => {
  const worktree = readFlags(argv, ["--worktree"])?.["--worktree"];
  if (!worktree || !isAbsolute(worktree)) return null;
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

const reread = async (argv: string[]): Promise<Result | null> => {
  const call = worktreeCall(argv);
  if (call === null) return null;
  const { worktree, model } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("reread", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = objectOf(stored.implement)?.session_id;
  if (!nonEmpty(implemented)) return stop("not-implemented", notImplemented(worktree));
  if (readDigestOf(stored) === launch.issue_digest) {
    return stop("nothing-to-reread", `The implementing session of ${worktree} has already read the agreed version of Issue #${launch.issue}.`);
  }
  const issueChanged = issueChange(launch, worktree);
  if (issueChanged !== null) return stop(issueChanged.reason, issueChanged.detail);

  const before = treeHash(gate.root);
  const reply = sessionReplyOf(
    await runClaudeOnce({
      prompt: rereadPrompt(launch.issue, launch.repository, DONE_GATE),
      model,
      effort: undefined,
      schema: undefined,
      cwd: worktree,
      timeoutMs: CHILD_TIMEOUT_MS,
      resume: implemented,
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

type StepAction = "implement" | "reread" | "review" | "repair";
type Next = { kind: "call"; action: StepAction } | { kind: "done" } | { kind: "stop"; reason: string; detail: string };

const STEP_ACTIONS: Record<StepAction, (argv: string[]) => Promise<Result | null>> = { implement, reread, review, repair };

const STEP_FIELDS: Record<StepAction, readonly string[]> = {
  implement: ["action", "ok", "cost_usd", "duration_ms", "reason"],
  reread: ["action", "ok", "round", "changed", "cost_usd", "duration_ms", "reason"],
  review: ["action", "ok", "round", "verdict", "required_keys", "cost_usd", "reason"],
  repair: ["action", "ok", "round", "changed", "cost_usd", "duration_ms", "reason"],
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

const nextOf = (worktree: string): Next => {
  const prepared = preparedAt(worktree);
  if (prepared === null) return { kind: "stop", reason: "not-prepared", detail: notPrepared(worktree) };
  const { gate, stored, launch } = prepared;
  if (!nonEmpty(objectOf(stored.implement)?.session_id)) return { kind: "call", action: "implement" };
  if (readDigestOf(stored) !== launch.issue_digest) return { kind: "call", action: "reread" };
  const current = currentReviewOf(stored);
  if (current === null) return { kind: "call", action: "review" };
  if (repairAnswering(stored, current.round) !== null) return { kind: "call", action: "review" };
  if (treeHash(gate.root) !== current.tree) return { kind: "call", action: "review" };
  if (current.issue_digest !== launch.issue_digest) return { kind: "call", action: "review" };
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

const runOutput = (worktree: string, steps: Record<string, unknown>[], cost: number, stop: Next | null): Result => {
  const stored = preparedAt(worktree)?.stored ?? {};
  const current = currentReviewOf(stored);
  const fields = {
    verdict: current?.verdict ?? null,
    required: current?.required ?? [],
    rounds: Array.isArray(stored.reviews) ? stored.reviews.length : 0,
    steps,
    cost_usd: cost,
  };
  return stop?.kind === "stop" ? stopped("run", stop.reason, stop.detail, fields) : { action: "run", ok: true, ...fields };
};

const runRounds = async (argv: string[]): Promise<Result | null> => {
  const call = worktreeCall(argv);
  if (call === null) return null;
  const { worktree, model } = call;
  const childArgv = ["--worktree", worktree, "--model", model];
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
    const result = (await STEP_ACTIONS[next.action](childArgv)) as Result;
    const step = stepOf(next.action, result);
    steps.push(step);
    cost += amountOf(step.cost_usd);
    process.stderr.write(`${JSON.stringify({ ...step, total_cost_usd: cost })}\n`);
    if (!result.ok) {
      return runOutput(worktree, steps, cost, { kind: "stop", reason: String(result.reason), detail: String(result.detail) });
    }
  }
};

const ACTIONS: Record<string, (argv: string[]) => Result | null | Promise<Result | null>> = {
  prepare,
  implement,
  review,
  repair,
  agree,
  reread,
  run: runRounds,
};

const ENDS_CLAUDE_ON_SIGNAL = new Set(["implement", "reread", "review", "repair", "run"]);

const endClaudeAndExit = () => {
  endAll();
  process.exit(143);
};

export async function launch(argv: string[]): Promise<number> {
  const [action, ...rest] = argv;
  if (ENDS_CLAUDE_ON_SIGNAL.has(action ?? "")) {
    for (const name of ["SIGTERM", "SIGINT", "SIGHUP"] as const) process.on(name, endClaudeAndExit);
  }
  const result = Object.hasOwn(ACTIONS, action ?? "") ? await ACTIONS[action](rest) : null;
  if (result === null) {
    process.stderr.write(USAGE);
    return 2;
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.ok ? 0 : 1;
}

if (isMainModule(import.meta.url)) process.exitCode = await launch(process.argv.slice(2));
