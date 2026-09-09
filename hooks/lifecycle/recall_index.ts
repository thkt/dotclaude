#!/opt/homebrew/bin/bun
/// <reference types="node" />
// SessionStart hook: catch up recall's cross-session index in the background. The TypeScript
// port of hooks/lifecycle/recall_index.py (unit U-003); recall_index.py's docstring holds the
// reasoning (SessionStart over SessionEnd, why this is advisory-only) and applies here unchanged.
//
// Advisory: never blocks the prompt, and every exit path below is exit 0 -- a hook whose own
// failure blocks the session would be worse than the indexing it skips.
import { spawn } from "node:child_process";
import {
  accessSync,
  closeSync,
  constants,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  utimesSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isMainModule } from "../../workflows/_lib/entry-point.ts";
import { parse } from "../_lib/hook_payload.ts";

// The full path, not a PATH lookup: a hook can run without the homebrew prefix, where the
// lookup would silently skip every session. CLAUDE_RECALL_BIN lets the tests hand over a stub.
const DEFAULT_RECALL = "/opt/homebrew/bin/recall";

// Worst-case staleness: a session that completes just after a run waits this long to become
// searchable. recall answers questions about days-old decisions, so hours cost nothing, and
// the bound is what keeps dozens of session starts a day from each paying for an embed.
const WINDOW_MINUTES = 180;

/** Read at call time, not at module load: the tests swap HOME to keep this machine's own
 * stamp out of the run. */
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

/** A closed stdin (no pipe, a TTY with nothing typed) can make a synchronous fd-0 read throw
 * rather than return "" -- read it as empty rather than let that throw exit the hook non-zero. */
function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function isExecutableFile(candidate: string): boolean {
  try {
    if (!statSync(candidate).isFile()) return false;
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function main(): number {
  // A compaction restart brings no newly completed session, and the live transcript is
  // mid-write. recall searches past sessions, never the live one.
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

  // Detached so the embed never delays the prompt. SQLite WAL serializes concurrent writers,
  // so parallel session starts need no lock of their own.
  spawn(recall, ["index"], { detached: true, stdio: "ignore" }).unref();
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
