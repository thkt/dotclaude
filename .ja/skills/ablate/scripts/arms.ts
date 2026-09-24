// このモジュールが置き換える Python 版の arm helper を TypeScript へ移植したもの。arm 名の
// 一覧、実行回数、合格閾値、そして arm の CLI コマンドを組む関数と測定状態を読む関数を持つ。
//
// 定数名と関数名は Python 版が宣言したとおりに保つ。hook_payload.ts が hook_payload.py の
// edited_file を camelCase に改名したのとは違う形。

import { statSync } from "node:fs";
import { classify, SKILL_REFERENCE } from "../../_lib/harness_elements.ts";

export const WIPED = "wiped";
export const WIPED_PLUS_ONE = "wiped+1";
export const FULL_HARNESS = "full-harness";
export const ARMS: readonly string[] = [WIPED, WIPED_PLUS_ONE, FULL_HARNESS];

// 各 arm の起点となる headless 起動コマンド。--print で非対話モードに入り、
// --output-format json でテキスト transcript ではなくパース可能な結果を得る
// (https://docs.claude.com/en/docs/claude-code/cli-reference で確認済み)。
export const BASE_COMMAND: readonly string[] = ["claude", "--print", "--output-format", "json"];

// 1つの arm の結果が measured と数えられるまでの実行回数。5 は単発実行のノイズに対する
// 暫定的な下限値であり、最初の ablation 実行の分散を測定したら見直す
// (同じ暫定的な形として skills/scribe/scripts/triage.ts の COMMIT_CAP を参照)。
export const RUN_COUNT = 5;

// arm が合格と判定されるために、harness-present の挙動を再現しなければならない
// 実行回数の割合。
export const PASS_THRESHOLD = 0.8;

export const UNMEASURED = "unmeasured";
export const MEASURED = "measured";

/** `element` が skill-reference な harness element かどうか。実ファイルであり、かつ
 * classify() (skills/_lib/harness_elements.ts) が SKILL_REFERENCE と判定した場合のみ真。
 * ファイルに解決しない path (ディスク上に無い、またはディレクトリ) は skill-reference と
 * 扱わない -- docs/wiki/is-file-guard-lost-in-port.md が求める明示的な
 * statSync(path).isFile() ガードであり、harness_elements.ts 自身の _is_skill_reference と
 * 同じ try/catch の形。 */
function isSkillReferenceElement(element: string): boolean {
  try {
    if (!statSync(element).isFile()) {
      return false;
    }
  } catch {
    return false;
  }
  return classify(element) === SKILL_REFERENCE;
}

/** 1つの arm の CLI コマンド。
 *
 * wiped は設定読み込みを project source のみに制限し (--setting-sources project)、
 * これが ablation の baseline となる。wiped+1 は同じ baseline から始め、
 * 通常の discovery を通して再読み込みするのではなく、element ファイルの中身を CLI に読ませて
 * system prompt に追記する形 (--append-system-prompt-file) で harness element を1つだけ復元する。
 * path は実行時の cwd (リポジトリ root) から解決される。skill-reference な element
 * (skill 自身が既に読み込んでいる skills/<name>/references/<file>.md ページ) は拒否する:
 * --append-system-prompt-file で復元すると、wiped baseline が実際には取り除いていない
 * 内容を二重に読み込むことになり、ablation がその element の効果を切り分けられなくなる。
 * full-harness は制限フラグなしで無改変のまま実行し、上限側の比較対象となる。 */
export function arm_command(arm: string, element: string | null = null): string[] {
  const command = [...BASE_COMMAND];
  if (arm === WIPED || arm === WIPED_PLUS_ONE) {
    command.push("--setting-sources", "project");
  }
  if (arm === WIPED_PLUS_ONE) {
    if (element === null) {
      throw new Error(`arm ${JSON.stringify(WIPED_PLUS_ONE)} requires an element to restore`);
    }
    if (isSkillReferenceElement(element)) {
      throw new Error(
        `arm ${JSON.stringify(WIPED_PLUS_ONE)} refuses to restore ${element}: classify() reports ${SKILL_REFERENCE}`,
      );
    }
    command.push("--append-system-prompt-file", element);
  }
  return command;
}

/** arm が RUN_COUNT 回に達すると MEASURED、そうでなければ UNMEASURED。 */
export function measurement_status(runs: number): string {
  return runs >= RUN_COUNT ? MEASURED : UNMEASURED;
}
