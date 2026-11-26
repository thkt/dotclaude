#!/usr/bin/env bun
/// <reference types="node" />
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { gateLocation, git, LAUNCH_FILE } from "../../../hooks/_lib/gate_record.ts";
import { endAll } from "./claude-child.ts";
import { type HolderStop, hold } from "./holders.ts";
import { isMainModule } from "../../_lib/entry-point.ts";
import { digestOf, DONE_GATE, gateAt, isCapture, isCommandArgv, isShellOrArgv, isUniqueNames, type Launch, nonEmpty, parseObject, type Problem, publishTargetProblem, remoteProblem, type Result, runQuiet, setHolding, stopped, viewIssue, type WorktreeCall, writeLaunch } from "./launch-state.ts";
import { capture, endCapture } from "./capture.ts";
import { agree, continueWork, implement, repair, reread, review, runFields, runRounds } from "./rounds.ts";
import { body, publish, publishable, published } from "./publish.ts";

export const TYPE_BY_PREFIX: Record<string, string> = { bug: "fix", feature: "feat", docs: "docs", chore: "chore" };

const DESCRIPTION = /^[a-z0-9]+(-[a-z0-9]+){1,3}$/;

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

const USAGE =
  "usage: launch.ts prepare --repo <abs path> --issue <number> [--description <words>] [--gate-mode record|enforce]\n" +
  "       launch.ts implement --worktree <abs path> [--model <name>] [--effort <level>] [--fresh]\n" +
  "       launch.ts review --worktree <abs path> [--model <name>] [--effort <level>]\n" +
  "       launch.ts repair --worktree <abs path> [--model <name>] [--effort <level>]\n" +
  "       launch.ts agree --worktree <abs path>\n" +
  "       launch.ts reread --worktree <abs path> [--model <name>] [--effort <level>]\n" +
  "       launch.ts continue --worktree <abs path> [--model <name>] [--effort <level>]\n" +
  "       launch.ts run --worktree <abs path> [--model <name>] [--effort <level>]\n" +
  "       launch.ts publishable --worktree <abs path>\n" +
  "       launch.ts published --worktree <abs path>\n" +
  "       launch.ts body --worktree <abs path>\n" +
  "       launch.ts capture --worktree <abs path>\n" +
  "       launch.ts publish --worktree <abs path>\n";

type Flags = Record<string, string>;

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

const runShown = (file: string, args: string[], cwd: string): SpawnSyncReturns<Buffer> =>
  spawnSync(file, args, { cwd, stdio: ["ignore", 2, 2] });

const exitOf = (run: SpawnSyncReturns<Buffer>): string =>
  `exited ${run.status ?? run.error?.message ?? run.signal}; its output is on stderr`;

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

const prepareStop = (issue: number, reason: string, detail: string): Result =>
  stopped("prepare", reason, detail, { issue });

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
  writeLaunch(join(gate.dir, LAUNCH_FILE), launch);
  return { action: "prepare", ok: true, issue, branch, worktree, base, gate_mode: gateMode };
};

const CHILD_FLAGS = ["--worktree", "--model", "--effort"];

const worktreeCall = (argv: string[], allowed: readonly string[], switches: readonly string[] = []): WorktreeCall | null => {
  const flags = readFlags(argv, allowed, switches);
  const worktree = flags?.["--worktree"];
  if (!flags || !worktree || !isAbsolute(worktree)) return null;
  const effort = flags["--effort"];
  if (effort !== undefined && !EFFORTS.includes(effort)) return null;
  return { worktree, model: flags["--model"] ?? "opus", effort, fresh: Object.hasOwn(flags, "--fresh") };
};

interface HeldAction {
  parse: (argv: string[]) => WorktreeCall | null;
  act: (call: WorktreeCall) => Result | Promise<Result>;
}

const HELD_ACTIONS: Record<string, HeldAction> = {
  implement: { parse: (argv) => worktreeCall(argv, CHILD_FLAGS, ["--fresh"]), act: implement },
  review: { parse: (argv) => worktreeCall(argv, CHILD_FLAGS), act: review },
  repair: { parse: (argv) => worktreeCall(argv, CHILD_FLAGS), act: repair },
  agree: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: agree },
  reread: { parse: (argv) => worktreeCall(argv, CHILD_FLAGS), act: reread },
  continue: { parse: (argv) => worktreeCall(argv, CHILD_FLAGS), act: continueWork },
  run: { parse: (argv) => worktreeCall(argv, CHILD_FLAGS), act: runRounds },
  publishable: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: publishable },
  published: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: published },
  body: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: body },
  capture: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: capture },
  publish: { parse: (argv) => worktreeCall(argv, ["--worktree"]), act: publish },
};

const gateDirOf = (worktree: string): string | null => {
  const gate = gateAt(worktree);
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
  setHolding(held);
  const result = await act(call);
  held.release();
  return result;
};

const ENDS_ON_SIGNAL: Record<string, (() => void)[]> = {
  implement: [endAll],
  reread: [endAll],
  review: [endAll],
  repair: [endAll],
  continue: [endAll],
  run: [endAll, endCapture],
  capture: [endCapture],
};

const endAndExit = (ends: (() => void)[]) => () => {
  for (const end of ends) end();
  process.exit(143);
};

export async function launch(argv: string[]): Promise<number> {
  const [action, ...rest] = argv;
  if (Object.hasOwn(ENDS_ON_SIGNAL, action ?? "")) {
    const handler = endAndExit(ENDS_ON_SIGNAL[action ?? ""]);
    for (const name of ["SIGTERM", "SIGINT", "SIGHUP"] as const) process.on(name, handler);
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
