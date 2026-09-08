#!/usr/bin/env node
/// <reference types="node" />
// Usage: list-source-files.ts <repo-root>
// Output: "<lines> <path>" per line, source files largest-first.
// exit: 0 on a normal listing, 2 with no argument.
//
// 退役した Python 版からの TypeScript 移植。skills/outcome/scripts/validate-outcome.ts
// 自身の header の形と isMainModule(import.meta.url) という entry point をそのまま
// 踏襲する。EXTS / PRUNE / source_files / count_lines / main を
// node:* のみで移植する。
//
// Contract: このスクリプト自身の振る舞い。下記の fixture が固定する。
// skills/census/tests/list-source-files.test.ts が検証し、
// skills/census/tests/fixtures/list-source-files-cases.json から再生する。
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

/** `dir` 配下で名前が EXTS のいずれかで終わるファイルをすべて、PRUNE に名前のある
 * ディレクトリを未訪問のまま残しつつ深さ優先で歩く -- os.walk の dirnames[:] = [...] と
 * 同じ枝刈りの TS 版で、そちらもそのディレクトリへの再帰だけを止める。 */
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

/** そのファイルの行数 (バイナリモードでの改行分割なので、末尾の改行が無くても最後の
 * 部分行を数える)。読めないときは null -- 権限エラーや切れたシンボリックリンク 1 本で
 * 残りの一覧を止めてはならない。 */
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
  // Python の (lines, path) タプルに対する sorted(results, reverse=True): lines は降順、
  // 同点は path も降順で解決する -- reverse=True はタプル比較全体を反転させるのであって、
  // 先頭要素だけを反転させるのではない。
  results.sort(([linesA, pathA], [linesB, pathB]) => linesB - linesA || (pathA < pathB ? 1 : -1));
  for (const [lines, path] of results) {
    process.stdout.write(`${lines} ${path}\n`);
  }
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
