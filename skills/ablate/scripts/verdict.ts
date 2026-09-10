// The TypeScript side of skills/ablate/scripts/verdict.py: DELETE_CANDIDATE,
// NEEDS_HUMAN_JUDGMENT, and the classify function that reads the same decision table.
// UNMEASURED is not redeclared here -- classify's Green step reads it from arms.ts, which
// already exports it for measurement_status, so classify's "not yet observed" verdict and
// arms.ts's "not enough runs yet" verdict stay the same string in one place. verdict.py stays
// in the tree the same way arms.py does (see arms.ts's header): report.py still imports it as
// a Python module until #646 retires the Python side, so both sides carry the same names
// until then.
//
// Constant and function names stay exactly as verdict.py declares them, the same
// no-camelCase convention arms.ts holds.
import { UNMEASURED } from "./arms.ts";

export const DELETE_CANDIDATE = "delete-candidate";
export const NEEDS_HUMAN_JUDGMENT = "needs-human-judgment";

/** Assign one arm element's observation to DELETE_CANDIDATE, NEEDS_HUMAN_JUDGMENT, or
 * UNMEASURED. Read top to bottom; take the first row that matches, mirroring verdict.py:
 *
 * | Condition                                                                   | Verdict              |
 * | ---------------------------------------------------------------------------- | --------------------- |
 * | trigger_task is null, task_set is null, or trigger_task is absent from task_set | UNMEASURED            |
 * | complies is true                                                              | DELETE_CANDIDATE      |
 * | complies is false                                                             | NEEDS_HUMAN_JUDGMENT  |
 * | Anything else (compliance not yet observed)                                  | UNMEASURED            |
 *
 * An element whose triggering task never ran in this task set carries no observation at all,
 * so that row is checked first and wins over whatever `complies` says. */
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
