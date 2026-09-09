#!/usr/bin/env node
/// <reference types="node" />
// Usage: find-prior-research.ts <slug> <search-dir>
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
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

export interface Candidate {
  file: string;
  shared: number;
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

/** Python の Path.is_file() と同じ扱い。壊れた symlink や読めない親ディレクトリによる OSError
 * は、走査を止めるのではなく「ファイルではない」として読む。statSync はそこで送出する。 */
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
  // Python の Path("").is_dir() はカレントディレクトリを読む。readdirSync(".") はそれに合わせる。
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
  // shared 降順。同点はファイル名の昇順で解決する (header 参照)。
  // 退役した Python 版自身のファイルシステム依存な iterdir() 到着順ではない。
  candidates.sort((a, b) => b.shared - a.shared || a.file.localeCompare(b.file));

  process.stdout.write(`${JSON.stringify({ candidates, slug_words: slugWords.size }, null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
