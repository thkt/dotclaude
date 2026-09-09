#!/usr/bin/env node
/// <reference types="node" />
// Usage: find-prior-research.ts <slug> <search-dir>
//
// Counts how many words a filename shares with the slug and returns every .md file with an
// overlap. A filename's date prefix (YYYY-MM-DD-) stays out of the matching.
//
// stdout: JSON { candidates: [{file, shared}, ...], slug_words: int }
//   candidates: shared descending; ties settle by file name ascending. The retired Python
//   original's own tie order rode on Path.iterdir()'s directory order, which is not stable
//   across filesystems, so this port fixes the order instead of reproducing that instability.
// exit: 0
//
// TypeScript port of the retired Python original, mirroring skills/outcome/scripts/validate-outcome.ts's
// own header and its isMainModule(import.meta.url) entry point. Carries the DATE_PREFIX / words /
// main port, in node:* only.
//
// Contract: this script's own behavior, pinned by the fixture below. Exercised by
// skills/research/tests/find-prior-research.test.ts, replayed from
// skills/research/tests/fixtures/find-prior-research-cases.json (U-001).
//
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

export interface Candidate {
  file: string;
  shared: number;
}

/** The set of words in text, split on "-". */
function words(text: string): Set<string> {
  return new Set(text.split("-").filter((w) => w !== ""));
}

/** How many members of `a` also sit in `b`. */
function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const word of a) {
    if (b.has(word)) count++;
  }
  return count;
}

/** Python's Path.is_file(): an OSError -- a broken symlink, an unreadable parent -- reads as
 * "not a file" rather than stopping the scan, where statSync throws. */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function main(argv: readonly string[]): number {
  const slug = argv[0] ?? "";
  const searchDir = argv[1] ?? "";
  const slugWords = words(slug);

  const candidates: Candidate[] = [];
  // Python's Path("").is_dir() reads the current directory; readdirSync(".") matches that.
  const dirPath = searchDir === "" ? "." : searchDir;
  let entries: string[] = [];
  try {
    if (statSync(dirPath).isDirectory()) {
      entries = readdirSync(dirPath);
    }
  } catch {
    entries = [];
  }
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const filePath = join(dirPath, name);
    if (!isFile(filePath)) continue;
    const stem = name.slice(0, -".md".length).replace(DATE_PREFIX, "");
    const shared = intersectionSize(slugWords, words(stem));
    if (shared > 0) candidates.push({ file: name, shared });
  }
  // shared descending; ties settle by file name ascending (see header) rather than
  // the retired Python original's own filesystem-dependent iterdir() arrival order.
  candidates.sort((a, b) => b.shared - a.shared || a.file.localeCompare(b.file));

  process.stdout.write(`${JSON.stringify({ candidates, slug_words: slugWords.size }, null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
