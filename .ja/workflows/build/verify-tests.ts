#!/usr/bin/env node
/// <reference types="node" />
// Usage: verify-tests.ts   (test-presence checks JSON を stdin で受ける)
//
// plan の test 言明 (T-NNN name) がそれぞれ、対応する unit のファイルのどれかに存在することを
// 決定的に検証する。code.js は実装に対して scenario name をそのまま test name として使うよう
// 指示しているので、fixed-string 検索が「この planned test が実際に書かれたか」の存在チェックに
// なる。
//
// stdin:  JSON array の {files, names} -- plan unit ごとに 1 件。files は repo-root からの
//         相対パス (unit 自身のファイル、test を含む)。names はその unit の T-NNN 言明。
// stdout: JSON {results: [{name, found}]}、names を入力順に flatten したもの。
//           found = files のいずれかが読める通常ファイルで、その中に name が literal
//                   (regex ではない) に、空白の違いを無視して出現すること
// exit 0 は完了した run (verdict は JSON から読む)。exit 1 は usage / parse エラー --
// fail-closed: 壊れた payload を「全 statement が present」として黙って扱うことはない。
// 表出させる判定 (found=false -> PR) は build.js 側に残る。
//
// 置き換え元の Python 版 test-presence verifier の TypeScript 移植。Contract: この CLI 自身の
// 挙動。workflows/build/tests/verify-tests.test.ts が、固定 fixture
// workflows/build/tests/fixtures/verify-tests-cases.json に対してエンドツーエンドで検査する。
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseJson } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

interface VerifyTestsResult {
  name: string;
  found: boolean;
}

// textlint は issue body の markdown で半角と全角の間に空白を入れる ("0件" が "0 件" になる) が、
// test file の string literal はそのまま。plan は issue body から読むので、空白を落とさずに
// 比較すると既存の test を found=false と報告してしまう。\s は全角空白 (U+3000) も含む。
// Python の re.compile(r"\s+") と対応する。
const WHITESPACE = /\s+/g;

/** Python 版 verifier の `squeeze` をそのまま写す: 空白の連続 (全角空白を含む) を全て落とし、
 * name とファイル内容を空白の違いを無視して比較できるようにする。 */
export function squeeze(text: string): string {
  return text.replace(WHITESPACE, "");
}

/** Python 版 verifier の `read_text` をそのまま写す: ファイルの text、存在しない・読めない
 * ときは "" (fail-closed)。 */
export function readText(root: string, path: string): string {
  const target = join(root, path);
  try {
    if (!existsSync(target) || !statSync(target).isFile()) return "";
    return readFileSync(target, "utf8");
  } catch {
    return "";
  }
}

/** Python 版 verifier の `_strings` をそのまま写す: 配列でない値は文字列を 1 つも産まない。
 * 配列の中では truthy な item だけが変換対象になる (`str(item) for item in value if item`) --
 * `Boolean(item)` が、`names` と `files` entry が取りうる JSON の scalar/array/object の形に
 * 対して Python の truthiness をそのまま写している。 */
function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter((item) => Boolean(item)).map((item) => String(item));
}

/** Python 版 verifier の `run` をそのまま写す: {files, names} entry ごとに names を入力順に
 * flatten し、files のいずれかの squeeze 済み内容が squeeze 済み name を含んでいれば found と
 * する。非 object の entry は skip する (`if not isinstance(entry, dict): continue` に対応)。
 * 空白だけの name は squeeze すると "" になり、どのファイルの squeeze 済み内容にも自明に
 * 含まれてしまうため、found=false に強制する。 */
export function run(root: string, checks: readonly unknown[]): VerifyTestsResult[] {
  const results: VerifyTestsResult[] = [];
  for (const entry of checks) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const mapping = entry as Record<string, unknown>;
    const files = strings(mapping.files);
    const names = strings(mapping.names);
    const contents = files.map((file) => squeeze(readText(root, file)));
    for (const name of names) {
      const needle = squeeze(name);
      results.push({
        name,
        found: needle !== "" && contents.some((content) => content.includes(needle)),
      });
    }
  }
  return results;
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const parsed = parseJson(raw);
  if ("error" in parsed) {
    process.stderr.write(`Error: checks is not valid JSON: ${parsed.error}\n`);
    return 1;
  }
  const loaded = parsed.value;
  if (!Array.isArray(loaded)) {
    process.stderr.write("Error: checks must be a JSON array of {files, names}\n");
    return 1;
  }
  const results = run(process.cwd(), loaded);
  process.stdout.write(`${JSON.stringify({ results })}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
