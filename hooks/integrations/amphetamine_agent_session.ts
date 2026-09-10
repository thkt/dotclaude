/// <reference types="node" />
// The TypeScript port of hooks/integrations/amphetamine_agent_session.py's session-marker
// primitives (unit U-003): _fresh, _any_fresh, _sweep, and the marker read/write pathlib calls
// the Python original inlines (`marker.touch()`, `path.unlink(missing_ok=True)`). session_id,
// _foreign_session, _release, run and main -- the osascript-driving CLI dispatch -- stay out of
// this file for now; this unit's contract and its three test scenarios (T-393..T-395) cover only
// the mtime plumbing, so the shebang + `process.exit(main())` shape DR-0114 asks of a finished
// hook body (hooks/lifecycle/recall_index.ts's shape) lands with the unit that adds that dispatch.
//
// Python's Path.touch() bumps the mtime of a file that already exists; this module's
// closeSync(openSync(p, "a")) does not, because a 0-byte append changes nothing an mtime watches.
// touchMarker calls utimesSync explicitly afterward to close that gap.
// removeMarker mirrors Python's `Path.unlink(missing_ok=True)` with `rmSync(path, { force:
// true })`, which stays quiet for a path already gone.
import { closeSync, openSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { join } from "node:path";

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
