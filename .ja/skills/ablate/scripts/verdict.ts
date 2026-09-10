// skills/ablate/scripts/verdict.py の TypeScript 側。DELETE_CANDIDATE、NEEDS_HUMAN_JUDGMENT、
// そして同じ判定表を読む classify 関数を持つ。UNMEASURED はここで再宣言しない -- classify の
// Green step で arms.ts から読む。arms.ts は measurement_status のためにすでに UNMEASURED を
// export しており、classify の「まだ観測されていない」判定と arms.ts の「実行回数がまだ足り
// ない」判定は、こうして同じ文字列を1箇所だけに持つ。verdict.py は arms.py と同じ形で木に
// 残る (arms.ts のヘッダを参照): report.py は #646 が Python 側を退役させるまで、今も
// これを Python module として import しているため、それまで両側が同じ名前を持つ。
//
// 定数名と関数名は verdict.py が宣言したとおりに保つ。arms.ts が持つ no-camelCase 規約と
// 同じ形。
import { UNMEASURED } from "./arms.ts";

export const DELETE_CANDIDATE = "delete-candidate";
export const NEEDS_HUMAN_JUDGMENT = "needs-human-judgment";

/** 1つの arm element の観測結果を DELETE_CANDIDATE、NEEDS_HUMAN_JUDGMENT、UNMEASURED の
 * いずれかに割り当てる。上から読んで最初に当たった行を採る。verdict.py を写す:
 *
 * | Condition                                                                   | Verdict              |
 * | ---------------------------------------------------------------------------- | --------------------- |
 * | trigger_task is null, task_set is null, or trigger_task is absent from task_set | UNMEASURED            |
 * | complies is true                                                              | DELETE_CANDIDATE      |
 * | complies is false                                                             | NEEDS_HUMAN_JUDGMENT  |
 * | Anything else (compliance not yet observed)                                  | UNMEASURED            |
 *
 * 判定対象の trigger_task が今回の task_set で一度も実行されていない要素は、観測そのものを
 * 持たない。そのためこの行を最初にチェックし、complies の値に関わらずこの行が勝つ。 */
export function classify(
  trigger_task: string | null = null,
  task_set: Set<string> | null = null,
  complies: boolean | null = null,
): string {
  if (task_set === null || trigger_task === null || !task_set.has(trigger_task)) {
    return UNMEASURED;
  }
  if (complies === true) {
    return DELETE_CANDIDATE;
  }
  if (complies === false) {
    return NEEDS_HUMAN_JUDGMENT;
  }
  return UNMEASURED;
}
