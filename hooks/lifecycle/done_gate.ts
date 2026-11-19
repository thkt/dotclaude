#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CHECK_FILE,
  CONFIG_FILE,
  type CheckCommand,
  type CheckRecord,
  checkCommand,
  checkRecord,
  type GateConfig,
  type GateLocation,
  type GateMode,
  gateLocation,
  STOP_LOG_FILE,
  STREAK_FILE,
  treeHash,
  type Verdict,
  verdict,
} from "../_lib/gate_record.ts";

const USAGE = "usage: done_gate.ts on [--mode enforce] | off | check | status | stop";
const STREAK_LIMIT = 8;

function fail(message: string): number {
  process.stderr.write(`done_gate: ${message}\n`);
  return 2;
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function modeFrom(args: string[]): GateMode | null {
  if (args.length === 0) {
    return "record";
  }
  if (args.length === 2 && args[0] === "--mode" && (args[1] === "record" || args[1] === "enforce")) {
    return args[1];
  }
  return null;
}

function on(gate: GateLocation, args: string[]): number {
  const mode = modeFrom(args);
  if (mode === null) {
    return fail(`on takes only --mode record|enforce, got: ${args.join(" ")}`);
  }
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
  const check =
    typeof parsed === "object" && parsed !== null
      ? checkCommand((parsed as Record<string, unknown>).check)
      : null;
  if (check === null) {
    return fail(".dotagents.json check must be a non-empty shell string or a non-empty argv array");
  }
  const config: GateConfig = { check, mode };
  mkdirSync(gate.dir, { recursive: true });
  rmSync(join(gate.dir, CHECK_FILE), { force: true });
  writeFileSync(join(gate.dir, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write(`done_gate: on (mode ${mode})\n`);
  return 0;
}

function off(gate: GateLocation): number {
  rmSync(gate.dir, { recursive: true, force: true });
  return 0;
}

function storedConfig(gate: GateLocation): GateConfig | null {
  const config = readJson(join(gate.dir, CONFIG_FILE));
  if (typeof config !== "object" || config === null) {
    return null;
  }
  const fields = config as Record<string, unknown>;
  const check = checkCommand(fields.check);
  const mode = fields.mode;
  if (check === null || (mode !== "record" && mode !== "enforce")) {
    return null;
  }
  return { check, mode };
}

function runCommand(command: CheckCommand, cwd: string): number {
  const [file, args] =
    typeof command === "string" ? ["/bin/sh", ["-c", command]] : [command[0], command.slice(1)];
  const result = spawnSync(file, args, { cwd, stdio: "inherit" });
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

interface Evaluation {
  tree: string;
  record: CheckRecord | null;
  result: Verdict;
}

function evaluate(gate: GateLocation): Evaluation | null {
  const tree = treeHash(gate.root);
  if (tree === null) {
    return null;
  }
  const record = checkRecord(readJson(join(gate.dir, CHECK_FILE)));
  return { tree, record, result: verdict(record, tree) };
}

function verdictText(result: Verdict): string {
  return result.done ? "done" : result.lines.join("\n");
}

function status(gate: GateLocation): number {
  if (storedConfig(gate) === null) {
    return fail("not on in this worktree; run `done_gate.ts on` first");
  }
  const evaluation = evaluate(gate);
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
  const evaluation = evaluate(gate);
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
