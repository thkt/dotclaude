#!/usr/bin/env node
/// <reference types="node" />
// Usage: pre-check.ts "DR Title"
//
// stdout: OUTPUT_KEYS が宣言する順 (status, number, filename, slug, date, dr_dir,
// similar_drs) のキーを持つ JSON (indent 2)。
// stderr: 検証に落ちた内容。exit 1。
//
// 退役した Python 版 pre-check の TypeScript 移植。header/entry の形は
// skills/_lib/harness_hash.ts と skills/dr/scripts/dr_common.ts が既に使っているものと同じ:
// 素直な shebang + reference-types + Usage ヘッダー、テストが直接動かせる部分は named export
// にし、CLI 自身の process.exit(main()) は workflows/_lib/entry-point.ts の isMainModule で
// ガードする。これにより、この module を export 目当てで import しても CLI が副作用として
// 動くことはない。
//
// Contract: 退役した Python 版 pre-check の similarity / first_heading / main。OUTPUT_KEYS は
// json.dumps のキー順に対応し、skills/dr/tests/script-contract.test.js が import する。
// skills/dr/tests/pre-check.test.ts が検証する。
import { accessSync, constants, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fail, guardSkillDir, resolveDrDir, type GitTopLevelResult } from "./dr_common.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

/** stdout オブジェクトのキー順であり、退役した Python 版 pre-check の json.dumps のキー順に
 * 対応する。OUTPUT_KEYS を import するテスト (この unit の T-200、および
 * script-contract.test.js) が、CLI の stdout をこれと突き合わせて検証する際の正本。 */
export const OUTPUT_KEYS = [
  "status",
  "number",
  "filename",
  "slug",
  "date",
  "dr_dir",
  "similar_drs",
] as const;

export interface SimilarDr {
  file: string;
  similarity: string;
  title: string;
}

/** Python の `f"{score:.2f}"`: 小数第 2 位までの round-half-even を、固定 2 桁の文字列として
 * 表現する。丸めた float に `toFixed` を掛けるのではなく、整数の百分の一単位から組み立てる。
 * 62/100 のように 2 進数で正確に表現できない値が、出力の段になって再度丸まってしまうことが
 * ないようにするためで、skills/_lib/review_score.ts の round3 が round(x, 3) について書いて
 * いるのと同じ理由による。 */
export function formatScore(score: number): string {
  const scaled = score * 100;
  const floor = Math.floor(scaled);
  const remainder = scaled - floor;
  let hundredths: number;
  if (remainder > 0.5) hundredths = floor + 1;
  else if (remainder < 0.5) hundredths = floor;
  else hundredths = floor % 2 === 0 ? floor : floor + 1;
  const sign = hundredths < 0 ? "-" : "";
  const abs = Math.abs(hundredths);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** 退役した Python 版 pre-check の similarity(): titleA と titleB の語の集合の重なりを、
 * titleA 自身の語の「個数」(積集合や和集合のサイズではない) で割る -- titleA の中で語が繰り
 * 返されると、Python の `len(words_a)` がそうするのと同じように分母が増える。割る数は和集合
 * でなく title_a の語数なので、長い既存タイトル (titleB) だけでスコアが薄まることはない。 */
export function similarity(titleA: string, titleB: string): number {
  const wordsA = splitWords(titleA.toLowerCase());
  if (wordsA.length === 0) return 0.0;
  const setA = new Set(wordsA);
  const setB = new Set(splitWords(titleB.toLowerCase()));
  let overlap = 0;
  for (const word of setA) {
    if (setB.has(word)) overlap += 1;
  }
  return overlap / wordsA.length;
}

/** 引数無しの Python の `str.split()`: 空白の連続で分割し、先頭・末尾・連続する空白から
 * 生じる空文字列を落とす。単一の空白でしか分割せず空文字列の artifact も残す
 * `String.split(" ")` とは違う。 */
function splitWords(text: string): string[] {
  const trimmed = text.trim();
  return trimmed === "" ? [] : trimmed.split(/\s+/);
}

/** 退役した Python 版 pre-check の first_heading(): 最初に見つかる `# ` で始まる行の
 * テキスト。ファイルが最上位の heading を持たないときは "" になる。 */
export function firstHeading(path: string): string {
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    if (line.startsWith("# ")) return line.slice(2);
  }
  return "";
}

/** 退役した Python 版 pre-check の `sorted(dr_dir.rglob("*.md"))`: drDir 配下のあらゆる
 * 深さにある *.md ファイルすべてを、フルパスとして返す -- ソートは呼び出し側が行い、
 * `rglob` が返す Path をソートしたときと同じパス文字列の順序になる。 */
function markdownFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...markdownFilesUnder(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push(full);
    }
  }
  return found;
}

/** `git rev-parse --show-toplevel`。resolveDrDir がこれを必要とするとき (DR_DIR 未設定かつ
 * CLI 引数無し) だけ読む -- pre-check.ts 自身は dr_dir の引数を持たず、退役した Python 版
 * pre-check が `resolve_dr_dir()` を引数無しで呼ぶのに対応する。 */
function gitTopLevel(): GitTopLevelResult {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout ?? "", error: result.error };
}

// Python の main() は自身の argv を取らない (title は sys.argv[1] から来る)。この main(argv)
// は harness_hash.ts の main() と同じ process.argv.slice(2) の慣習を保つ。
export function main(argv: string[]): number {
  const title = argv[0] ?? "";
  const drDir = resolveDrDir(
    process.env,
    undefined,
    process.env.DR_DIR ? { status: 0, stdout: "" } : gitTopLevel(),
  );
  if (drDir === null) {
    fail(
      "Error: not inside a git repository. Decision Records require" +
        " <git-root>/docs/decisions/. Set DR_DIR env var to override.",
    );
  }
  const threshold = parseFloat(process.env.DUPLICATE_THRESHOLD ?? "0.7");

  if (!(title.length >= 5 && title.length <= 64)) {
    fail(`Error: title length ${title.length} chars (required 5-64)`);
  }
  if (/[/:*?"<>|]/.test(title)) {
    fail('Error: forbidden characters in title (/:*?"<>|)');
  }
  guardSkillDir(
    drDir,
    "Set DR_DIR env var or run from a project root where docs/decisions/ is the archive.",
  );

  mkdirSync(drDir, { recursive: true });
  try {
    accessSync(drDir, constants.W_OK);
  } catch {
    fail(`Error: no write permission: ${drDir}`);
  }

  let maxNumber = 0;
  for (const entry of readdirSync(drDir)) {
    const match = /^(\d{4})-/.exec(entry);
    if (match) maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
  }
  const nextNumber = String(maxNumber + 1).padStart(4, "0");

  const slug = title
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  const similarDrs: SimilarDr[] = [];
  for (const drFile of markdownFilesUnder(drDir).sort()) {
    const existing = firstHeading(drFile);
    if (!existing) continue;
    const score = similarity(title, existing);
    if (score >= threshold) {
      similarDrs.push({ file: basename(drFile), similarity: formatScore(score), title: existing });
    }
  }

  const now = new Date();
  const date = [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "ok",
        number: nextNumber,
        filename: `${nextNumber}-${slug}.md`,
        slug,
        date,
        dr_dir: drDir,
        similar_drs: similarDrs,
      },
      null,
      2,
    )}\n`,
  );
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
