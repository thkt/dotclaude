#!/usr/bin/env node
/// <reference types="node" />
// Usage: find-prior-research.ts <slug|--all> <search-dir> [legacy-dir ...]
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
// Multiple roots or --all return path and aliases. Only identical same-name originals collapse; differing versions remain visible.

import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

export interface Candidate {
  file: string;
  shared: number;
  path?: string;
  aliases?: string[];
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

/** Only regular files are originals; symlinks and unreadable paths do not stop the scan. */
function isFile(path: string): boolean {
  try {
    return lstatSync(path).isFile();
  } catch {
    return false;
  }
}

function withinRepository(path: string, repositoryRoot: string): boolean {
  const resolved = relative(repositoryRoot, realpathSync(path));
  return resolved !== ".." && !resolved.startsWith(`..${sep}`) && !isAbsolute(resolved);
}

function entries(directory: string, recursive: boolean, repositoryRoot: string): string[] {
  try {
    if (!lstatSync(directory).isDirectory() || !withinRepository(directory, repositoryRoot))
      return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      recursive && entry.isDirectory()
        ? entries(join(directory, entry.name), true, repositoryRoot).map((name) =>
            join(entry.name, name),
          )
        : [entry.name],
    );
  } catch {
    return [];
  }
}

function candidateFor(
  root: string,
  name: string,
  all: boolean,
  slugWords: Set<string>,
): Candidate | null {
  if (!name.endsWith(".md") || (all && basename(name) === "README.md")) return null;
  const path = join(root, name);
  if (!isFile(path)) return null;
  const stem = name.slice(0, -".md".length).replace(DATE_PREFIX, "");
  const shared = intersectionSize(slugWords, words(stem));
  return !all && shared === 0 ? null : { file: name, shared };
}

function recordOriginal(row: Candidate, root: string, originals: Map<string, Candidate>): boolean {
  const path = join(root, row.file);
  const identity = `${row.file}\0${readFileSync(path, "utf8")}`;
  const prior = originals.get(identity);
  if (prior) {
    prior.aliases?.push(path);
    return false;
  }
  row.path = path;
  row.aliases = [path];
  originals.set(identity, row);
  return true;
}

export function main(argv: readonly string[]): number {
  const all = argv[0] === "--all";
  const slugWords = words(all ? "" : (argv[0] ?? ""));
  const roots = argv.length > 1 ? argv.slice(1).map((root) => root || ".") : ["."];
  const includePaths = roots.length > 1 || all;
  const candidates: Candidate[] = [];
  const repositoryRoot = realpathSync(".");
  const originals = new Map<string, Candidate>();
  for (const root of roots) {
    for (const name of entries(root, all, repositoryRoot)) {
      const row = candidateFor(root, name, all, slugWords);
      if (row && (!includePaths || recordOriginal(row, root, originals))) candidates.push(row);
    }
  }
  candidates.sort((a, b) => b.shared - a.shared || a.file.localeCompare(b.file));
  process.stdout.write(`${JSON.stringify({ candidates, slug_words: slugWords.size }, null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
