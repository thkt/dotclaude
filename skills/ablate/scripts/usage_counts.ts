#!/usr/bin/env node
/// <reference types="node" />
// Usage: usage_counts.ts <transcripts-root>
//
// TypeScript port of skills/ablate/scripts/usage_counts.py: FIRE_EVENTS, ELEMENT_SUFFIXES,
// RARE_BY_DESIGN, MEASUREMENT_WINDOW_DAYS, element_path, _parse_date, _iter_fires, count_usage,
// classify, main. Constant and function names stay exactly as usage_counts.py declares them,
// the same no-camelCase convention arms.ts, verdict.ts, dr_gate.ts and enforcer_map.ts hold in
// this same directory.
//
// usage_counts.py imports UNMEASURED from arms.py and DELETE_CANDIDATE/NEEDS_HUMAN_JUDGMENT
// from verdict.py; this port carries the same import, the same reuse verdict.ts already made
// for UNMEASURED.
//
// Deviation from usage_counts.py: classify's docstring there (usage_counts.py:169) says it
// "reads RARE_BY_DESIGN and MEASUREMENT_WINDOW_DAYS from the module namespace rather than as
// captured defaults, so patching either at run time changes the verdict returned" --
// unittest.mock.patch.object rebinding a module-level name. An ESM import binding cannot be
// rebound the same way from a test file (map_all/target_files in enforcer_map.ts hit the same
// wall), so this port carries MEASUREMENT_WINDOW_DAYS as classify's own `window_days`
// parameter (defaulting to the module constant) instead: a caller drives both sides of the
// boundary by passing a different value, not by patching a binding. RARE_BY_DESIGN stays a
// module-level export, read directly, unchanged.
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";
import { pythonJsonStringify } from "../../_lib/python_json.ts";
import { UNMEASURED } from "./arms.ts";
import { DELETE_CANDIDATE, NEEDS_HUMAN_JUDGMENT } from "./verdict.ts";

// The plan's contract also names "hookSpecificOutput" records. No attachment sampled in this
// session carried that key, so reading it is deferred rather than guessed at.
export const FIRE_EVENTS: ReadonlySet<string> = new Set(["PreToolUse", "PostToolUse"]);

// A `command` carries the lead-in the harness invoked it through: a path running through the
// .claude directory, or one starting from an unexpanded plugin variable. A harness element is
// named repo-root-relative, so without dropping that lead-in neither RARE_BY_DESIGN nor
// harness_elements' population matches a single key.
const _CLAUDE_DIR_MARKER = "/.claude/";
const _VARIABLE_PREFIX_RE = /^\$\{[A-Z_]+\}\//;

// The suffixes that count as an element. Some fires carry a label instead of a path, and a
// label names no harness element, so it stays out of the tally.
export const ELEMENT_SUFFIXES: ReadonlySet<string> = new Set([".py", ".sh", ".js", ".ts"]);

// Safety nets exercised only on an uncommon input, where zero fires must not read as unused.
export const RARE_BY_DESIGN: ReadonlySet<string> = new Set(["hooks/security/rm_to_trash.ts"]);

// How many days back from `now` a most-recent fire still counts as observed.
export const MEASUREMENT_WINDOW_DAYS = 90;

export interface ElementUsage {
  fires: number;
  // ISO date (YYYY-MM-DD) of the most recent fire, or null when the element never fired.
  last_used: string | null;
}

export interface UsageResult {
  elements: Record<string, ElementUsage>;
  transcript_count: number;
  date_range: { start: string | null; end: string | null };
}

/** The last "/"-separated segment's suffix, the way PurePosixPath(text).suffix reads it: the
 * trailing ".ext" when the dot sits strictly inside the segment, "" otherwise (a leading dot,
 * as in ".hidden", carries no suffix either). */
function _posix_suffix(text: string): string {
  const name = text.slice(text.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot) : "";
}

/** The repo-root-relative path of the element `command` fired, or null when it names no
 * element. An absolute path, or one still leading with an unexpanded variable, has no
 * repo-root-relative form, so it too returns null. */
export function element_path(command: string): string | null {
  const trimmed = command.trim();
  const cut = trimmed.indexOf(_CLAUDE_DIR_MARKER);
  const text =
    cut !== -1
      ? trimmed.slice(cut + _CLAUDE_DIR_MARKER.length)
      : trimmed.replace(_VARIABLE_PREFIX_RE, "");
  if (!text || "~$/".includes(text[0])) {
    return null;
  }
  if (!ELEMENT_SUFFIXES.has(_posix_suffix(text))) {
    return null;
  }
  return text;
}

/** The calendar date (YYYY-MM-DD) a transcript timestamp ("2026-08-01T00:00:00.000Z") falls
 * on, or null when the value does not start with a valid ISO date (one malformed record must
 * not stop the read, matching usage_counts.py's report.py-style per-line tolerance). */
function _parse_date(timestamp: string): string | null {
  const candidate = timestamp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return null;
  }
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  // An out-of-range calendar date (e.g. "2026-02-30") rolls forward under Date's own
  // normalization instead of throwing, so re-formatting and comparing catches it the way
  // Python's strptime rejects it by raising ValueError.
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? null
    : candidate;
}

/** Yields [element_path, fire_date] once per PreToolUse/PostToolUse fire record in one
 * transcript file. A malformed or incomplete record contributes nothing rather than raising:
 * another process writes the transcript while this reads it, so a partial last line is
 * expected. */
function _iter_fires(path: string): Iterable<[string, string]> {
  const fires: [string, string][] = [];
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record === null || typeof record !== "object" || Array.isArray(record)) continue;
    const attachment = (record as Record<string, unknown>).attachment;
    if (attachment === null || typeof attachment !== "object" || Array.isArray(attachment)) {
      continue;
    }
    const attachmentFields = attachment as Record<string, unknown>;
    if (!FIRE_EVENTS.has(attachmentFields.hookEvent as string)) continue;
    const command = attachmentFields.command;
    const timestamp = (record as Record<string, unknown>).timestamp;
    if (typeof command !== "string" || typeof timestamp !== "string") continue;
    const element = element_path(command);
    if (element === null) continue;
    const fireDate = _parse_date(timestamp);
    if (fireDate === null) continue;
    fires.push([element, fireDate]);
  }
  return fires;
}

/** Scans every `*.jsonl` transcript under `root` and tallies fires per element. An element's
 * key is the repo-root-relative path element_path returns. */
export function count_usage(root: string): UsageResult {
  const transcripts = globSync("**/*.jsonl", { cwd: root }).sort();
  const elements: Record<string, ElementUsage> = {};
  let start: string | null = null;
  let end: string | null = null;

  for (const relative of transcripts) {
    let fires: Iterable<[string, string]>;
    try {
      fires = _iter_fires(join(root, relative));
    } catch {
      // One unreadable transcript must not stop the count over the rest.
      continue;
    }
    for (const [element, fireDate] of fires) {
      const entry = (elements[element] ??= { fires: 0, last_used: null });
      entry.fires += 1;
      if (entry.last_used === null || fireDate > entry.last_used) {
        entry.last_used = fireDate;
      }
      if (start === null || fireDate < start) start = fireDate;
      if (end === null || fireDate > end) end = fireDate;
    }
  }

  return {
    elements,
    transcript_count: transcripts.length,
    date_range: { start, end },
  };
}

// Read top to bottom; take the first row that matches. The order is load-bearing twice over:
// RARE_BY_DESIGN sits above the zero-fires row so a rare element never reaches
// DELETE_CANDIDATE, and the last_used check sits under `fires > 0` because zero fires always
// pairs with last_used=null, which a row above would swallow into UNMEASURED and leave
// DELETE_CANDIDATE unreachable.
//
// | Condition | Verdict |
// | --- | --- |
// | path is in RARE_BY_DESIGN | NEEDS_HUMAN_JUDGMENT |
// | fires > 0 and last_used is null (inconsistent input) | UNMEASURED |
// | fires > 0 and last_used falls outside window_days | UNMEASURED |
// | fires > 0 and last_used falls inside window_days | NEEDS_HUMAN_JUDGMENT |
// | fires == 0 | DELETE_CANDIDATE |
/** Assigns one element's usage observation a verdict, per the table above. `window_days`
 * replaces usage_counts.py's module-namespace read of MEASUREMENT_WINDOW_DAYS -- see the
 * header deviation note above. */
export function classify(
  path: string,
  fires: number,
  last_used: string | null,
  now: Date,
  window_days: number = MEASUREMENT_WINDOW_DAYS,
): string {
  if (RARE_BY_DESIGN.has(path)) {
    return NEEDS_HUMAN_JUDGMENT;
  }
  if (fires > 0) {
    if (last_used === null) {
      return UNMEASURED;
    }
    const lastUsedMs = Date.parse(`${last_used}T00:00:00.000Z`);
    const days = Math.round((now.getTime() - lastUsedMs) / (24 * 60 * 60 * 1000));
    if (days > window_days) {
      return UNMEASURED;
    }
    return NEEDS_HUMAN_JUDGMENT;
  }
  return DELETE_CANDIDATE;
}

// The wire format has to follow json.dumps' byte-for-byte spacing, not JSON.stringify's default
// -- see python_json.ts's header for why, and for the shared encoder every CLI in this family
// reuses instead of hand-building its own braces.
export function main(argv: string[]): number {
  if (argv.length !== 1) {
    process.stderr.write("usage: usage_counts.ts <transcripts-root>\n");
    return 2;
  }
  process.stdout.write(`${pythonJsonStringify(count_usage(argv[0]))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
