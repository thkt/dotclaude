// TypeScript port of the Python verdict script this module replaces: DELETE_CANDIDATE,
// NEEDS_HUMAN_JUDGMENT, KEEP, and the classify function that reads the decision table.
// UNMEASURED is not redeclared here -- classify reads it from arms.ts, which already exports
// it for measurement_status, so classify's "not yet observed" verdict and arms.ts's "not
// enough runs yet" verdict stay the same string in one place.
//
// Constant and function names stay exactly as the Python version declared them, the same
// no-camelCase convention arms.ts holds.
import { UNMEASURED } from "./arms.ts";

export const DELETE_CANDIDATE = "delete-candidate";
export const NEEDS_HUMAN_JUDGMENT = "needs-human-judgment";
export const KEEP = "keep";

/** Assign one element's observation to DELETE_CANDIDATE, KEEP, NEEDS_HUMAN_JUDGMENT, or
 * UNMEASURED by comparing the wiped arm (`complies`) with the wiped+1 arm (`restored_complies`).
 * Read top to bottom; take the first row that matches:
 *
 * | Condition                                                                        | Verdict              |
 * | --------------------------------------------------------------------------------- | -------------------- |
 * | trigger_task is null, task_set is null, or trigger_task is absent from task_set | UNMEASURED           |
 * | either arm is not yet observed                                                   | UNMEASURED           |
 * | both arms comply                                                                 | DELETE_CANDIDATE     |
 * | the wiped arm violates and the wiped+1 arm complies                             | KEEP                 |
 * | the wiped+1 arm violates                                                         | NEEDS_HUMAN_JUDGMENT |
 *
 * An element whose triggering task never ran in this task set carries no observation at all,
 * so that row is checked first and wins over whatever the arms say. When restoring the element
 * does not bring compliance back, the element is not what decides the rule, so a human reads
 * the transcripts. */
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
