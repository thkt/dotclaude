#!/usr/bin/env node
/// <reference types="node" />
// Usage: pick-plan.ts <issue-title | plan-path> [planning-dir]
//
// パスを渡すとその下書きの節を切り出し、タイトルを渡すと planning-dir の下書きを順位付けする。
//
// stdout: JSON { path, slug, date, plan, backlog, candidates, ambiguous }
//         path       選んだファイル。得点が 0 か同点なら null
//         plan       見出しを含む `## Plan` 節。無ければ null
//         backlog    見出しを含む `## Backlog candidates` 節。無ければ null
//         candidates 日付の新しい順の全下書き。各 { path, slug, date, score }
//         ambiguous  最高得点が複数あるとき true
// exit: 一致しない場合も含めて常に 0。ディレクトリが無いのは失敗でなく不一致。planning を
//       していない時点の起票は通常の経路で、skill を止めてはならない。必須引数の
//       <issue-title | plan-path> が無いときだけ 1。
//
// 退役した Python 版の TypeScript 移植。Contract: 元の slugify / scoring_words / section /
// extracted / rank / main。skills/issue/tests/pick-plan.test.ts が検証する。Python の
// snake_case な名前は TS 側では camelCase になる (scoring_words -> scoringWords)。rank、
// slugify、section はテストのために export し、残りは harness_hash.ts が自分の内部実装を
// private のままにしているのと同じ形で module-private のままにする。
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// 日付を名前から読むのは、issue skill に許されたどの道具も mtime を返さないため。
const NAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.plan\.md$/;

// スクリプト自身の位置に対して解決せず、あえて相対パスのまま残す。退役した Python 版の
// `Path(".claude/workspace/planning")` と同じく、呼び出し側の cwd に対して読む。
const DEFAULT_DIR = ".claude/workspace/planning";

interface Draft {
  path: string;
  slug: string;
  date: string;
  score: number;
}

interface Extracted {
  path: string;
  slug: string | null;
  date: string | null;
  plan: string | null;
  backlog: string | null;
}

interface PickPlanResult {
  path: string | null;
  slug: string | null;
  date: string | null;
  plan: string | null;
  backlog: string | null;
  candidates: Draft[];
  ambiguous: boolean;
}

/** タイトルを /think の slug の形へ落とす。小文字、ハイフン区切り。
 *
 * 型の接頭辞は先に落とす。`[Feature] Add CSV export` は add-csv-export で書かれるので、
 * 角括弧を残すとどのタイトルも自分の下書きに当たらなくなる。
 */
export function slugify(title: string): string {
  let text = title.normalize("NFKC");
  text = text.replace(/^\[[A-Za-z]+\]\s*/, "");
  // \w is Unicode-aware in Python; \p{L}\p{N}_ under the u flag is the same class in JS.
  text = text.replace(/[^\p{L}\p{N}_\s-]/gu, " ");
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .join("-")
    .toLowerCase();
}

/** 得点に数える語。2 字以下はどの slug にも当たるので落とす。 */
function scoringWords(slug: string): Set<string> {
  return new Set(slug.split("-").filter((word) => word.length > 2));
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const word of a) {
    if (b.has(word)) count += 1;
  }
  return count;
}

/** 見出しを含む `## <name>` 節 1 つ。次の h2 か末尾まで。 */
export function section(text: string, name: string): string | null {
  const headings = /^## (.+?)\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = headings.exec(text)) !== null) {
    if (match[1] !== name) continue;
    const rest = text.slice(match.index + match[0].length);
    const following = /^## (.+?)\s*$/m.exec(rest);
    const body = following ? rest.slice(0, following.index) : rest;
    return `${match[0]}${body}`.trimEnd() + "\n";
  }
  return null;
}

/** 下書き 1 件から読む出力用の値。 */
function extracted(path: string): Extracted {
  const text = readFileSync(path, "utf8");
  const parsed = NAME.exec(basename(path));
  return {
    path,
    slug: parsed ? parsed[2] : null,
    date: parsed ? parsed[1] : null,
    plan: section(text, "Plan"),
    backlog: section(text, "Backlog candidates"),
  };
}

/** ディレクトリ内の全下書き。得点の高い順、同点なら日付の新しい順。 */
export function rank(title: string, directory: string): Draft[] {
  const wanted = scoringWords(slugify(title));
  const rows: Draft[] = [];
  if (existsSync(directory) && statSync(directory).isDirectory()) {
    const names = readdirSync(directory).sort();
    for (const name of names) {
      const parsed = NAME.exec(name);
      if (!parsed) continue;
      const slug = parsed[2];
      rows.push({
        path: join(directory, name),
        slug,
        date: parsed[1],
        score: intersectionSize(wanted, scoringWords(slug)),
      });
    }
  }
  // (score, date) を安定ソートで降順に並べる。Python の安定ソートに対する `reverse=True` は
  // 同点の行を反転せず、元の (name の昇順の) 並びのまま保つ。
  rows.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.date === b.date) return 0;
    return a.date < b.date ? 1 : -1;
  });
  return rows;
}

export function main(argv: string[]): number {
  if (argv.length < 1) {
    process.stderr.write("Usage: pick-plan.ts <issue-title | plan-path> [planning-dir]\n");
    return 1;
  }
  const directory = argv.length > 1 ? argv[1] : DEFAULT_DIR;

  const result: PickPlanResult = {
    path: null,
    slug: null,
    date: null,
    plan: null,
    backlog: null,
    candidates: [],
    ambiguous: false,
  };

  const given = argv[0];
  if (extname(given) === ".md" && existsSync(given) && statSync(given).isFile()) {
    Object.assign(result, extracted(given));
  } else {
    const rows = rank(given, directory);
    const scored = rows.filter((row) => row.score > 0);
    const top = scored.length > 0 ? scored.filter((row) => row.score === scored[0].score) : [];
    result.candidates = rows;
    result.ambiguous = top.length > 1;
    if (top.length === 1) {
      Object.assign(result, extracted(top[0].path));
    }
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
