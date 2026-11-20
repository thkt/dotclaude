#!/usr/bin/env node
/// <reference types="node" />
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type GateLocation, gateLocation, git, readJson, treeHash } from "../../../hooks/_lib/gate_record.ts";
import { type ChildOutcome, type ChildRun, GIVE_REPLY, runClaudeOnce } from "../../../workflows/_lib/claude-run.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

export const TYPE_BY_PREFIX: Record<string, string> = { bug: "fix", feature: "feat", docs: "docs", chore: "chore" };

const DONE_GATE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "hooks", "lifecycle", "done_gate.ts");
const LAUNCH_FILE = "launch.json";
const CHILD_TIMEOUT_MS = 3_600_000;
const DESCRIPTION = /^[a-z0-9]+(-[a-z0-9]+){1,3}$/;

const USAGE =
  "usage: launch.ts prepare --repo <abs path> --issue <number> [--description <words>] [--gate-mode record|enforce]\n" +
  "       launch.ts implement --worktree <abs path> [--model <name>]\n" +
  "       launch.ts review --worktree <abs path> [--model <name>]\n";

const promptFor = (issue: number, repository: string, doneGate: string): string =>
  `Implement GitHub Issue #${issue} of ${repository} in this worktree.

1. Read the Issue with \`gh issue view ${issue} --repo ${repository} --json title,body\`. The Issue is the agreed requirement. Do not change its scope, and do not do what it lists as out of scope.
2. Make the change the Issue asks for, following the repository's rules that apply to the files you touch.
3. Run \`${doneGate} check\`. It runs the repository's full check and records the result for the current working tree. Fix what fails and run it again.
4. You are done when \`${doneGate} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: the files you changed, what \`${doneGate} status\` printed, each decision you made that the Issue does not state, and each step the Issue hands over to a named person.
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

const reviewPrompt = (opening: string): string => [opening, REVIEW_POINTS, REVIEW_CLOSING].join("\n\n");

type Flags = Record<string, string>;
type Result = Record<string, unknown> & { ok: boolean };

interface Launch {
  issue: number;
  repository: string;
  branch: string;
  base: string;
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

const prepareStop = (issue: number, reason: string, detail: string): Result =>
  stopped("prepare", reason, detail, { issue });

const planOf = ({ repo, issue, description }: PrepareCall): Plan | Result => {
  const config = parseObject(runQuiet("git", ["-C", repo, "show", "HEAD:.dotagents.json"], repo).stdout ?? "");
  if (!config || !nonEmpty(config.repository) || !nonEmpty(config.remote) || !nonEmpty(config.baseBranch)) {
    return prepareStop(issue, "no-config", `HEAD of ${repo} has no .dotagents.json with non-empty repository, remote, and baseBranch strings.`);
  }
  const { repository, remote, baseBranch } = config;
  const viewed = runQuiet("gh", ["issue", "view", String(issue), "--repo", repository, "--json", "number,title,body,state"], repo);
  const found = viewed.status === 0 ? parseObject(viewed.stdout) : null;
  if (!found || typeof found.title !== "string" || typeof found.state !== "string") {
    return prepareStop(issue, "issue-unreadable", `gh could not read Issue #${issue} of ${repository}: ${outputOf(viewed)}`);
  }
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
  return { repository, remote, baseBranch, branch, worktree: join(repo, ".claude", "worktrees", `implement-${issue}`) };
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
  const { repository, branch, worktree } = plan;
  const kept = `The worktree ${worktree} and the branch ${branch} are left in place.`;
  const setupFailure = runSetup(worktree);
  if (setupFailure !== null) return prepareStop(issue, "setup-failed", `${setupFailure}. ${kept}`);
  const gateOn = runShown(process.execPath, [DONE_GATE, "on", "--mode", gateMode], worktree);
  const gate = gateOn.status === 0 ? gateLocation(worktree) : null;
  if (gate === null) return prepareStop(issue, "gate-failed", `done_gate.ts on --mode ${gateMode} ${exitOf(gateOn)}. ${kept}`);
  const launch: Launch = { issue, repository, branch, base };
  writeFileSync(join(gate.dir, LAUNCH_FILE), `${JSON.stringify(launch, null, 2)}\n`);
  return { action: "prepare", ok: true, issue, branch, worktree, base, gate_mode: gateMode };
};

const launchOf = (value: unknown): Launch | null => {
  const fields = objectOf(value);
  if (!fields) return null;
  const { issue, repository, branch, base } = fields;
  if (!Number.isInteger(issue) || !nonEmpty(repository) || !nonEmpty(branch) || !nonEmpty(base)) return null;
  return { issue: issue as number, repository, branch, base };
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

const implement = async (argv: string[]): Promise<Result | null> => {
  const call = worktreeCall(argv);
  if (call === null) return null;
  const { worktree, model } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("implement", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, launch } = prepared;

  const outcome = await runClaudeOnce({
    prompt: promptFor(launch.issue, launch.repository, DONE_GATE),
    model,
    effort: undefined,
    schema: undefined,
    cwd: worktree,
    timeoutMs: CHILD_TIMEOUT_MS,
  });
  const tail = oneLine(outcome.stderr.split("\n").slice(-3).join(" "));
  if (outcome.timedOut) return stop("child-failed", `claude -p was ended at its ${CHILD_TIMEOUT_MS} ms limit. ${tail}`);
  if (outcome.code !== 0) return stop("child-failed", `claude -p exited ${outcome.code}. ${tail}`);
  const reply = parseObject(outcome.stdout);
  if (reply === null) return stop("child-failed", `claude -p printed no JSON object. ${tail}`);
  if (typeof reply.session_id !== "string") return stop("child-failed", "the JSON claude -p printed has no session_id string.");

  const status = runQuiet(process.execPath, [DONE_GATE, "status"], worktree);
  const tree = treeHash(gate.root);
  writeFileSync(
    launchPath,
    `${JSON.stringify({ ...launch, implement: { session_id: reply.session_id, tree, at: new Date().toISOString() } }, null, 2)}\n`,
  );
  const shown = {
    session_id: reply.session_id,
    tree,
    result: reply.result,
    cost_usd: reply.total_cost_usd,
    duration_ms: reply.duration_ms,
  };
  if (status.status !== 0) return stop("not-done", `done_gate.ts status is not done: ${outputOf(status)}`, shown);
  return { action: "implement", ok: true, ...shown };
};

type Side = "self" | "independent";
type Verdict = "accepted" | "rejected";

interface Review {
  verdict: Verdict;
  findings: Record<string, unknown>[];
  verified: unknown;
  session_id: unknown;
  cost_usd: unknown;
  duration_ms: unknown;
}

const verdictOf = (rejected: boolean): Verdict => (rejected ? "rejected" : "accepted");

const replyOf = (outcome: ChildOutcome): Record<string, unknown> | string => {
  const tail = oneLine(outcome.stderr.split("\n").slice(-3).join(" "));
  if (outcome.timedOut) return `claude -p was ended at its ${CHILD_TIMEOUT_MS} ms limit. ${tail}`;
  if (outcome.code !== 0) return `claude -p exited ${outcome.code}. ${tail}`;
  return parseObject(outcome.stdout) ?? `claude -p printed no JSON object. ${tail}`;
};

const reviewOf = (reply: Record<string, unknown>): Review | null => {
  const output = objectOf(reply.structured_output);
  const findings = output?.findings;
  if (!output || !Array.isArray(findings)) return null;
  const shaped = findings.map(objectOf);
  if (!shaped.every((finding) => typeof finding?.required === "boolean")) return null;
  return {
    verdict: verdictOf(findings.some((finding) => finding.required === true)),
    findings,
    verified: output.verified,
    session_id: reply.session_id,
    cost_usd: reply.total_cost_usd,
    duration_ms: reply.duration_ms,
  };
};

const UNSHAPED = "its structured_output is not an object whose findings array has a boolean required in every element";

const runReview = async (run: ChildRun): Promise<Review | string> => {
  const first = replyOf(await runClaudeOnce(run));
  if (typeof first === "string") return first;
  const review = reviewOf(first);
  if (review !== null) return review;
  if (!nonEmpty(first.session_id)) return `${UNSHAPED}, and the JSON has no session_id to ask again in.`;
  const again = replyOf(await runClaudeOnce({ ...run, prompt: GIVE_REPLY, resume: first.session_id, fork: undefined }));
  if (typeof again === "string") return `${UNSHAPED}; asked once more, ${again}`;
  return reviewOf(again) ?? `${UNSHAPED}, also after asking once more.`;
};

const recordOf = ({ session_id, verdict, findings, verified }: Review) => ({ session_id, verdict, findings, verified });

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
  if (!nonEmpty(implemented)) return stop("not-implemented", `launch.json of ${worktree} has no implement.session_id.`);
  const status = runQuiet(process.execPath, [DONE_GATE, "status"], worktree);
  if (status.status !== 0) return stop("not-done", `done_gate.ts status is not done: ${outputOf(status)}`);

  const tree = treeHash(gate.root);
  const common = { model, effort: undefined, schema: REVIEW_SCHEMA, cwd: worktree, timeoutMs: CHILD_TIMEOUT_MS, tools: REVIEW_TOOLS };
  const [self, independent] = await Promise.all([
    runReview({ ...common, prompt: reviewPrompt(selfOpening(launch.issue)), resume: implemented, fork: true }),
    runReview({ ...common, prompt: reviewPrompt(independentOpening(launch.issue, launch.repository)) }),
  ]);
  const results: Record<Side, Review | string> = { self, independent };
  const readable = Object.fromEntries(Object.entries(results).filter(([, result]) => typeof result !== "string"));
  const failures = Object.entries(results).filter((entry): entry is [Side, string] => typeof entry[1] === "string");
  if (failures.length > 0) {
    const detail = failures.map(([side, why]) => `The ${side} review gave no readable result: ${why}`).join(" ");
    return stop("review-failed", detail, { reviews: readable });
  }
  const reviews = readable as Record<Side, Review>;
  const after = treeHash(gate.root);
  if (after !== tree) {
    return stop("tree-changed", `The working tree was ${tree} before the reviews and ${after} after them.`, { reviews });
  }

  const earlier = Array.isArray(stored.reviews) ? stored.reviews : [];
  const round = earlier.length + 1;
  const verdict = verdictOf(reviews.self.verdict === "rejected" || reviews.independent.verdict === "rejected");
  const record = {
    round,
    tree,
    at: new Date().toISOString(),
    verdict,
    self: recordOf(reviews.self),
    independent: recordOf(reviews.independent),
  };
  writeFileSync(launchPath, `${JSON.stringify({ ...stored, reviews: [...earlier, record] }, null, 2)}\n`);
  return { action: "review", ok: true, round, tree, verdict, reviews };
};

const ACTIONS: Record<string, (argv: string[]) => Result | null | Promise<Result | null>> = {
  prepare,
  implement,
  review,
};

export async function launch(argv: string[]): Promise<number> {
  const [action, ...rest] = argv;
  const result = Object.hasOwn(ACTIONS, action ?? "") ? await ACTIONS[action](rest) : null;
  if (result === null) {
    process.stderr.write(USAGE);
    return 2;
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.ok ? 0 : 1;
}

if (isMainModule(import.meta.url)) process.exitCode = await launch(process.argv.slice(2));
