#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  CHECK_FILE,
  CONFIG_FILE,
  type CheckCommand,
  type CheckRecord,
  type Evaluation,
  evaluate,
  gateConfig,
  git,
  type GateLocation,
  type GateMode,
  gateLocation,
  RED_FILE,
  type RedRecord,
  readJson,
  STOP_LOG_FILE,
  STREAK_FILE,
  storedConfig,
  treeHash,
  verdictText,
} from "../_lib/gate_record.ts";

const USAGE =
  "usage: done_gate.ts on [--mode enforce] [--require red] | off | check | red | status | stop";
const STREAK_LIMIT = 8;

function fail(message: string): number {
  process.stderr.write(`done_gate: ${message}\n`);
  return 2;
}

interface OnOptions {
  mode: GateMode;
  requireRed: boolean;
}

function onOptions(args: string[]): OnOptions | null {
  const options: OnOptions = { mode: "record", requireRed: false };
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 2) {
    const [flag, value] = [args[index], args[index + 1]];
    if (seen.has(flag)) {
      return null;
    }
    seen.add(flag);
    if (flag === "--mode" && (value === "record" || value === "enforce")) {
      options.mode = value;
    } else if (flag === "--require" && value === "red") {
      options.requireRed = true;
    } else {
      return null;
    }
  }
  return options;
}

function on(gate: GateLocation, args: string[]): number {
  const options = onOptions(args);
  if (options === null) {
    return fail(`on takes only --mode record|enforce and --require red, got: ${args.join(" ")}`);
  }
  const { mode, requireRed } = options;
  let text: string;
  try {
    text = readFileSync(join(gate.root, ".dotagents.json"), "utf8");
  } catch {
    return fail(`no readable .dotagents.json at ${gate.root}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail(".dotagents.json is not valid JSON");
  }
  const fields: Record<string, unknown> =
    typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const config = gateConfig(fields, mode, requireRed);
  if (config === null) {
    return fail(".dotagents.json check must be a non-empty shell string or a non-empty argv array");
  }
  mkdirSync(gate.dir, { recursive: true });
  rmSync(join(gate.dir, CHECK_FILE), { force: true });
  rmSync(join(gate.dir, RED_FILE), { force: true });
  writeFileSync(join(gate.dir, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write(`done_gate: on (mode ${mode}${requireRed ? ", require red" : ""})\n`);
  return 0;
}

function off(gate: GateLocation): number {
  rmSync(gate.dir, { recursive: true, force: true });
  return 0;
}

function runCommand(
  command: CheckCommand,
  cwd: string,
  stdout: "inherit" | 2 = "inherit",
  env: NodeJS.ProcessEnv = process.env,
): number {
  const [file, args] =
    typeof command === "string" ? ["/bin/sh", ["-c", command]] : [command[0], command.slice(1)];
  const result = spawnSync(file, args, { cwd, env, stdio: ["inherit", stdout, "inherit"] });
  if (result.error) {
    process.stderr.write(`done_gate: could not start the check: ${result.error.message}\n`);
  }
  return result.status ?? 1;
}

function check(gate: GateLocation): number {
  const command = storedConfig(gate)?.check ?? null;
  if (command === null) {
    return fail("not on in this worktree; run `done_gate.ts on` first");
  }
  const before = treeHash(gate.root);
  if (before === null) {
    return fail("could not hash the working tree");
  }
  let exitCode = runCommand(command, gate.root);
  const after = treeHash(gate.root);
  if (after !== before) {
    process.stdout.write(
      "done_gate: the check modified the working tree, so it is not recorded as passed. Commit or revert those changes and run `done_gate.ts check` again.\n",
    );
    exitCode = 1;
  }
  const record: CheckRecord = { tree: after ?? before, exitCode, at: new Date().toISOString() };
  writeFileSync(join(gate.dir, CHECK_FILE), `${JSON.stringify(record, null, 2)}\n`);
  return exitCode;
}

const TEST_DIRECTORIES: ReadonlySet<string> = new Set(["tests", "test", "__tests__"]);

function isTestFile(path: string): boolean {
  const segments = path.split("/");
  const name = segments[segments.length - 1];
  return (
    segments.slice(0, -1).some((segment) => TEST_DIRECTORIES.has(segment)) ||
    /\.(test|spec)\./.test(name) ||
    /_test\./.test(name)
  );
}

const REPOSITORY_ENV_KEYS = [
  "GIT_DIR",
  "GIT_INDEX_FILE",
  "GIT_WORK_TREE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_PREFIX",
];

function cloneEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of REPOSITORY_ENV_KEYS) {
    delete env[key];
  }
  return env;
}

function changedTestFiles(root: string, base: string, tree: string): string[] | null {
  const output = git(
    ["diff-tree", "-r", "-z", "--no-renames", "--name-only", "--diff-filter=d", base, tree],
    root,
  );
  if (output === null) {
    return null;
  }
  return output.split("\0").filter((path) => path !== "" && isTestFile(path));
}

function runInBaseClone(
  gate: GateLocation,
  base: string,
  tests: string[],
  check: CheckCommand,
  setup: CheckCommand | undefined,
): number | string {
  const scratch = mkdtempSync(join(tmpdir(), "done-gate-red-"));
  const env = cloneEnv();
  try {
    const clone = join(scratch, "repo");
    if (git(["clone", "-q", "--shared", "--no-checkout", gate.root, clone], scratch, env) === null) {
      return "could not clone the repository into a temporary directory";
    }
    if (git(["checkout", "-q", "--detach", base], clone, env) === null) {
      return `could not check out base ${base} in the clone`;
    }
    for (const path of tests) {
      mkdirSync(dirname(join(clone, path)), { recursive: true });
      copyFileSync(join(gate.root, path), join(clone, path));
    }
    if (setup !== undefined) {
      const setupExit = runCommand(setup, clone, 2, env);
      if (setupExit !== 0) {
        return `setup exited ${setupExit} in the clone of base ${base}`;
      }
    }
    return runCommand(check, clone, 2, env);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function red(gate: GateLocation): number {
  const config = storedConfig(gate);
  if (config === null) {
    return fail("not on in this worktree; run `done_gate.ts on` first");
  }
  const { remote, baseBranch } = config;
  if (remote === undefined || baseBranch === undefined) {
    return fail("on did not copy remote and baseBranch from .dotagents.json, so red has no base");
  }
  const ref = `refs/remotes/${remote}/${baseBranch}`;
  if (git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], gate.root) === null) {
    return fail(`base ref ${ref} does not exist`);
  }
  const base = git(["merge-base", "HEAD", ref], gate.root);
  if (!base) {
    return fail(`no merge base between HEAD and ${ref}`);
  }
  const tree = treeHash(gate.root);
  if (tree === null) {
    return fail("could not hash the working tree");
  }
  const tests = changedTestFiles(gate.root, base, tree);
  if (tests === null) {
    return fail(`could not compare the working tree with base ${base}`);
  }
  let exitCode: number | null = null;
  if (tests.length > 0) {
    const outcome = runInBaseClone(gate, base, tests, config.check, config.setup);
    if (typeof outcome === "string") {
      return fail(outcome);
    }
    exitCode = outcome;
  }
  const record: RedRecord = { tree, base, tests, exitCode, at: new Date().toISOString() };
  writeFileSync(join(gate.dir, RED_FILE), `${JSON.stringify(record, null, 2)}\n`);
  if (tests.length === 0) {
    process.stdout.write(`done_gate: no test files changed against base ${base}.\n`);
    return 1;
  }
  if (exitCode === 0) {
    process.stdout.write(
      `done_gate: the ${tests.length} changed test files pass on base ${base} too, so they do not verify this change.\n`,
    );
    return 1;
  }
  process.stdout.write(`done_gate: the ${tests.length} changed test files fail on base ${base}.\n`);
  return 0;
}

function status(gate: GateLocation): number {
  const config = storedConfig(gate);
  if (config === null) {
    return fail("not on in this worktree; run `done_gate.ts on` first");
  }
  const evaluation = evaluate(gate, config);
  if (evaluation === null) {
    return fail("could not hash the working tree");
  }
  process.stdout.write(`${verdictText(evaluation.result)}\n`);
  return evaluation.result.done ? 0 : 1;
}

type StopOutput = Record<string, string>;

function stopEvent(text: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

function appendStopLog(gate: GateLocation, sessionId: unknown, evaluation: Evaluation): void {
  const { tree, result } = evaluation;
  const entry = {
    at: new Date().toISOString(),
    session_id: typeof sessionId === "string" ? sessionId : null,
    tree,
    done: result.done,
    ...(result.done ? {} : { reason: result.reason }),
  };
  appendFileSync(join(gate.dir, STOP_LOG_FILE), `${JSON.stringify(entry)}\n`);
}

function blockedBefore(value: unknown, tree: string, checkExit: number | null): number {
  if (typeof value !== "object" || value === null) {
    return 0;
  }
  const streak = value as Record<string, unknown>;
  return streak.tree === tree && streak.checkExit === checkExit && typeof streak.count === "number"
    ? streak.count
    : 0;
}

function enforce(gate: GateLocation, evaluation: Evaluation): StopOutput {
  const { tree, record, result } = evaluation;
  const streakPath = join(gate.dir, STREAK_FILE);
  if (result.done) {
    rmSync(streakPath, { force: true });
    return {};
  }
  const checkExit = record === null ? null : record.exitCode;
  const count = blockedBefore(readJson(streakPath), tree, checkExit) + 1;
  if (count > STREAK_LIMIT) {
    rmSync(streakPath, { force: true });
    return {
      systemMessage: `done_gate: this stop is allowed because the last ${STREAK_LIMIT} stops were blocked with no change to the working tree or the check result.\n${verdictText(result)}`,
    };
  }
  writeFileSync(streakPath, `${JSON.stringify({ tree, checkExit, count })}\n`);
  return { decision: "block", reason: verdictText(result) };
}

function stopDecision(event: Record<string, unknown>): StopOutput {
  const { cwd, background_tasks: backgroundTasks, session_id: sessionId } = event;
  if (Array.isArray(backgroundTasks) && backgroundTasks.length > 0) {
    return {};
  }
  if (typeof cwd !== "string") {
    return {};
  }
  const gate = gateLocation(cwd);
  if (gate === null) {
    return {};
  }
  const config = storedConfig(gate);
  if (config === null) {
    return {};
  }
  const evaluation = evaluate(gate, config);
  if (evaluation === null) {
    throw new Error("could not hash the working tree");
  }
  if (config.mode === "record") {
    appendStopLog(gate, sessionId, evaluation);
    return {};
  }
  return enforce(gate, evaluation);
}

function stop(): number {
  let output: StopOutput = {};
  try {
    const event = stopEvent(readFileSync(0, "utf8"));
    if (event !== null) {
      output = stopDecision(event);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`done_gate: stop allowed after an error: ${message.replace(/\s+/g, " ")}\n`);
  }
  process.stdout.write(`${JSON.stringify(output)}\n`);
  return 0;
}

function main(argv: string[]): number {
  const [action, ...rest] = argv;
  if (action === "stop") {
    return stop();
  }
  const actions: Record<string, (gate: GateLocation) => number> = {
    on: (gate) => on(gate, rest),
    off,
    check,
    red,
    status,
  };
  if (action === undefined || !Object.hasOwn(actions, action)) {
    return fail(`unknown action ${JSON.stringify(action ?? "")}; ${USAGE}`);
  }
  const gate = gateLocation(process.cwd());
  if (gate === null) {
    return fail("not inside a git working tree");
  }
  return actions[action](gate);
}

process.exit(main(process.argv.slice(2)));
