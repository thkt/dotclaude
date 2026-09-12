#!/opt/homebrew/bin/bun
/// <reference types="node" />
// The hook body half of the retired amphetamine_agent_session hook's port (unit U-004):
// main's argv dispatch, mirroring the shebang + `process.exit(main())` shape DR-0114 asks of a
// finished hook body (hooks/lifecycle/recall_index.ts's shape). This is the 6th hook this shape
// lands in -- #634, #642, #643, #644 and #684 landed first -- so the dispatch below copies that
// shape rather than redesigning it.
//
// The marker-mtime primitives (unit U-003) and session_id (this unit) live in
// amphetamine_state.ts, a plain module with no top-level side effect, rather than here: a module
// that calls `process.exit()` unconditionally at its own top level cannot also be imported
// directly by a `node --test` file. Under `--test-isolation=process`, the test worker's fd 0 is
// the runner's own IPC channel, not a plain stdin, so a synchronous fd-0 read inside that
// top-level call (readStdin, which main() reaches through) deadlocks the worker rather than
// returning -- confirmed by reproduction. hooks/integrations/tests/amphetamine-marker.test.ts
// (unit U-003) already imports the marker functions directly, so they had to move to keep that
// import safe once this file gained the unconditional process.exit call; amphetamine_state.ts's
// own header carries the rest of this reasoning. This mirrors the codebase's existing
// scribe_trigger.ts (pure, hooks/_lib/) / scribe_prompt.ts (hook body, hooks/post-bash/) split.
//
// main mirrors the retired amphetamine_agent_session hook's main + run + _release +
// _foreign_session: it reads the same argv position Python's sys.argv[1] does, filters to the
// three known actions, gates on the app directory and on osascript being resolvable, and then
// branches on release / acquire+background the way run() does. Both gates matter on a machine
// without Amphetamine: this hook fires on UserPromptSubmit, on every PostToolUse and on Stop,
// and without them each of those would create the state directory, sweep it and fork osascript.
//
// The retired amphetamine_agent_session hook defers its `re`, `shutil` and `subprocess` imports to the
// functions that need them, reasoning that most hook runs return before reaching one. Node's
// `node:child_process` (subprocess's counterpart) is a built-in with no package to resolve, and
// none of the five prior TS hook ports that call an external binary (rumdl_check.ts among them)
// defer that import either, so this port keeps spawnSync as a static top-level import rather
// than reaching for `import()`. Measured before choosing, since the Python original deferred it
// on a run-count argument: two rounds of 60 bun runs each put the hoisted form 0.9 ms and 2.0 ms
// per run behind the dynamic one, under DR-0112's 5 ms reassessment threshold. `re`'s counterpart is a regex literal, which carries no import
// at all. `shutil.which`'s counterpart folds into the spawnSync call itself, the way
// rumdl_check.ts already reads a missing binary off spawnSync's own result (`status === null`)
// instead of probing PATH first.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readStdin } from "../_lib/hook_payload.ts";
import {
  anyFresh,
  anyMarker,
  fresh,
  hasMarkers,
  removeMarker,
  sessionId,
  sweep,
  touchMarker,
} from "./amphetamine_state.ts";

/** _amph's osascript timeout in seconds. Mirrors the retired amphetamine_agent_session hook's
 * AMPH_TIMEOUT_SECONDS: osascript can sit on a modal Amphetamine raises, and this hook fires on
 * every tool call, so a blocked call would wedge the turn. */
const AMPH_TIMEOUT_SECONDS = 5;

/** How long a session runs. Mirrors the retired amphetamine_agent_session hook's SESSION_MINUTES: release
 * reads it as the upper bound of what it recognizes as its own, so nothing longer is issued. */
const SESSION_MINUTES = 60;

/** background returns without calling osascript until this long after the last issue. Mirrors
 * the retired amphetamine_agent_session hook's BG_REFRESH_MINUTES. */
const BG_REFRESH_MINUTES = 5;

/** How fresh a bg marker has to be for release to read it as work still running. Mirrors
 * the retired amphetamine_agent_session hook's BG_FRESH_MINUTES. */
const BG_FRESH_MINUTES = 15;

/** Amphetamine's own code for "no session running" -- one of the negative codes `remaining`
 * documents. Mirrors the retired amphetamine_agent_session hook's NO_SESSION. */
const NO_SESSION = -3;

/** Where markers live absent CLAUDE_AMPHETAMINE_STATE_DIR. Mirrors the retired amphetamine_agent_session hook's
 * DEFAULT_STATE_DIR, read at call time so a test swapping HOME never touches this machine's own
 * directory. */
function defaultStateDir(): string {
  return join(homedir(), "Library", "Application Support", "claude-amphetamine");
}

/** Sends one AppleScript command to Amphetamine via osascript, empty on a non-zero exit or a
 * timeout. Mirrors the retired amphetamine_agent_session hook's _amph. */
function amph(command: string): string {
  const result = spawnSync("osascript", ["-e", `tell application "Amphetamine" to ${command}`], {
    encoding: "utf8",
    timeout: AMPH_TIMEOUT_SECONDS * 1000,
  });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
}

/** Issues a new Amphetamine session. The only place one is issued: release's ownership test
 * (below) assumes this length. Mirrors the retired amphetamine_agent_session hook's start_session -- closed-
 * display mode stays Amphetamine's own preference rather than set per session, the way the
 * Python original leaves it out of `options` too. */
function startSession(): void {
  amph(
    `start new session with options {duration:${SESSION_MINUTES}, interval:minutes, displaySleepAllowed:false}`,
  );
}

/** Seconds left on the running session, or null when Amphetamine answered with something
 * unreadable -- which leaves every caller on the side that touches nothing. Mirrors
 * the retired amphetamine_agent_session hook's remaining, whose `int(...)` raises ValueError on anything
 * that is not a plain (optionally signed) integer string. */
function remaining(): number | null {
  const text = amph("session time remaining");
  return /^-?\d+$/.test(text) ? Number.parseInt(text, 10) : null;
}

/** A session no Claude Code process started, which taking over would cut short. Mirrors
 * the retired amphetamine_agent_session hook's _foreign_session: any marker in the directory means the
 * running session is ours, since the first process to acquire starts one and every later turn
 * then sees a positive remaining time and would otherwise stand aside without joining the
 * count. */
function foreignSession(stateDir: string, marker: string, bgMarker: string): boolean {
  if (existsSync(marker) || existsSync(bgMarker) || hasMarkers(stateDir)) return false;
  return remaining() !== NO_SESSION;
}

/** Mirrors the retired amphetamine_agent_session hook's _release. */
function release(stateDir: string, marker: string, bgMarker: string): void {
  removeMarker(marker);

  // Another Claude Code process is still mid-turn, so its session stays.
  if (anyMarker(stateDir, "session-")) return;

  // 0 is endless and a negative value is a session from elsewhere. Longer than this hook ever
  // issues means a manual one slipped in.
  const left = remaining();
  if (left === null || left <= 0 || left > SESSION_MINUTES * 60) return;

  // A workflow or subagent still running extends the session past the turn. Nothing reports
  // their end, so the next release closes it once the marker has gone stale.
  if (anyFresh(stateDir, "bg-", BG_FRESH_MINUTES)) {
    startSession();
    return;
  }

  removeMarker(bgMarker);
  amph("end session");
}

/** Mirrors the retired amphetamine_agent_session hook's run. */
function run(action: string, payloadText: string, stateDir: string): void {
  const sid = sessionId(payloadText, action);
  if (sid === null) return;
  try {
    mkdirSync(stateDir, { recursive: true });
  } catch {
    return;
  }
  sweep(stateDir);

  const marker = join(stateDir, `session-${sid}`);
  const bgMarker = join(stateDir, `bg-${sid}`);

  if (action === "release") {
    release(stateDir, marker, bgMarker);
    return;
  }

  if (action === "background" && fresh(bgMarker, BG_REFRESH_MINUTES)) return;
  if (foreignSession(stateDir, marker, bgMarker)) return;
  touchMarker(action === "background" ? bgMarker : marker);
  startSession();
}

/** Where the app sits absent CLAUDE_AMPHETAMINE_APP. Mirrors the retired hook's DEFAULT_APP. */
const DEFAULT_APP = "/Applications/Amphetamine.app";

/** True when `path` is a directory. The retired hook asked `Path(app).is_dir()`, which answers
 * false for every reason a stat can fail rather than raising. */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** The osascript the retired hook's `shutil.which("osascript")` would have found, or null.
 * Resolved on PATH rather than pinned: the hook's own tests put a stub there, and the retired
 * hook spawned it by bare name too. */
function osascriptOnPath(): string | null {
  const found = spawnSync("/usr/bin/env", ["sh", "-c", "command -v osascript"], {
    encoding: "utf8",
  });
  const path = (found.stdout ?? "").trim();
  return found.status === 0 && path ? path : null;
}

/** Mirrors the retired amphetamine_agent_session hook's main. */
function main(): number {
  const action = process.argv[2] ?? "";
  if (action !== "acquire" && action !== "release" && action !== "background") return 0;
  if (!isDirectory(process.env.CLAUDE_AMPHETAMINE_APP || DEFAULT_APP)) return 0;
  if (osascriptOnPath() === null) return 0;
  const stateDir = process.env.CLAUDE_AMPHETAMINE_STATE_DIR || defaultStateDir();
  run(action, readStdin(), stateDir);
  return 0;
}

process.exit(main());
