/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const GATE_DIR_NAME = "agent-gate";
export const CONFIG_FILE = "config.json";
export const CHECK_FILE = "check.json";

export type CheckCommand = string | string[];
export type GateMode = "record" | "enforce";

export interface GateConfig {
  check: CheckCommand;
  mode: GateMode;
}

export interface CheckRecord {
  tree: string;
  exitCode: number;
  at: string;
}

export type Verdict =
  | { done: true }
  | { done: false; reason: "no-record" | "nonzero-exit" | "tree-changed"; lines: string[] };

const RUN_CHECK = "Next: run `done_gate.ts check` on the current working tree.";

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

export function verdict(record: CheckRecord | null, currentTree: string): Verdict {
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

function git(args: string[], cwd: string, env?: NodeJS.ProcessEnv, input?: string): string | null {
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
