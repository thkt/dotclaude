/// <reference types="node" />
// The pure, safely-importable half of hooks/integrations/amphetamine_agent_session.py's port:
// the marker-mtime primitives (unit U-003) and session_id plus the marker-existence checks
// amphetamine_agent_session.ts's release/foreign-session branching needs (unit U-004). Split
// out of amphetamine_agent_session.ts so this module can stay import-safe.
//
// amphetamine_agent_session.ts carries the DR-0114 shape (shebang, `process.exit(main())` with
// no isMainModule guard) a finished hook body needs. A module that calls `process.exit()`
// unconditionally at its own top level cannot also be imported directly by a `node --test` file:
// under `--test-isolation=process`, the test worker's fd 0 is the runner's own IPC channel, not
// a plain stdin, so a synchronous fd-0 read (readStdin, which main() reaches through session_id
// -> ... -> the hook's stdin payload) inside that top-level call deadlocks the worker rather
// than returning -- confirmed by reproduction, not a guess. hooks/integrations/tests/
// amphetamine-marker.test.ts (unit U-003) already imports this module's marker functions
// directly, the way hooks/_lib/tests/scribe-trigger.test.ts imports scribe_trigger.ts's
// find/shouldPrompt straight rather than through a hook subprocess -- so the functions those
// tests exercise live here, apart from the file that gains the unconditional process.exit call.
// This mirrors the codebase's existing scribe_trigger.ts (pure, hooks/_lib/) / scribe_prompt.ts
// (hook body, hooks/post-bash/) split, one level closer to its single consumer since nothing
// outside amphetamine_agent_session.ts reaches for these.
import { closeSync, openSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../_lib/hook_payload.ts";

/** How fresh a marker's mtime has to be to count as live. Mirrors amphetamine_agent_session.py's
 * _fresh, and STALE_MINUTES is that module's own constant for _sweep's cutoff. */
export const STALE_MINUTES = 480;

/** Whether path's mtime falls inside the last `minutes`. Mirrors amphetamine_agent_session.py's
 * _fresh, which reads OSError (a marker removed mid-check) as not fresh. */
export function fresh(path: string, minutes: number): boolean {
  try {
    return Date.now() - statSync(path).mtimeMs < minutes * 60_000;
  } catch {
    return false;
  }
}

/** Every entry name directly under dir that starts with prefix. Mirrors
 * amphetamine_agent_session.py's `state_dir.glob(f"{prefix}*")`, which reads a missing
 * directory as no matches rather than an error. */
function markerNames(dir: string, prefix: string): string[] {
  try {
    return readdirSync(dir).filter((name) => name.startsWith(prefix));
  } catch {
    return [];
  }
}

/** Whether any file under stateDir named `${prefix}*` is fresh. Mirrors
 * amphetamine_agent_session.py's _any_fresh. */
export function anyFresh(stateDir: string, prefix: string, minutes: number): boolean {
  return markerNames(stateDir, prefix).some((name) => fresh(join(stateDir, name), minutes));
}

/** Whether any `${prefix}*` marker exists under stateDir, regardless of freshness. Mirrors
 * the `any(state_dir.glob(...))` checks amphetamine_agent_session.py's _release and
 * _foreign_session each make on their own prefix. */
export function anyMarker(stateDir: string, prefix: string): boolean {
  return markerNames(stateDir, prefix).length > 0;
}

/** Whether any "session-" or "bg-" prefixed marker exists under stateDir, regardless of
 * freshness. Mirrors amphetamine_agent_session.py's _markers, which _foreign_session calls to
 * confirm a running session belongs to Claude Code rather than a person: the first process to
 * acquire leaves a marker before any later turn's foreign-session check runs. */
export function hasMarkers(stateDir: string): boolean {
  return anyMarker(stateDir, "session-") || anyMarker(stateDir, "bg-");
}

/** Drops every "session-" and "bg-" prefixed marker under stateDir whose mtime has passed
 * STALE_MINUTES. Mirrors amphetamine_agent_session.py's _sweep. */
export function sweep(stateDir: string): void {
  for (const name of [...markerNames(stateDir, "session-"), ...markerNames(stateDir, "bg-")]) {
    const path = join(stateDir, name);
    if (!fresh(path, STALE_MINUTES)) {
      removeMarker(path);
    }
  }
}

/** Creates path if absent, and on an existing path moves its mtime forward the way Python's
 * Path.touch() does. The append alone leaves an existing file's mtime untouched (a 0-byte
 * write changes nothing an mtime watches), so utimesSync sets it explicitly afterward. */
export function touchMarker(path: string): void {
  closeSync(openSync(path, "a"));
  const now = new Date();
  utimesSync(path, now, now);
}

/** Removes path, silent when it is already gone. Mirrors Python's
 * `Path.unlink(missing_ok=True)`: settings.json fires this hook's PostToolUse matcher `*` in
 * every Claude Code process, so a concurrent release from another process can already have
 * removed the same marker by the time this one gets to it. */
export function removeMarker(path: string): void {
  rmSync(path, { force: true });
}

/** The session a call belongs to, or null when this hook should ignore it. Mirrors
 * amphetamine_agent_session.py's session_id: acquire and release open and close the main
 * turn, so a subagent-born call would double count them, while background exists for the
 * opposite reason -- only a subagent or a Workflow/Agent spawn tells this hook that work
 * outlives the turn. */
export function sessionId(payloadText: string, action: string): string | null {
  const payload = parse(payloadText);
  const fromAgent = Boolean(payload.agent_id);
  if (action === "background") {
    if (!fromAgent && payload.tool_name !== "Workflow" && payload.tool_name !== "Agent") {
      return null;
    }
  } else if (fromAgent) {
    return null;
  }
  const value = payload.session_id;
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
}
