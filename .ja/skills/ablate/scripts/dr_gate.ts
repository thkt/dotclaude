/// <reference types="node" />
// skills/ablate/scripts/dr_gate.py の TypeScript 側: ablate skill における削除候補への DR
// 突き合わせゲート。dr_gate.py は、この slice が Python 側を退役させるまで、report.py の
// import 元として生き続ける。両側は、それまで同じ名前を持つ。
//
// 照合が DR 本文をパス文字列で検索するのは、パスを自分自身へ写す機械可読フィールドを持つ DR
// がまだ無いため。
//
// 定数と関数名は dr_gate.py が宣言する通りに保つ。arms.ts と verdict.ts が持つ、camelCase
// にしないのと同じ convention。
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DELETE_CANDIDATE } from "./verdict.ts";

// 削除候補が、確認記録の無い Reassessment Triggers を持つ DR に紐づくときに、入力の verdict
// の代わりに返す。verdict.ts へ置かないのは、これが dr_gate 独自の結果であり、
// verdict.classify が返せる 4 つ目ではないため。
export const HELD = "held";

// 展開せず node:fs の globSync にそのまま渡し、展開済みのファイル一覧を手で書き写すことは
// しない (docs/wiki/path-reference-audit.md)。dr_gate.py の _DR_GLOB と同じ glob 文字列
// なので、両側は同じ DR 集合を歩く。
const _DR_GLOB = "docs/decisions/*.md";

// このゲートが確認記録を読みに行く節。docs/decisions/*.md には見出しの深さにより "## " と
// "### " の両方が現れるため、パターンはどちらにもマッチする。
const _TRIGGERS_HEADING = /^#{2,3}\s+Reassessment Triggers\s*$/m;

// DR ファイル内の "Confirmed unmet: {date}" という行は、誰かが既に Reassessment Triggers
// を確認し、まだ発火していないと判断したことを表す。
const _CONFIRMED_UNMET = /^Confirmed unmet:/m;

/** `root` 下の _DR_GLOB にマッチするファイルのうち、本文に `path` が現れる最初の
 * ファイルを、その本文テキストと組にして返す。どの DR も言及しないときは null。
 * テキストをパスと一緒に返すのは、呼び出し側が本文を読むときに同じファイルを二度
 * 開かずに済ませるため。 */
function _find_governing_dr(path: string, root: string): [string, string] | null {
  const matches = globSync(_DR_GLOB, { cwd: root }).sort();
  for (const relative of matches) {
    const dr_path = join(root, relative);
    const text = readFileSync(dr_path, "utf8");
    if (text.includes(path)) {
      return [dr_path, text];
    }
  }
  return null;
}

/** DR の Reassessment Triggers 節に続けて、次の見出し (または文書末) より前に確認記録
 * があるとき true。 */
function _confirmed_unmet(dr_text: string): boolean {
  const heading = _TRIGGERS_HEADING.exec(dr_text);
  if (heading === null) {
    return false;
  }
  const heading_end = heading.index + heading[0].length;
  const next_heading = /^#{1,6}\s+\S/m.exec(dr_text.slice(heading_end));
  const section_end = next_heading ? heading_end + next_heading.index : dr_text.length;
  const section = dr_text.slice(heading_end, section_end);
  return _CONFIRMED_UNMET.test(section);
}

/** 上から読んで最初に当たった行を採る。このゲートは削除候補を保留に落とすことしか
 * せず、それ以外の verdict はそのまま通す。
 *
 * | 条件                                             | 結果    |
 * | ------------------------------------------------ | ------- |
 * | verdict が DELETE_CANDIDATE でない               | verdict |
 * | path を支配する DR が無い                        | verdict |
 * | 支配する DR が trigger を未達と記録している      | verdict |
 * | それ以外 (生きている DR が path を支配する)      | HELD    |
 */
export function gate(path: string, verdict: string, root: string): string {
  if (verdict !== DELETE_CANDIDATE) {
    return verdict;
  }
  const found = _find_governing_dr(path, root);
  if (found === null) {
    return verdict;
  }
  const [, dr_text] = found;
  if (_confirmed_unmet(dr_text)) {
    return verdict;
  }
  return HELD;
}
