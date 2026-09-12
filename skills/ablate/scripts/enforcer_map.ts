#!/usr/bin/env node
/// <reference types="node" />
// Usage: enforcer_map.ts <repo-root>, invoked directly (skills/dr/scripts/update-index.ts's
// shape) rather than imported the way report.ts will import verdict.ts and dr_gate.ts.
// Output: JSON array of {file, line_number, verdict, enforcer?} to stdout, one entry per
// non-blank line across the always-loaded files, file order then line order.
//
// TypeScript port of skills/ablate/scripts/enforcer_map.py: DELETE_CANDIDATE,
// ABLATION_RESIDUE, ENFORCER_TABLE, classify_line, classify_file, target_files, map_all, main.
// Constant and function names stay exactly as enforcer_map.py declares them, the same
// no-camelCase convention arms.ts, verdict.ts and dr_gate.ts hold in this same directory.
//
// DELETE_CANDIDATE is declared locally rather than imported from ./verdict.ts: enforcer_map.py
// never imports verdict.py either, and report.py:90 compares enforcer_map's and verdict's
// verdicts to each other by string value alone, never by shared identity. A local constant
// keeps this port's import graph the same shape as the Python module it mirrors.
//
// map_all takes an optional targetFiles override: enforcer_map_test.py substitutes a fake
// target_files/harness_elements result with unittest.mock.patch.object, which rebinds a name
// inside the imported module. An ESM namespace import cannot be rebound the same way from
// outside, so the override is threaded through as an explicit parameter instead.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";
import { ALWAYS_LOADED, enumerate_elements } from "../../_lib/harness_elements.ts";
import { pythonJsonStringify } from "../../_lib/python_json.ts";

export const DELETE_CANDIDATE = "delete-candidate";
export const ABLATION_RESIDUE = "ablation-residue";

// The MIRROR.md "Prose language" row's exact text, held apart from ENFORCER_TABLE below so the
// object literal's key can be an expression -- JS, unlike Python, does not auto-concatenate
// adjacent string literals, and a computed key needs an expression to compute.
const PROSE_LANGUAGE_ROW =
  "| Prose language | Japanese under `.ja/`, English everywhere else. Covers comments, " +
  "test names, and assertion messages                                                   |";

// An always-loaded line's exact text -> the enforcer that already guarantees it. A rule whose
// enforcer could not be confirmed stays out rather than being guessed at, so an absent line
// reports as ABLATION_RESIDUE instead of as coverage nobody checked. Copied from
// enforcer_map.py's ENFORCER_TABLE unchanged.
export const ENFORCER_TABLE: Record<string, string> = {
  // settings.json registers the guard as the PostToolUse Edit/Write hook on both trees, and
  // hooks/_lib/mirror_prose.ts's warning cites "(MIRROR.md)" for this exact violation.
  [PROSE_LANGUAGE_ROW]: "hooks/edit/mirror_prose_guard.ts",
};

/** One classified line of an always-loaded file. `enforcer` is present only when `verdict` is
 * DELETE_CANDIDATE, matching enforcer_map.py's classify_file, which sets the key only in that
 * branch rather than carrying it as `null` on every entry. */
export interface EnforcerMapEntry {
  file: string;
  line_number: number;
  verdict: string;
  enforcer?: string;
}

/** DELETE_CANDIDATE when an enforcer already guarantees `line`, ABLATION_RESIDUE otherwise.
 * Residue is not a keep verdict: it says removing the line would drop a guarantee nothing else
 * replaces. */
export function classify_line(line: string): string {
  return line in ENFORCER_TABLE ? DELETE_CANDIDATE : ABLATION_RESIDUE;
}

/** Classifies every non-blank line of one target file, in file order. A blank line carries no
 * rule to map, so it is skipped rather than reported as residue. */
export function classify_file(root: string, rel_path: string): EnforcerMapEntry[] {
  const text = readFileSync(join(root, rel_path), "utf8");
  const results: EnforcerMapEntry[] = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim() === "") continue;
    const verdict = classify_line(line);
    const entry: EnforcerMapEntry = { file: rel_path, line_number: index + 1, verdict };
    if (verdict === DELETE_CANDIDATE) {
      entry.enforcer = ENFORCER_TABLE[line];
    }
    results.push(entry);
  }
  return results;
}

/** The repo-root-relative paths `root`'s harness always loads into every session's context.
 * Derived at run time rather than held as a tuple, the same reason enforcer_map.py's own
 * target_files gives. */
export function target_files(root: string): string[] {
  return enumerate_elements(root)
    .filter((element) => element.classification === ALWAYS_LOADED)
    .map((element) => element.path);
}

/** Classifies every non-blank line across the always-loaded files, file order then line order.
 * When `targetFiles` is given, it replaces the `target_files(root)` scan -- the injection
 * enforcer_map_test.py reaches through unittest.mock.patch.object instead. */
export function map_all(root: string, targetFiles?: readonly string[]): EnforcerMapEntry[] {
  const results: EnforcerMapEntry[] = [];
  for (const rel_path of targetFiles ?? target_files(root)) {
    results.push(...classify_file(root, rel_path));
  }
  return results;
}

// The wire format has to follow json.dumps' byte-for-byte spacing, not JSON.stringify's default
// -- see python_json.ts's header for why, and for the shared encoder every CLI in this family
// reuses instead of hand-building its own braces.
export function main(argv: string[]): number {
  if (argv.length !== 1) {
    process.stderr.write("usage: enforcer_map.ts <repo-root>\n");
    return 2;
  }
  process.stdout.write(`${pythonJsonStringify(map_all(argv[0]))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
