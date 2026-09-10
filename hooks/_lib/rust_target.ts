/// <reference types="node" />
// Shared .rs handling for the rust-*-edit hooks (docs/decisions/0112-adopt-typescript-for-
// helper-scripts.md, unit U-001): target, clippyOutput, fmt, and MAX_FINDINGS carry over from
// this module's retired Python predecessor.
//
// One deliberate divergence from that predecessor: Python's subprocess.run raises
// FileNotFoundError when a binary is missing, and the predecessor let it propagate uncaught.
// node:child_process's spawnSync never throws for that case -- it returns `{ error, status:
// null }` instead (the same status:null-reads-as-nothing-to-report shape the retired
// rumdl-check hook's subprocess.run/FileNotFoundError catch established for its own
// missing-binary case). This module reads status === null as "nothing to report" rather than
// reintroducing a throw, so a missing cargo stays a silent hook here exactly as it is meant to.
import { spawnSync } from "node:child_process";
import { basename, dirname, relative, resolve } from "node:path";
import { editedFile } from "./hook_payload.ts";

// How many findings reach the context. clippy covers the whole workspace, so the edited
// file's own findings move to the front before this cut drops the rest.
export const MAX_FINDINGS = 40;

// Node's spawnSync default maxBuffer is 1 MiB (undocumented by default in the type but
// documented in the child_process guide); a workspace-wide `cargo clippy` run can print past
// that well before MAX_FINDINGS gets a chance to trim it, which would silently drop findings
// on a large workspace. Bounded rather than unbounded so a runaway process still can't exhaust
// memory -- the same reasoning workflows/_lib/gate.ts's observeCommand documents for its own
// maxBuffer choice.
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

/** Splits on "\n" the way Python's str.splitlines() does for "\n"-only text: a trailing
 * newline produces no trailing empty element. Node's plain `.split("\n")` does produce one,
 * which would otherwise land as a spurious empty line in `others` below. */
function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

/** The cargo workspace root and the edited file, as [root, file], or null when cargo has
 * nothing to do. */
export function target(payloadText: string): [string, string] | null {
  const path = editedFile(payloadText);
  if (path === null || !path.endsWith(".rs")) {
    return null;
  }
  const result = spawnSync("git", ["-C", dirname(path), "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  const root = (result.stdout ?? "").trim();
  if (result.status !== 0 || !root) {
    return null;
  }
  return [root, path];
}

/** file's path relative to root, or file's own basename when it does not resolve under root
 * (a symlinked root in the payload vs. the real path git prints): the name alone still matches
 * most findings, and losing the sort beats raising out of a hook. */
function relativeToRoot(root: string, file: string): string {
  const rel = relative(resolve(root), resolve(file));
  return rel.startsWith("..") ? basename(file) : rel;
}

/** The edited file's own clippy findings first, then the rest, cut to MAX_FINDINGS after the
 * whole run is collected -- never on a partial read. */
function findings(root: string, file: string): string {
  const relativePath = relativeToRoot(root, file);
  // short format so the cut counts findings, not the source excerpts the default format wraps
  // around each one.
  const result = spawnSync("cargo", ["clippy", "--message-format", "short", "--color", "never"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER_BYTES,
  });
  if (result.status === null) {
    // No process ran at all (typically ENOENT: cargo absent from PATH). Nothing to report,
    // not a failure -- see the module comment above.
    return "";
  }
  const lines = splitLines((result.stdout ?? "") + (result.stderr ?? ""));
  const edited = lines.filter((line) => line.includes(relativePath));
  const others = lines.filter((line) => !line.includes(relativePath));
  return [...edited, ...others].slice(0, MAX_FINDINGS).join("\n");
}

/** The hook JSON for a clippy run, or null when clippy found nothing to say.
 *
 * Nothing to say beats an empty additionalContext, which costs the reader a turn. */
export function clippyOutput(event: string, root: string, file: string): string | null {
  const found = findings(root, file);
  if (!found.trim()) {
    return null;
  }
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: found,
    },
  });
}

/** Runs cargo fmt in root. The result goes unread, since the edit already landed and a cargo
 * fmt failure has nothing left to stop. */
export function fmt(root: string): void {
  spawnSync("cargo", ["fmt"], { cwd: root, encoding: "utf8" });
}
