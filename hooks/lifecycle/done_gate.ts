#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  treeHash,
  verdict,
} from "../_lib/gate_record.ts";

const USAGE = "usage: done_gate.ts on [--mode enforce] | off | check | status";

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

function storedCheck(gate: GateLocation): CheckCommand | null {
  const config = readJson(join(gate.dir, CONFIG_FILE));
  if (typeof config !== "object" || config === null) {
    return null;
  }
  return checkCommand((config as Record<string, unknown>).check);
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
  const command = storedCheck(gate);
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

function status(gate: GateLocation): number {
  if (storedCheck(gate) === null) {
    return fail("not on in this worktree; run `done_gate.ts on` first");
  }
  const current = treeHash(gate.root);
  if (current === null) {
    return fail("could not hash the working tree");
  }
  const result = verdict(checkRecord(readJson(join(gate.dir, CHECK_FILE))), current);
  if (result.done) {
    process.stdout.write("done\n");
    return 0;
  }
  process.stdout.write(`${result.lines.join("\n")}\n`);
  return 1;
}

function main(argv: string[]): number {
  const [action, ...rest] = argv;
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
