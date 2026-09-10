// skills/ablate/scripts/arms.py の TypeScript 側。arm 名の一覧、実行回数、合格閾値、そして
// arm の CLI コマンドを組む関数と測定状態を読む関数を持つ。arms.py は #646 まで木に残る --
// report.py と usage_counts.py が今も Python module としてこれを import しており、
// skills/ablate/SKILL.md:43 も `python3 -c '... import report ...'` でそこへ届く経路を
// 今も実行するため、その slice が Python 側を退役させるまで両側が同じ名前を持つ。
//
// 定数名と関数名は arms.py が宣言したとおりに保つ。hook_payload.ts が hook_payload.py の
// edited_file を camelCase に改名したのとは違う形。skills/ablate/tests/arms-parity.test.ts
// (本計画の後続 unit) が python3 を spawn して arms.py の公開名を集め、この module の
// export 名と集合として突き合わせるため、ここで改名すると片側にしかない名前として読まれる。

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

/** 1つの arm の CLI コマンド。
 *
 * wiped は設定読み込みを project source のみに制限し (--setting-sources project)、
 * これが ablation の baseline となる。wiped+1 は同じ baseline から始め、
 * 通常の discovery を通して再読み込みするのではなく、system prompt に追記する形
 * (--append-system-prompt) で harness element を1つだけ復元する。full-harness は
 * 制限フラグなしで無改変のまま実行し、上限側の比較対象となる。 */
export function arm_command(arm: string, element: string | null = null): string[] {
  const command = [...BASE_COMMAND];
  if (arm === WIPED || arm === WIPED_PLUS_ONE) {
    command.push("--setting-sources", "project");
  }
  if (arm === WIPED_PLUS_ONE) {
    if (element === null) {
      throw new Error(`arm ${JSON.stringify(WIPED_PLUS_ONE)} requires an element to restore`);
    }
    command.push("--append-system-prompt", `[ablate] restoring element: ${element}`);
  }
  return command;
}

/** arm が RUN_COUNT 回に達すると MEASURED、そうでなければ UNMEASURED。 */
export function measurement_status(runs: number): string {
  return runs >= RUN_COUNT ? MEASURED : UNMEASURED;
}
