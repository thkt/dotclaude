#!/usr/bin/env node
/// <reference types="node" />
// Usage: validate-issue-body.ts <template-file> <title> <body-file>
//        validate-issue-body.ts --content-only <body-file>
//
// --content-only は骨格を要らない検査だけを走らせる。番号経路が編集するのは起票元の
// テンプレートが記録されていない issue なので、走らせられるのはこれだけになる。
//
// stdout: JSON { errors, warnings, checks }
// exit: errors が無ければ 0 (warnings は許容)、あれば 1
//
// validate-issue-body.py の TypeScript 移植。Contract: validate-issue-body.py の TYPE_PREFIX /
// FLOOR / FLOOR_ALIASES / ALLOWED_EXTRA / skeleton_text / skeleton_sections / form_sections /
// body_section_names / section_body / is_unfilled / placeholders_left / record_placeholders /
// report / content_only_report / main。skills/issue/tests/validate-issue-body.test.ts が検証
// する。Python の snake_case な名前は TS 側では camelCase になる。FLOOR / FLOOR_ALIASES /
// ALLOWED_EXTRA だけは upper-snake のまま残し、U-005 の skill-contract.test.js と
// slice/tests/contract.test.js が正規表現でソースを読まずに同じ識別子を import できるように
// する。Python の re.DOTALL/re.MULTILINE はここでは `[\s\S]` のイディオムと下の `m` フラグに、
// str.casefold() は toLowerCase() になる (この validator が比較する節名は ASCII か日本語で、
// 両者はここでは乖離しない)。Path.stem/.suffix は node:path の parse().name/.ext になる。
import { readFileSync } from "node:fs";
import { parse } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

const USAGE =
  "Usage: validate-issue-body.ts <template-file> <title> <body-file>\n" +
  "       validate-issue-body.ts --content-only <body-file>";

const TYPE_PREFIX = /^\[([A-Za-z]+)\]/;
const HEADING = /^## (.+?)\s*$/gm;
// 's' フラグは要らない: '[\s\S]' が既に改行をまたぐので Python の DOTALL と同じになり、
// かつ下で作る replace-all 版と global フラグの lastIndex 状態を共有しない。
const CODE_BLOCK = /```[^\n]*\n([\s\S]*?)```/;
const OPTIONAL_SUFFIX = /\s*\((?:optional|任意)\)\s*$/;
const FORM_SUFFIXES = [".yml", ".yaml"];
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
// 行頭の箇条書き記号とチェックボックス。剥がした残りがその行の中身になる。
const MARKER = /^\s*(?:[-*]|\d+\.)?\s*(?:\[[ xX]\])?\s*/;
const PLACEHOLDER = /\{[^{}\n]+\}/g;
const PLACEHOLDER_ONLY = /^\{[^{}\n]+\}$/;

// 骨格が何を必須としても skill が守る底。リポジトリの form が述べるのは Web UI が
// 埋めさせる最小で、起票された issue が担うべき量より薄い。これが無いと feature は
// 受け入れ条件なしで、bug は再現手順なしで通る。
export const FLOOR: Record<string, readonly string[]> = {
  feature: ["Acceptance Criteria", "Testing Decisions"],
  bug: ["Steps to Reproduce", "Expected vs Actual"],
};
// リポジトリの form は底の節を自分の言語で名付ける。底の英語名ごとに、同じ節に当たるラベルを
// 並べる。これが無いと、日本語 form の必須節と英語の底を両方置かない限り本文が通らない。
export const FLOOR_ALIASES: Record<string, readonly string[]> = {
  "Steps to Reproduce": ["再現手順"],
  "Expected vs Actual": ["期待 / 実際"],
};
// Plan と Backlog candidates は /think の plan を転記した issue が持ち、Parent と Blocked by は
// /slice が骨格を挟む形で必ず付ける。骨格に無いという理由で errors にすると、この 2 つの
// 経路が作る本文が全て落ちる。
export const ALLOWED_EXTRA: ReadonlySet<string> = new Set([
  "Plan",
  "Backlog candidates",
  "Parent",
  "Blocked by",
]);

export interface ValidationResults {
  errors: string[];
  warnings: string[];
  checks: string[];
}

/** `text` の中のコードフェンスを全て空文字に置き換える。CODE_BLOCK の source から作った
 * 別の global フラグ付き RegExp を使うので、他の場所で使う一発勝負の `.exec()` の
 * lastIndex 状態をこの呼び出しと共有しない (壊されもしない)。 */
function stripCodeBlocks(text: string): string {
  return text.replace(new RegExp(CODE_BLOCK.source, "g"), "");
}

/** 骨格そのもの。`## Template` 直下の最初のコードフェンス。
 *
 * ここで次の見出しまでを取る手は使えない。骨格自体が `## ` を含む markdown なので、
 * その境界は `## Guidelines` でなく骨格内の最初の見出しで止まる。コードフェンスは
 * 自分で閉じるため、見出しの開始位置だけを求めてその後の最初のフェンスを探す。
 *
 * `## Template` が無いのはリポジトリ自身の .github/ISSUE_TEMPLATE/<type>.md で、
 * その本文がそのまま骨格になる。この分岐が無いと節を 1 つも読めず、正しい本文の
 * 全見出しが unknown_section になる。
 */
export function skeletonText(templateText: string): string {
  const headingMatch = /^## Template\s*$/m.exec(templateText);
  if (headingMatch === null) {
    return templateText.replace(FRONTMATTER, "");
  }
  const after = templateText.slice(headingMatch.index + headingMatch[0].length);
  const codeMatch = CODE_BLOCK.exec(after);
  return codeMatch ? codeMatch[1] : "";
}

/** 骨格から読む (name, optional) の組。 */
export function skeletonSections(templateText: string): Array<[string, boolean]> {
  const sections: Array<[string, boolean]> = [];
  for (const match of skeletonText(templateText).matchAll(HEADING)) {
    const name = match[1];
    const optional = OPTIONAL_SUFFIX.test(name);
    const bare = name.replace(OPTIONAL_SUFFIX, "");
    sections.push([bare, optional]);
  }
  return sections;
}

/** GitHub issue form (.yml) の body 要素から読む (name, optional) のペア。
 *
 * フォームは Web UI からの起票で label を見出しに変える。同じ label を CLI 起票の
 * 骨格にも使えば、どちらの経路で立った issue も同じ節を持つ。`validations.required`
 * が真の要素だけを必須とする。
 *
 * YAML パーサは標準ライブラリに無い。issue form の body は `- type:` 区切りの平坦な
 * 並びで入れ子を持たないため、区切りで割ってから各断片を読む。
 */
export function formSections(formText: string): Array<[string, boolean]> {
  const bodyStart = /^body:\s*$/m.exec(formText);
  if (bodyStart === null) return [];
  const entries = formText
    .slice(bodyStart.index + bodyStart[0].length)
    .split(/^\s*- type:\s*/m)
    .slice(1);
  const sections: Array<[string, boolean]> = [];
  for (const entry of entries) {
    if (entry.split("\n")[0].trim() === "markdown") continue;
    const labelMatch = /^\s*label:\s*(.+?)\s*$/m.exec(entry);
    if (labelMatch === null) continue;
    const name = labelMatch[1]
      .trim()
      .replace(/^["']+/, "")
      .replace(/["']+$/, "");
    const required = /^\s*required:\s*true\s*$/m.test(entry);
    sections.push([name, !required]);
  }
  return sections;
}

/** 本文の節名。コードフェンスの中は数えない。
 *
 * 骨格はフェンスの中身を読むが、本文でフェンスに入る `## ` は引用であって節ではない。
 * 数えると骨格に無い引用が unknown_section になり、正しい本文が落ちる。
 */
export function bodySectionNames(bodyText: string): Set<string> {
  const outside = stripCodeBlocks(bodyText);
  const names = new Set<string>();
  for (const match of outside.matchAll(HEADING)) {
    names.add(match[1].replace(OPTIONAL_SUFFIX, ""));
  }
  return names;
}

/** 本文の `## <name>` 直下の行。次の h2 か末尾まで。 */
export function sectionBody(bodyText: string, name: string): string | null {
  const outside = stripCodeBlocks(bodyText);
  const matches = [...outside.matchAll(HEADING)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (match[1].replace(OPTIONAL_SUFFIX, "") !== name) continue;
    const end = index + 1 < matches.length ? matches[index + 1].index : outside.length;
    return outside.slice(match.index + match[0].length, end);
  }
  return null;
}

/** 見出しの下に箇条書き記号とチェックボックスと TBD しか無いか。 */
export function isUnfilled(body: string): boolean {
  for (const line of body.split("\n")) {
    const content = line.replace(MARKER, "").trim();
    if (!content || content.toUpperCase() === "TBD") continue;
    return false;
  }
  return true;
}

/** 本文に残っているテンプレートの穴埋め文。
 *
 * 記号を剥がした残りが `{...}` だけの行は、どこから来たものでも未記入。それ以外は
 * 骨格が持つ穴埋め文と一致するものだけを数えるので、{status, findings} のような
 * JSON の形を書いた本文は未記入と読まれない。フェンスの中は引用した見本なので、
 * その波括弧は数えない。
 */
export function placeholdersLeft(bodyText: string, skeleton: string): string[] {
  const outside = stripCodeBlocks(bodyText);
  const left: string[] = [];
  for (const line of outside.split("\n")) {
    const content = line.replace(MARKER, "").trim();
    if (PLACEHOLDER_ONLY.test(content)) left.push(content);
  }
  const prompts = [...skeleton.matchAll(PLACEHOLDER)].map((m) => m[0]);
  const inBody = [...outside.matchAll(PLACEHOLDER)].map((m) => m[0]);
  for (const found of inBody) {
    if (prompts.includes(found) && !left.includes(found)) left.push(found);
  }
  return left;
}

/** 本文に残っている穴埋め文を results へ積む。 */
export function recordPlaceholders(
  bodyText: string,
  skeleton: string,
  results: ValidationResults,
): void {
  const left = placeholdersLeft(bodyText, skeleton);
  if (left.length > 0) {
    results.errors.push(`placeholder_left:${left.length} [${left[0]}]`);
  } else {
    results.checks.push("placeholder=none");
  }
}

/** 報告を出力し、終了コードを返す: errors を持てば 1、そうでなければ 0。 */
export function report(results: ValidationResults): number {
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  return results.errors.length > 0 ? 1 : 0;
}

/** 番号経路の検証。骨格なしで走る検査だけを回す。 */
export function contentOnlyReport(bodyPath: string): number {
  const results: ValidationResults = { errors: [], warnings: [], checks: [] };
  recordPlaceholders(readFileSync(bodyPath, "utf8"), "", results);
  return report(results);
}

export function main(argv: string[]): number {
  // 番号経路は骨格が分からないので、骨格を要らない検査だけを走らせる。
  if (argv.length > 1 && argv[0] === "--content-only") {
    return contentOnlyReport(argv[1]);
  }
  if (argv.length < 3) {
    process.stderr.write(`${USAGE}\n`);
    return 1;
  }
  const [templatePath, title, bodyPath] = argv;

  const templateText = readFileSync(templatePath, "utf8");
  const bodyText = readFileSync(bodyPath, "utf8");

  const results: ValidationResults = { errors: [], warnings: [], checks: [] };

  const titleMatch = TYPE_PREFIX.exec(title);
  const parsedTemplate = parse(templatePath);
  const templateType = parsedTemplate.name;
  if (titleMatch) {
    const titleType = titleMatch[1].toLowerCase();
    if (titleType !== templateType) {
      results.errors.push(`type_mismatch:title=${titleType} template=${templateType}`);
    } else {
      results.checks.push(`type_match:${titleType}=ok`);
    }
  } else {
    results.errors.push("type_mismatch:title has no bracketed type prefix");
  }

  const isForm = FORM_SUFFIXES.includes(parsedTemplate.ext);
  const ownTemplate = /^## Template\s*$/m.test(templateText);
  const sections = isForm ? formSections(templateText) : skeletonSections(templateText);
  // 節が 0 個は要求が無いのではなく骨格を読めなかった状態。必須検査も未知検査も
  // 素通りし、どんな本文でも exit 0 になるので、ここで止める。
  if (sections.length === 0) {
    results.errors.push(`unreadable_skeleton:${parsedTemplate.base}`);
  }
  const required = sections.filter(([, optional]) => !optional).map(([name]) => name);
  const present = bodySectionNames(bodyText);
  const known = new Set([...present, ...required].map((n) => n.toLowerCase()));
  for (const name of FLOOR[templateType] ?? []) {
    const names = [name, ...(FLOOR_ALIASES[name] ?? [])];
    if (!names.some((n) => known.has(n.toLowerCase()))) {
      required.push(name);
    }
  }
  for (const name of required) {
    if (present.has(name)) {
      results.checks.push(`section:${name}=ok`);
    } else {
      results.errors.push(`missing_section:${name}`);
    }
  }

  // リポジトリ側のテンプレートは web UI が埋めさせる最小要件なので、CLI 起票が節を
  // 足すのは逸脱ではない。閉じた集合として扱うのは skill 自身のテンプレートだけ。
  if (isForm || !ownTemplate) {
    results.checks.push("unknown_section=skipped (repository template)");
  } else {
    const knownNames = new Set([...sections.map(([name]) => name), ...ALLOWED_EXTRA]);
    const extra = [...present].filter((name) => !knownNames.has(name)).sort();
    for (const name of extra) {
      results.errors.push(`unknown_section:${name}`);
    }
    if (extra.length === 0) {
      results.checks.push("unknown_section=none");
    }
  }

  recordPlaceholders(bodyText, isForm ? "" : skeletonText(templateText), results);

  const unfilled = required.filter(
    (name) => present.has(name) && isUnfilled(sectionBody(bodyText, name) ?? ""),
  );
  for (const name of unfilled) {
    results.errors.push(`unfilled_section:${name}`);
  }
  if (unfilled.length === 0) {
    results.checks.push("unfilled_section=none");
  }

  return report(results);
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
