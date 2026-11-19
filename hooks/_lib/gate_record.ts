/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const GATE_DIR_NAME = "agent-gate";
export const CONFIG_FILE = "config.json";
export const CHECK_FILE = "check.json";
export const RED_FILE = "red.json";
export const STOP_LOG_FILE = "stop-log.jsonl";
export const STREAK_FILE = "stop-streak.json";
export const PUBLISH_LOG_FILE = "publish-log.jsonl";

export type CheckCommand = string | string[];
export type GateMode = "record" | "enforce";

export interface GateConfig {
  check: CheckCommand;
  mode: GateMode;
  remote?: string;
  baseBranch?: string;
  setup?: CheckCommand;
  requireRed?: true;
}

export interface CheckRecord {
  tree: string;
  exitCode: number;
  at: string;
}

export interface RedRecord {
  tree: string;
  base: string;
  tests: string[];
  exitCode: number | null;
  at: string;
}

export type NotDoneReason =
  | "no-record"
  | "nonzero-exit"
  | "tree-changed"
  | "red-no-record"
  | "red-tree-changed"
  | "red-not-failing";

export type Verdict = { done: true } | { done: false; reason: NotDoneReason; lines: string[] };

const RUN_CHECK = "Next: run `done_gate.ts check` on the current working tree.";
const RUN_RED = "Next: run `done_gate.ts red` on the current working tree.";

export function checkCommand(value: unknown): CheckCommand | null {
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((part) => typeof part === "string") &&
    value[0] !== ""
  ) {
    return value as string[];
  }
  return null;
}

export function checkRecord(value: unknown): CheckRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { tree, exitCode, at } = value as Record<string, unknown>;
  if (typeof tree !== "string" || typeof exitCode !== "number" || typeof at !== "string") {
    return null;
  }
  return { tree, exitCode, at };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function redRecord(value: unknown): RedRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { tree, base, tests, exitCode, at } = value as Record<string, unknown>;
  if (
    typeof tree !== "string" ||
    typeof base !== "string" ||
    !Array.isArray(tests) ||
    !tests.every((test) => typeof test === "string") ||
    (typeof exitCode !== "number" && exitCode !== null) ||
    typeof at !== "string"
  ) {
    return null;
  }
  return { tree, base, tests, exitCode, at };
}

function checkVerdict(record: CheckRecord | null, currentTree: string): Verdict {
  if (record === null) {
    return { done: false, reason: "no-record", lines: ["No check result is recorded.", RUN_CHECK] };
  }
  if (record.exitCode !== 0) {
    return {
      done: false,
      reason: "nonzero-exit",
      lines: [`The recorded check exited ${record.exitCode} at ${record.at}.`, RUN_CHECK],
    };
  }
  if (record.tree !== currentTree) {
    return {
      done: false,
      reason: "tree-changed",
      lines: [
        `The working tree changed after the check passed at ${record.at} (recorded ${record.tree}, now ${currentTree}).`,
        RUN_CHECK,
      ],
    };
  }
  return { done: true };
}

function redVerdict(record: RedRecord | null, currentTree: string): Verdict {
  if (record === null) {
    return { done: false, reason: "red-no-record", lines: ["No red result is recorded.", RUN_RED] };
  }
  if (record.tree !== currentTree) {
    return {
      done: false,
      reason: "red-tree-changed",
      lines: [
        `The working tree changed after red ran at ${record.at} (recorded ${record.tree}, now ${currentTree}).`,
        RUN_RED,
      ],
    };
  }
  if (record.tests.length === 0) {
    return {
      done: false,
      reason: "red-not-failing",
      lines: [`The red run at ${record.at} found no changed test files against base ${record.base}.`, RUN_RED],
    };
  }
  if (record.exitCode === 0) {
    return {
      done: false,
      reason: "red-not-failing",
      lines: [
        `The changed tests passed on base ${record.base} at ${record.at}, so they do not verify this change.`,
        RUN_RED,
      ],
    };
  }
  return { done: true };
}

export function verdict(
  record: CheckRecord | null,
  currentTree: string,
  red?: { record: RedRecord | null },
): Verdict {
  const checkSide = checkVerdict(record, currentTree);
  if (red === undefined) {
    return checkSide;
  }
  const redSide = redVerdict(red.record, currentTree);
  if (checkSide.done) {
    return redSide;
  }
  return redSide.done
    ? checkSide
    : { done: false, reason: checkSide.reason, lines: [...checkSide.lines, ...redSide.lines] };
}

export function git(args: string[], cwd: string, env?: NodeJS.ProcessEnv, input?: string): string | null {
  const result = spawnSync("git", args, { cwd, env, input, encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.replace(/\n$/, "");
}

export interface GateLocation {
  root: string;
  dir: string;
}

export function gateLocation(cwd: string): GateLocation | null {
  const root = git(["rev-parse", "--show-toplevel"], cwd);
  if (!root) {
    return null;
  }
  const dir = git(["rev-parse", "--path-format=absolute", "--git-path", GATE_DIR_NAME], cwd);
  if (!dir) {
    return null;
  }
  return { root, dir };
}

export function treeHash(root: string): string | null {
  const scratch = mkdtempSync(join(tmpdir(), "done-gate-index-"));
  try {
    const trackedButIgnored = git(["ls-files", "-z", "-ci", "--exclude-standard"], root);
    if (trackedButIgnored === null) {
      return null;
    }
    const present = trackedButIgnored
      .split("\0")
      .filter((path) => path !== "" && existsSync(join(root, path)));
    const env = { ...process.env, GIT_INDEX_FILE: join(scratch, "index") };
    if (git(["add", "-A"], root, env) === null) {
      return null;
    }
    if (
      present.length > 0 &&
      git(["update-index", "--add", "-z", "--stdin"], root, env, `${present.join("\0")}\0`) === null
    ) {
      return null;
    }
    return git(["write-tree"], root, env) || null;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

export function storedConfig(gate: GateLocation): GateConfig | null {
  const config = readJson(join(gate.dir, CONFIG_FILE));
  if (typeof config !== "object" || config === null) {
    return null;
  }
  const fields = config as Record<string, unknown>;
  const mode = fields.mode;
  if (mode !== "record" && mode !== "enforce") {
    return null;
  }
  return gateConfig(fields, mode, fields.requireRed === true);
}

export function gateConfig(
  fields: Record<string, unknown>,
  mode: GateMode,
  requireRed: boolean,
): GateConfig | null {
  const check = checkCommand(fields.check);
  if (check === null) {
    return null;
  }
  const remote = nonEmptyString(fields.remote);
  const baseBranch = nonEmptyString(fields.baseBranch);
  const setup = checkCommand(fields.setup);
  return {
    check,
    mode,
    ...(remote === null ? {} : { remote }),
    ...(baseBranch === null ? {} : { baseBranch }),
    ...(setup === null ? {} : { setup }),
    ...(requireRed ? { requireRed: true as const } : {}),
  };
}

export interface Evaluation {
  tree: string;
  record: CheckRecord | null;
  result: Verdict;
}

export function evaluate(gate: GateLocation, config: GateConfig): Evaluation | null {
  const tree = treeHash(gate.root);
  if (tree === null) {
    return null;
  }
  const record = checkRecord(readJson(join(gate.dir, CHECK_FILE)));
  const red =
    config.requireRed === true ? { record: redRecord(readJson(join(gate.dir, RED_FILE))) } : undefined;
  return { tree, record, result: verdict(record, tree, red) };
}

export function verdictText(result: Verdict): string {
  return result.done ? "done" : result.lines.join("\n");
}
