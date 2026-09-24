#!/usr/bin/env node
/// <reference types="node" />
// Usage: find-prior-research.ts <slug|--all> <search-dir> [legacy-dir ...]
//
// slug の語とファイル名の語の重なり数を数え、重なりを持つ .md ファイルをすべて返す。
// ファイル名の日付プレフィックス (YYYY-MM-DD-) は照合の対象から外れる。
//
// stdout: JSON { candidates: [{file, shared}, ...], slug_words: int }
//   candidates: shared 降順。同点はファイル名の昇順で解決する。退役した Python 版
//   自身の同点順は Path.iterdir() のディレクトリ順に乗っており、ファイルシステム間で
//   安定しないため、この移植ではその不安定さを再現せず順序を固定する。
// exit: 0
//
// 退役した Python 版からの TypeScript 移植。skills/outcome/scripts/validate-outcome.ts
// 自身の header と isMainModule(import.meta.url) という entry point の形をそのまま
// 踏襲する。DATE_PREFIX / words / main を node:* のみで移植する。
//
// Contract: このスクリプト自身の振る舞い。下記の fixture が固定する。
// skills/research/tests/find-prior-research.test.ts が検証し、
// skills/research/tests/fixtures/find-prior-research-cases.json (U-001) から再生する。
//
// 複数 root または --all は path と aliases を返す。同名・原文同一だけをまとめ、版が異なる原本は残す。

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

/** text を "-" 区切りで語集合にしたもの。 */
function words(text: string): Set<string> {
  return new Set(text.split("-").filter((w) => w !== ""));
}

/** `a` の要素のうち `b` にも入っている個数。 */
function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const word of a) {
    if (b.has(word)) count++;
  }
  return count;
}

/** 通常ファイルだけを原本とし、symlink や読めないパスでは走査を止めない。 */
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
