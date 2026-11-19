#!/usr/bin/env node
/// <reference types="node" />
// Usage: pre-check.ts "DR Title"
//
// stdout: OUTPUT_KEYS が宣言する順 (status, number, filename, slug, date, dr_dir,
// similar_drs) のキーを持つ JSON (indent 2)。
// stderr: 検証に落ちた内容。exit 1。
// open な PR が使う番号を避けて番号を進めたとき、または open な PR を確認できなかったときも、
// その旨を 1 行書く。どちらも exit 0。
//
// 退役した Python 版 pre-check の TypeScript 移植。header/entry の形は
// skills/dr/scripts/dr_common.ts が既に使っているものと同じ:
// 素直な shebang + reference-types + Usage ヘッダー、テストが直接動かせる部分は named export
// にし、CLI 自身の process.exit(main()) は workflows/_lib/entry-point.ts の isMainModule で
// ガードする。これにより、この module を export 目当てで import しても CLI が副作用として
// 動くことはない。
//
// Contract: 退役した Python 版 pre-check の similarity / first_heading / main。OUTPUT_KEYS は
// json.dumps のキー順に対応し、skills/dr/tests/script-contract.test.js が import する。
// skills/dr/tests/pre-check.test.ts が検証する。
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { fail, filesUnder, gitTopLevel, guardSkillDir, localDate, resolveDrDir } from "./dr_common.ts";
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
 * ないようにするため。 */
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

/** drDir 配下の既存 DR (ソート済み) のうち、最初の heading が title に
 * 対して threshold 以上のスコアを持つものすべてを、formatScore(score) と既存の heading
 * テキストを添えて返す -- threshold 以上の *.md が drDir に無ければ空になる。main() から
 * 呼ばれる。 */
function collectSimilarDrs(title: string, drDir: string, threshold: number): SimilarDr[] {
  const similarDrs: SimilarDr[] = [];
  for (const drFile of filesUnder(drDir, (name) => name.endsWith(".md")).sort()) {
    const existing = firstHeading(drFile);
    if (!existing) continue;
    const score = similarity(title, existing);
    if (score >= threshold) {
      similarDrs.push({ file: basename(drFile), similarity: formatScore(score), title: existing });
    }
  }
  return similarDrs;
}

/** DR の番号 NNNN を、名前が `NNNN-` で始まるファイルから読む。それ以外は null。 */
function drNumber(name: string): number | null {
  const match = /^(\d{4})-/.exec(name);
  return match ? parseInt(match[1], 10) : null;
}

/** open な PR を確認できなかった理由を運ぶ。main() はこれだけを捕まえ、ほかの例外は通す。 */
class OpenPrCheckUnavailable extends Error {}

/** bin を cwd で走らせて stdout を返す。起動できない、または 0 以外で終わったときは
 * OpenPrCheckUnavailable を投げる。stderr は 1 行に収めるため最初の行だけを理由に入れる。 */
function runOrUnavailable(bin: string, args: string[], cwd: string): string {
  const result = spawnSync(bin, args, { cwd, encoding: "utf8" });
  if (result.error) {
    throw new OpenPrCheckUnavailable(`${bin} could not run: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr ?? "").trim().split("\n")[0];
    throw new OpenPrCheckUnavailable(
      `${bin} ${args.slice(0, 2).join(" ")} exited ${result.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  return result.stdout;
}

/** `gh pr list --json number` の出力から PR の番号を取り出す。JSON でない、または整数の
 * number を持つオブジェクトの配列でないときは OpenPrCheckUnavailable を投げる。 */
function parsePrNumbers(listed: string): number[] {
  let prs: unknown;
  try {
    prs = JSON.parse(listed);
  } catch {
    throw new OpenPrCheckUnavailable("gh pr list printed output that is not JSON");
  }
  if (!Array.isArray(prs) || !prs.every((pr) => Number.isInteger((pr as { number?: unknown })?.number))) {
    throw new OpenPrCheckUnavailable("gh pr list printed JSON that is not a list of PR numbers");
  }
  return prs.map((pr: { number: number }) => pr.number);
}

interface OpenPrDrUse {
  pr: number;
  number: number;
}

/** drDir を含む repo の open な PR が、drDir の直下に置くファイルの DR 番号。
 * readdirSync(drDir) が直下だけを数えるので、PR 側も直下だけを数える。
 * `gh pr diff --name-only` は追加以外の変更も返すが、変更や削除の対象はローカルにもある
 * 番号なので、ローカルの最大値を超えるのは main を追い越した変更だけになる。
 * drDir が git の work tree の外にあるときは gh を呼ばない。 */
function openPrDrUses(drDir: string): OpenPrDrUse[] {
  // --show-prefix で比べる。macOS の tmpdir は /var を git が /private/var と返すので、
  // toplevel から path.relative を取ると drDir の外を指す。
  const [inside, topLevel, prefix = ""] = runOrUnavailable(
    "git",
    ["rev-parse", "--is-inside-work-tree", "--show-toplevel", "--show-prefix"],
    drDir,
  ).split("\n");
  if (inside !== "true") {
    throw new OpenPrCheckUnavailable(`${drDir} is not inside a git work tree`);
  }
  const gh = process.env.CLAUDE_GH_BIN || "gh";
  // gh pr list の既定は 30 件なので、それを超える open な PR を落とさないよう上限を上げる。
  const prs = parsePrNumbers(
    runOrUnavailable(
      gh,
      ["pr", "list", "--state", "open", "--json", "number", "--limit", "1000"],
      topLevel,
    ),
  );
  const uses: OpenPrDrUse[] = [];
  for (const pr of prs) {
    // gh pr list --json files は 1 PR あたり 100 件で切れるので、全件を返す gh pr diff で読む。
    const names = runOrUnavailable(gh, ["pr", "diff", String(pr), "--name-only"], topLevel);
    for (const path of names.split("\n")) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (rest.includes("/")) continue;
      const number = drNumber(rest);
      if (number !== null) uses.push({ pr, number });
    }
  }
  return uses;
}

const pad = (n: number): string => String(n).padStart(4, "0");

/** ローカルの最大値と、open な PR が使う番号の最大値のうち大きい方。open な PR を確認でき
 * なかったときはローカルの最大値。空いている番号を詰めては使わない。 */
function highestUsedNumber(drDir: string, localMax: number): number {
  let uses: OpenPrDrUse[];
  try {
    uses = openPrDrUses(drDir);
  } catch (error) {
    if (!(error instanceof OpenPrCheckUnavailable)) throw error;
    process.stderr.write(
      `pre-check: could not check open pull requests (${error.message});` +
        ` returning ${pad(localMax + 1)}, the local maximum plus one\n`,
    );
    return localMax;
  }
  const ahead = uses.filter((use) => use.number > localMax).sort((a, b) => a.number - b.number);
  if (ahead.length === 0) return localMax;
  const highest = ahead[ahead.length - 1].number;
  const used = ahead.map((use) => `${pad(use.number)} (#${use.pr})`).join(", ");
  process.stderr.write(
    `pre-check: open pull requests already use ${used};` +
      ` returning ${pad(highest + 1)} instead of ${pad(localMax + 1)}\n`,
  );
  return highest;
}

// Python の main() は自身の argv を取らない (title は sys.argv[1] から来る)。この main(argv)
// は process.argv.slice(2) を受け取る。
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

  let localMax = 0;
  for (const entry of readdirSync(drDir)) {
    localMax = Math.max(localMax, drNumber(entry) ?? 0);
  }
  const nextNumber = pad(highestUsedNumber(drDir, localMax) + 1);

  const slug = title
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  const similarDrs = collectSimilarDrs(title, drDir, threshold);

  const date = localDate(new Date());

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
