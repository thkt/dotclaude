// このモジュールが置き換える Python 版の verdict script を TypeScript へ移植したもの。
// DELETE_CANDIDATE、NEEDS_HUMAN_JUDGMENT、KEEP、そして判定表を読む classify 関数を持つ。
// UNMEASURED はここで再宣言しない -- classify は arms.ts から読む。arms.ts は
// measurement_status のためにすでに UNMEASURED を export しており、classify の「まだ観測
// されていない」判定と arms.ts の「実行回数がまだ足りない」判定は、こうして同じ文字列を
// 1箇所だけに持つ。
//
// 定数名と関数名は Python 版が宣言したとおりに保つ。arms.ts が持つ no-camelCase 規約と
// 同じ形。
import { UNMEASURED } from "./arms.ts";

export const DELETE_CANDIDATE = "delete-candidate";
export const NEEDS_HUMAN_JUDGMENT = "needs-human-judgment";
export const KEEP = "keep";

/** 1つの要素の観測結果を、wiped arm (`complies`) と wiped+1 arm (`restored_complies`) の比較で
 * DELETE_CANDIDATE、KEEP、NEEDS_HUMAN_JUDGMENT、UNMEASURED のいずれかに割り当てる。
 * 上から読んで最初に当たった行を採る:
 *
 * | Condition                                                                        | Verdict              |
 * | --------------------------------------------------------------------------------- | -------------------- |
 * | trigger_task is null, task_set is null, or trigger_task is absent from task_set | UNMEASURED           |
 * | either arm is not yet observed                                                   | UNMEASURED           |
 * | both arms comply                                                                 | DELETE_CANDIDATE     |
 * | the wiped arm violates and the wiped+1 arm complies                             | KEEP                 |
 * | the wiped+1 arm violates                                                         | NEEDS_HUMAN_JUDGMENT |
 *
 * 判定対象の trigger_task が今回の task_set で一度も実行されていない要素は、観測そのものを
 * 持たない。そのためこの行を最初にチェックし、arm の結果に関わらずこの行が勝つ。要素を戻しても
 * 規則が守られないなら、その規則を決めているのはこの要素ではないので、人が transcript を読む。 */
export function classify(
  trigger_task: string | null = null,
  task_set: Set<string> | null = null,
  complies: boolean | null = null,
  restored_complies: boolean | null = null,
): string {
  if (task_set === null || trigger_task === null || !task_set.has(trigger_task)) {
    return UNMEASURED;
  }
  if (complies === null || restored_complies === null) {
    return UNMEASURED;
  }
  if (restored_complies) {
    return complies ? DELETE_CANDIDATE : KEEP;
  }
  return NEEDS_HUMAN_JUDGMENT;
}
