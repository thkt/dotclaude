#!/usr/bin/env node
/// <reference types="node" />
// Usage: harness_elements.ts <repo-root>
//
// harness_elements.py を TypeScript へ移植したもの。<repo-root> 配下で POPULATION_GLOBS に
// マッチするハーネスファイルを列挙し、それぞれを always-loaded / path-triggered /
// glob-triggered / non-prompt のいずれかに分類する。
//
// stdout: JSON array of { path, classification }, path relative to <repo-root>
// exit: 0 on success, 2 without an argument
//
// 契約: skills/_lib/harness_elements.py の ALWAYS_LOADED、PATH_TRIGGERED、GLOB_TRIGGERED、
// NON_PROMPT、POPULATION_GLOBS、_frontmatter_lines、_unquote、_read_array、classify、
// enumerate_elements、main。review_score.ts が自身の Python 由来の名前を camelCase に
// リネームしたのとは違い、名前は harness_elements.py が宣言するとおりに保つ --
// skills/ablate/scripts/arms.ts も同じ理由で同じ形を保っている。後続のスライスがこの
// モジュールの export 名を harness_elements.py の公開名と集合として突き合わせる
// (#641 の U-004 が使ったのと同じ守り) ため、ここで名前をリネームすると片側にしか
// ない名前として読めてしまう。
//
//
// 自前の YAML パーサーではない: ここで扱う 2 つの frontmatter 表記
// (1 行の `globs: [...]`、`paths:` に続く `  - "..."` 行) は狭いので、この 2 形式を
// 手書きでパースする方が、そのために依存を増やすより小さく収まる
// (rules/PRINCIPLES.md Reuse Ordering)。
import { globSync, readFileSync, statSync } from "node:fs";
import { extname, join, sep } from "node:path";
import { isMainModule } from "../../workflows/_lib/entry-point.ts";

export const ALWAYS_LOADED = "always-loaded";
export const PATH_TRIGGERED = "path-triggered";
export const GLOB_TRIGGERED = "glob-triggered";
export const NON_PROMPT = "non-prompt";

// 集団の供給リスト。プローズの契約ではなくスクリプトの定数として持つ
// (docs/wiki/harness-production-divergence.md)。harness_elements.py の
// POPULATION_GLOBS からそのまま複製している -- このリストを広げるのは退役スライスであり、
// この移植ではない。
//
// どのパターンもリテラルなトップレベルのセグメントに固定されており (裸の "**" から
// 始まるものはない)、これらの木の隣に置かれる `.ja/` ミラーはこれらのグロブに
// 一切踏み込まれない: 正本側のマッチ 1 件が集団の要素 1 件であり、
// rules/conventions/MIRROR.md の「ファイルとその .ja ミラーは 1 要素として数える」は
// 重複除去パスによってではなく構成そのものによって成り立つ。
export const POPULATION_GLOBS: readonly string[] = [
  "rules/**/*.md",
  "docs/wiki/**/*.md",
  "CLAUDE.md",
  "skills/**/*.md",
  "skills/**/scripts/*.py",
  "agents/**/*.md",
  "hooks/**/*.py",
  "hooks/**/*.md",
];

export interface HarnessElement {
  path: string;
  classification: string;
}

/** 開始と終了の `---` デリミタの間にある行そのもの。frontmatter ブロックを
 * 一切持たないファイルでは null を返す (空ブロックとは区別する)。 */
export function _frontmatter_lines(path: string): string[] | null {
  const lines = readFileSync(path, "utf8").split("\n");
  if (lines.length === 0 || lines[0] !== "---") {
    return null;
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      return lines.slice(1, i);
    }
  }
  return null;
}

export function _unquote(item: string): string {
  if (item.length >= 2 && item[0] === item[item.length - 1] && (item[0] === "'" || item[0] === '"')) {
    return item.slice(1, -1);
  }
  return item;
}

/** このリポジトリのハーネスファイルが使う 2 つの frontmatter 配列表記のどちらも読む:
 * 1 行の JSON 配列 (`globs: ["a", "b"]`) と、複数行の YAML ダッシュリスト
 * (`paths:` に続く `  - "a"` 行) の両方。 */
export function _read_array(lines: string[], key: string): string[] {
  const prefix = `${key}:`;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith(prefix)) {
      continue;
    }
    const rest = line.slice(prefix.length).trim();
    if (rest) {
      let value: unknown;
      try {
        value = JSON.parse(rest);
      } catch {
        return [];
      }
      if (!Array.isArray(value)) {
        return [];
      }
      return value.filter((v): v is string => typeof v === "string");
    }
    const items: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const stripped = lines[j].trim();
      if (!stripped.startsWith("-")) {
        break;
      }
      items.push(_unquote(stripped.slice(1).trim()));
    }
    return items;
  }
  return [];
}

/** ハーネスファイルを 1 件分類する。上から下へ読み、最初に一致した規則を採る
 * (skills/census/SKILL.md Phase 4 の表と同じ形): .md でないファイルは常に non-prompt。
 * rules/**\/*.md ファイル (またはルートの CLAUDE.md) は frontmatter を持たなければ
 * always-loaded、非空の `paths` キーを持てば path-triggered。docs/wiki/**\/*.md ページは
 * 非空の `globs` キーを持てば glob-triggered。集団が持ちうるそれ以外
 * (名前で呼ばれる SKILL.md、spawn 時にだけ読み込まれるレビュアー定義、プロースとして
 * 注入されず実行されるスクリプト) はすべて non-prompt。 */
export function classify(path: string): string {
  if (extname(path) !== ".md") {
    return NON_PROMPT;
  }

  const parts = path.split(sep);
  const name = parts[parts.length - 1];
  const lines = _frontmatter_lines(path);

  if (parts.includes("rules") || name === "CLAUDE.md") {
    if (lines === null) {
      return ALWAYS_LOADED;
    }
    if (_read_array(lines, "paths").length > 0) {
      return PATH_TRIGGERED;
    }
    return NON_PROMPT;
  }

  if (parts.includes("docs") && parts.includes("wiki")) {
    if (lines !== null && _read_array(lines, "globs").length > 0) {
      return GLOB_TRIGGERED;
    }
    return NON_PROMPT;
  }

  return NON_PROMPT;
}

/** root 配下で POPULATION_GLOBS を走査し、各マッチを分類する。パターンは `.ja/` へは
 * 一切踏み込まないため、ミラーされたファイルは正本側だけを通じて 1 回だけ現れる。 */
export function enumerate_elements(root: string): HarnessElement[] {
  const seen = new Map<string, HarnessElement>();
  for (const pattern of POPULATION_GLOBS) {
    for (const rel of globSync(pattern, { cwd: root })) {
      const absolute = join(root, rel);
      if (!statSync(absolute).isFile()) {
        continue;
      }
      if (!seen.has(rel)) {
        seen.set(rel, { path: rel, classification: classify(absolute) });
      }
    }
  }
  return [...seen.keys()].sort().map((key) => seen.get(key) as HarnessElement);
}

// json.dumps(elements, ensure_ascii=False) の既定の区切り文字は ", " と ": "
// (カンマとコロンの後にそれぞれ空白 1 つ) であり、indent を渡さない JSON.stringify は
// どちらの空白も付けない。凍結したフィクスチャ
// (skills/_lib/tests/fixtures/harness-elements-cases.json) は実際の python3 CLI の
// stdout をバイト単位で記録しているため、main() の wire format は JSON.stringify の
// 既定ではなくこの区切り方に合わせる。各フィールドはそれ自体を JSON.stringify に通して
// エスケープしており、この集団が持つ ASCII のパスと分類については json.dumps の
// エスケープと一致する。
function toPythonJson(elements: readonly HarnessElement[]): string {
  const items = elements.map(
    (element) =>
      `{"path": ${JSON.stringify(element.path)}, "classification": ${JSON.stringify(element.classification)}}`,
  );
  return `[${items.join(", ")}]`;
}

// Python の main(argv) は sys.argv (スクリプト名を含む) を受け取るため、そちらの
// `len(argv) != 2` はここでの `argv.length !== 1` にあたる: main() は
// process.argv.slice(2) を受け取る、harness_hash.ts の main() と同じ argv の規約。
export function main(argv: string[]): number {
  if (argv.length !== 1) {
    process.stderr.write("Usage: harness_elements.ts <repo-root>\n");
    return 2;
  }
  const elements = enumerate_elements(argv[0]);
  process.stdout.write(`${toPythonJson(elements)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
