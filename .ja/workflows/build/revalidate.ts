#!/usr/bin/env node
/// <reference types="node" />
// Usage: revalidate.ts   (preconditions JSON を stdin で受ける)
//
// plan の precondition を working tree に対して決定的に再検証する。
//
// stdin:  JSON array の {path, pattern?} -- issue の plan が前提とする既存コード。
//         path は process の cwd (repo root) からの相対パス。pattern は任意で、そのファイル
//         に出現することを期待する literal (fixed-string、regex ではない) の substring。
// stdout: JSON {results: [{path, pattern, exists, matches}]}、入力ごとに 1 件、順序も保つ。
//           exists  = path が存在する。pattern があるときは通常ファイルであること
//           matches = pattern が無ければ exists と同じ。あれば exists かつ、ファイルの
//                     bytes に literal pattern が含まれること
// exit 0 は完了した run (verdict は JSON から読む)。exit 1 は usage / parse エラー
// -- fail-closed: 壊れた payload を「全 precondition が pass」として黙って扱うことは
// ない。drift の判定 (exists=false か matches=false のいずれか) は build.js 側に残る。
//
// 置き換え元の Python 版 precondition verifier の TypeScript 移植。Contract: この CLI 自身の
// 挙動。workflows/build/tests/revalidate.test.ts が、固定 fixture
// workflows/build/tests/fixtures/revalidate-cases.json に対してエンドツーエンドで検査する。
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseJson } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

interface VerifyResult {
  path: string;
  pattern: string;
  exists: boolean;
  matches: boolean;
}

/** verify_one の `path = str(mapping.get("path", ""))` をそのまま写す: entry に path key が
 * 無ければ ""、有って文字列ならそのまま、有って null なら Python の str(None) が読む通りの
 * 文字通り "None" になる。null の場合を検査する fixture は無いが、置き換え元への忠実さを
 * 保つためそのまま残す。 */
function pathFrom(mapping: Record<string, unknown>): string {
  if (!("path" in mapping)) return "";
  const value = mapping.path;
  if (value === null) return "None";
  return typeof value === "string" ? value : String(value);
}

/** verify_one の 2 段階の pattern 読み出しをそのまま写す: `raw_pattern =
 * mapping.get("pattern", "")` の後 `"" if raw_pattern is None else str(raw_pattern)`。path と
 * 違い、明示的な null pattern は "None" ではなく "" に正規化される
 * (none_pattern_normalized_to_empty_string fixture case)。 */
function patternFrom(mapping: Record<string, unknown>): string {
  const value = "pattern" in mapping ? mapping.pattern : "";
  if (value === null || value === "") return "";
  return typeof value === "string" ? value : String(value);
}

function isRegularFile(target: string): boolean {
  try {
    return statSync(target).isFile();
  } catch {
    return false;
  }
}

/** `root` に対する precondition 1 件分の verdict。非 object の entry、または読めないファイルは
 * exists/matches ともに false になる (fail-closed)。throw はしない。 */
export function verifyOne(root: string, entry: unknown): VerifyResult {
  const mapping: Record<string, unknown> =
    typeof entry === "object" && entry !== null && !Array.isArray(entry)
      ? (entry as Record<string, unknown>)
      : {};
  const path = pathFrom(mapping);
  const pattern = patternFrom(mapping);
  const target = join(root, path);
  // pattern があるときは通常ファイルであることを要求する (directory は literal match を
  // 持ちえないため)。pattern が無ければ、file でも directory でも存在さえすればよい。
  const exists = path !== "" && (pattern ? isRegularFile(target) : existsSync(target));
  let matches: boolean;
  if (!pattern) {
    matches = exists;
  } else if (!exists) {
    matches = false;
  } else {
    try {
      matches = readFileSync(target).includes(pattern);
    } catch {
      matches = false;
    }
  }
  return { path, pattern, exists, matches };
}

/** `root` に対する precondition 全件の verdict、順序を保つ。 */
export function run(root: string, preconditions: readonly unknown[]): VerifyResult[] {
  return preconditions.map((entry) => verifyOne(root, entry));
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const parsed = parseJson(raw);
  if ("error" in parsed) {
    process.stderr.write(`Error: preconditions is not valid JSON: ${parsed.error}\n`);
    return 1;
  }
  const loaded = parsed.value;
  if (!Array.isArray(loaded)) {
    process.stderr.write("Error: preconditions must be a JSON array of {path, pattern?}\n");
    return 1;
  }
  const results = run(process.cwd(), loaded);
  process.stdout.write(`${JSON.stringify({ results })}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
