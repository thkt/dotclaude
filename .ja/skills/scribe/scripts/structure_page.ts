/// <reference types="node" />
// docs/wiki の `kind: structure` ページと、その節が運ぶ claim を読む。
//
// docs/wiki/README.md は structure ページの節順を固定している:
// `内容` → `境界` → `契約` → `要求` → `参照コード` → `由来`。1 番目・5 番目・6 番目は箇条書き、
// `契約` と `要求` は表。表のヘッダ行とその `---` 区切り行は書式であって claim ではないので除く。
//
// 退役した Python 版の TypeScript 移植。
// skills/scribe/scripts/find_wiki_rule.ts の header に倣う。SECTIONS / findStructurePages /
// readClaims を node:* のみで運ぶ。CLI ではない: シェルから起動されることはなく (Python 版も
// argv 処理を持たない)、shebang も isMainModule(import.meta.url) エントリポイントも持たず、
// git index の mode は 100644 のまま。
//
// Contract: 退役した Python 版自身の挙動。
// skills/scribe/tests/structure-page.test.ts が検証する。
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// docs/wiki/README.md が structure ページの目印として名指す frontmatter の値。`共通項`
// ページとの区別に使う。
const KIND_LINE = "kind: structure";

// docs/wiki/README.md が structure ページに与える節の固定順。
export const SECTIONS = ["内容", "境界", "契約", "要求", "参照コード", "由来"] as const;

// 開始と終了の `---` の間の行。固定位置と決め打たず、終了デリミタまで走査して見つける。
function frontmatterLines(pagePath: string): string[] {
  const lines = readFileSync(pagePath, "utf8").split("\n");
  if (lines.length === 0 || lines[0] !== "---") return [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(1, i);
  }
  return [];
}

// wikiDir 配下で frontmatter が `kind: structure` を運ぶすべてのページ。
export function findStructurePages(wikiDir: string): string[] {
  return readdirSync(wikiDir)
    .filter((name) => name.endsWith(".md"))
    .filter((name) => frontmatterLines(join(wikiDir, name)).includes(KIND_LINE))
    .sort()
    .map((name) => join(wikiDir, name));
}

// `## heading` 1 節分の行。次の `## ` 見出しか終端まで。
function sectionBody(text: string, heading: string): string {
  const marker = `\n## ${heading}\n`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return "";
  const body = text.slice(markerIndex + marker.length);
  const nextHeading = body.indexOf("\n## ");
  return nextHeading === -1 ? body : body.slice(0, nextHeading);
}

// 1 節の本文が運ぶ claim 行を、その節自身の書式で返す。
//
// 表の節の行は `|` で始まる: 先頭の 2 行 (ヘッダ、`---` 区切り) は書式であって claim ではない
// ので、それより後の行だけを claim とする。箇条書きの節の行は `- ` で始まる。地の文の節
// (`内容`) はどちらの記号も持たないので、空でない行はすべて claim とする。
function sectionClaims(body: string): string[] {
  const lines = body.split("\n");
  const tableRows = lines.filter((line) => line.startsWith("|"));
  if (tableRows.length >= 2) return tableRows.slice(2);
  const bullets = lines.filter((line) => line.startsWith("- "));
  if (bullets.length > 0) return bullets;
  return lines.filter((line) => line.trim() !== "");
}

// structure ページの 6 節それぞれが運ぶ claim を、節名をキーにして返す。
export function readClaims(pagePath: string): Record<string, string[]> {
  const text = readFileSync(pagePath, "utf8");
  const result: Record<string, string[]> = {};
  for (const section of SECTIONS) {
    result[section] = sectionClaims(sectionBody(text, section));
  }
  return result;
}
