#!/usr/bin/env node
/// <reference types="node" />
// Usage: find_wiki_rule.ts <wiki-dir> <slug> [file ...] [--scene <scene>]
//
// <wiki-dir> の決まりごとページを、そのタスクに対して順位付けする。globs が渡されたファイルに
// 一致するページは確実な一致、ファイル名が slug と語を共有するページは弱い一致。
// `--scene` を渡すと、frontmatter の scenes にその値を含むページを追加で列挙する。値は
// SCENES から選ばなければならず、それ以外は終了コード 2。
//
// stdout: 通常は JSON { matched: [{page, globs, files}], related: [{page, shared}] }
//         --scene を渡したときは scenes: [page] も加わる
// exit: 0。引数不足、または未知の --scene 値のときは 2
//
// skills/scribe/scripts/find_wiki_rule.py の TypeScript 移植。skills/_lib/harness_hash.ts の
// header と isMainModule(import.meta.url) エントリポイントに倣う。SCENES / NOT_A_RULE /
// glob_to_regexp / normalize / read_globs / read_scenes / words / find / _split_scene_flag /
// main を node:* のみで運ぶ。
//
// Contract: skills/scribe/scripts/find_wiki_rule.py 自身の挙動。fixture
// skills/scribe/tests/fixtures/find-wiki-rule-cases.json (U-001) に固定される。
// skills/scribe/tests/find-wiki-rule.test.ts が検証する。
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// README はディレクトリの索引、_candidates は閾値未満の行の置き場。どちらも決まりごとではない。
const NOT_A_RULE = new Set(["README.md", "_candidates.md"]);

// ページの frontmatter `scenes` が宣言してよい値の閉集合。ここではなく wiki ページ契約テスト
// 側でこの一覧を書き直すと、そちらとこのモジュールが別々の閉集合へ drift する。
export const SCENES: string[] = ["plan", "implement", "issue-create", "pr-create", "issue-close"];

export interface Matched {
  page: string;
  globs: string[];
  files: string[];
}

export interface Related {
  page: string;
  shared: number;
}

export interface Report {
  matched: Matched[];
  related: Related[];
  scenes: string[];
}

// workflows/code.js の globToRegExp が受ける部分集合と同じ。`**/` はディレクトリを跨ぎ、`*` は
// 1 階層で止まる。片側だけ広げると、ページが届く実装と routing の届く実装が食い違う。
const SEGMENT = /(\*\*\/|\*)/;
const ESCAPE = /[.+^${}()|[\]\\]/g;

export function globToRegExp(glob: string): RegExp {
  const body = glob
    .split(SEGMENT)
    .map((part) =>
      part === "**/" ? "(?:.*/)?" : part === "*" ? "[^/]*" : part.replace(ESCAPE, "\\$&"),
    )
    .join("");
  return new RegExp(`^${body}$`);
}

/** 先頭の `./` と `/` を両側から落とし、接頭辞が一致を決めないようにする。 */
function normalize(path: string): string {
  return path.replace(/^(?:\.\/|\/)+/, "");
}

/** 固定行数でなく閉じデリミタまで辿るので、ページが `scenes` を `globs` より前に置いても
 * `globs` が視界から落ちない。 */
function frontmatterLines(pagePath: string): string[] {
  const lines = readFileSync(pagePath, "utf8").split("\n");
  if (lines.length === 0 || lines[0] !== "---") return [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(1, i);
  }
  return [];
}

/** 配列でない値も空リストにする。`globs: "**\/*"` を素直に回すと 1 文字ずつが glob になり、
 * ページが全ファイルに一致したように見える。 */
function arrayFromFrontmatter(lines: readonly string[], key: string): string[] {
  const prefix = `${key}:`;
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      let value: unknown;
      try {
        value = JSON.parse(line.slice(prefix.length).trim());
      } catch {
        return [];
      }
      if (!Array.isArray(value)) return [];
      return (value as unknown[]).filter((g): g is string => typeof g === "string");
    }
  }
  return [];
}

export function readGlobs(pagePath: string): string[] {
  return arrayFromFrontmatter(frontmatterLines(pagePath), "globs");
}

export function readScenes(pagePath: string): string[] {
  return arrayFromFrontmatter(frontmatterLines(pagePath), "scenes");
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[-_\s]+/)
      .filter((w) => w.length > 0),
  );
}

export function find(
  wikiDir: string,
  slug: string,
  files: readonly string[],
  scene?: string,
): Report {
  // SCENES は --scene の値を照合する閉集合。ページが実際に宣言している値と照合すると、
  // まだどのページも宣言していない有効な scene がエラーになり、呼び出し側の既存の
  // matched フローを壊す。
  if (scene !== undefined && !SCENES.includes(scene)) {
    throw new Error(`unknown scene: '${scene}'`);
  }

  const pages = readdirSync(wikiDir)
    .filter((name) => name.endsWith(".md") && !NOT_A_RULE.has(name))
    .sort();
  const normalizedFiles = files.map(normalize);
  const slugWords = words(slug);

  const matched: Matched[] = [];
  const related: Related[] = [];
  const scenes: string[] = [];
  for (const pageName of pages) {
    const lines = frontmatterLines(join(wikiDir, pageName));
    const globs = arrayFromFrontmatter(lines, "globs");
    const hits = normalizedFiles.filter((f) =>
      globs.some((g) => globToRegExp(normalize(g)).test(f)),
    );
    if (hits.length > 0) {
      matched.push({ page: pageName, globs, files: hits });
    } else {
      const stem = pageName.slice(0, -".md".length);
      const shared = [...words(stem)].filter((w) => slugWords.has(w)).length;
      if (shared > 0) related.push({ page: pageName, shared });
    }
    if (scene !== undefined && arrayFromFrontmatter(lines, "scenes").includes(scene)) {
      scenes.push(pageName);
    }
  }

  // このタスクが触るファイルに規則が関わるページは、語を共有するだけのページより上位に立つ。
  matched.sort((a, b) => b.files.length - a.files.length);
  related.sort((a, b) => b.shared - a.shared);
  return { matched, related, scenes };
}

/** argv から `--scene <value>` の組を取り出し、残りを位置引数として返す。 */
function splitSceneFlag(argv: readonly string[]): [string[], string | undefined] {
  const i = argv.indexOf("--scene");
  if (i === -1 || i + 1 >= argv.length) return [[...argv], undefined];
  return [[...argv.slice(0, i), ...argv.slice(i + 2)], argv[i + 1]];
}

const USAGE = "Usage: find_wiki_rule.ts <wiki-dir> <slug> [file ...] [--scene <scene>]\n";

export function main(argv: readonly string[]): number {
  const [positional, scene] = splitSceneFlag(argv);
  if (positional.length < 2) {
    process.stderr.write(USAGE);
    return 2;
  }
  const [wikiDir, slug, ...files] = positional;

  let report: Report;
  try {
    report = find(wikiDir, slug, files, scene);
  } catch (error) {
    process.stderr.write(`find_wiki_rule: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }

  // --scene が無いときに 2 key の形を保つのは、既存の呼び出し元 (skills/think, skills/fix) を
  // この軸の追加でバイト単位まで無傷に保つため。
  const output: Record<string, unknown> = { matched: report.matched, related: report.related };
  if (scene !== undefined) {
    output.scenes = report.scenes;
  }
  process.stdout.write(`${JSON.stringify(output)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
