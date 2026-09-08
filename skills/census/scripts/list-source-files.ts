#!/usr/bin/env node
/// <reference types="node" />
// Usage: list-source-files.ts <repo-root>
// Output: "<lines> <path>" per line, source files largest-first.
// exit: 0 on a normal listing, 2 with no argument.
//
// TypeScript port of the retired Python original, mirroring skills/outcome/scripts/validate-outcome.ts's
// own header shape and its isMainModule(import.meta.url) entry point. Carries the EXTS / PRUNE /
// source_files / count_lines / main port, in node:* only.
//
// Contract: this script's own behavior, pinned by the fixture below. Exercised by
// skills/census/tests/list-source-files.test.ts, replayed from
// skills/census/tests/fixtures/list-source-files-cases.json.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

export const EXTS = [
  ".rs",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".swift",
] as const;
export const PRUNE = new Set(["target", "node_modules", ".git"]);

/** Every file under `dir` whose name ends in one of EXTS, walked depth-first with any
 * directory named in PRUNE left unvisited -- the TS mirror of os.walk's dirnames[:] = [...]
 * pruning, which also stops nothing but recursion into that directory. */
export function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (PRUNE.has(entry.name)) continue;
      found.push(...sourceFiles(full));
    } else if (entry.isFile() && EXTS.some((ext) => entry.name.endsWith(ext))) {
      found.push(full);
    }
  }
  return found;
}

/** The file's line count (binary-mode line splits, so a missing trailing newline still counts
 * the last partial line), or null when the file cannot be read -- a permission error or a
 * broken symlink must not stop the rest of the listing. */
export function countLines(path: string): number | null {
  let content: Buffer;
  try {
    content = readFileSync(path);
  } catch {
    return null;
  }
  if (content.length === 0) return 0;
  let lines = 0;
  for (const byte of content) {
    if (byte === 0x0a) lines++;
  }
  if (content[content.length - 1] !== 0x0a) lines++;
  return lines;
}

export function main(argv: readonly string[]): number {
  if (argv.length < 1) {
    process.stderr.write("usage: list-source-files.ts <repo-root>\n");
    return 2;
  }
  const results: Array<[lines: number, path: string]> = [];
  for (const path of sourceFiles(argv[0])) {
    const lines = countLines(path);
    if (lines !== null) results.push([lines, path]);
  }
  // sorted(results, reverse=True) on Python's (lines, path) tuples: descending on lines, and
  // ties settle descending on path too -- reverse=True flips the whole tuple comparison, not
  // just its first element.
  results.sort(([linesA, pathA], [linesB, pathB]) => linesB - linesA || (pathA < pathB ? 1 : -1));
  for (const [lines, path] of results) {
    process.stdout.write(`${lines} ${path}\n`);
  }
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
