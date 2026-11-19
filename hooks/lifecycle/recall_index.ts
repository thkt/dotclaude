#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawn } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  statSync,
  utimesSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isExecutableFile } from "../_lib/executable.ts";
import { parse, readStdin } from "../_lib/hook_payload.ts";

const DEFAULT_RECALL = "/opt/homebrew/bin/recall";

const WINDOW_MINUTES = 180;

function stampPath(): string {
  return join(homedir(), ".cache", "claude-recall_index.last");
}

function recentlyIndexed(stamp: string): boolean {
  try {
    return Date.now() - statSync(stamp).mtimeMs < WINDOW_MINUTES * 60_000;
  } catch {
    return false;
  }
}

function main(): number {
  if (parse(readStdin()).source === "compact") return 0;

  const recall = process.env.CLAUDE_RECALL_BIN || DEFAULT_RECALL;
  if (!isExecutableFile(recall)) return 0;

  const stamp = stampPath();
  if (recentlyIndexed(stamp)) return 0;

  try {
    mkdirSync(dirname(stamp), { recursive: true });
    closeSync(openSync(stamp, "a"));
    const now = new Date();
    utimesSync(stamp, now, now);
  } catch {
    return 0;
  }

  spawn(recall, ["index"], { detached: true, stdio: "ignore" }).unref();
  return 0;
}

process.exit(main());
