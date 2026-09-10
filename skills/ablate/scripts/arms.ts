// The TypeScript side of skills/ablate/scripts/arms.py: the arm names, the run count and the
// pass threshold, and the two functions that build an arm's CLI command and read its
// measurement status. arms.py stays in the tree through #646 -- report.py and usage_counts.py
// still import it as a Python module, and skills/ablate/SKILL.md:43 still shells out to a
// `python3 -c '... import report ...'` path that reaches it -- so both sides carry the same
// names until that slice retires the Python side.
//
// Constant and function names stay exactly as arms.py declares them, not camelCased the way
// hook_payload.ts renames hook_payload.py's edited_file: skills/ablate/tests/arms-parity.test.ts
// (a later unit of this same plan) spawns python3, collects arms.py's public names, and
// compares them against this module's export names as a set, so a renamed export here would
// read as a name only one side has.

export const WIPED = "wiped";
export const WIPED_PLUS_ONE = "wiped+1";
export const FULL_HARNESS = "full-harness";
export const ARMS: readonly string[] = [WIPED, WIPED_PLUS_ONE, FULL_HARNESS];

// The headless invocation every arm starts from. --print puts the session in non-interactive
// mode and --output-format json gives a parseable result instead of a text transcript
// (verified against https://docs.claude.com/en/docs/claude-code/cli-reference).
export const BASE_COMMAND: readonly string[] = ["claude", "--print", "--output-format", "json"];

// How many times one arm is run before its result counts as measured. 5 is a provisional
// floor against single-run noise; revisit once the first ablation run's variance is measured
// (see skills/scribe/scripts/triage.ts's COMMIT_CAP for the same provisional shape).
export const RUN_COUNT = 5;

// The share of an arm's runs that must reproduce the harness-present behavior for the arm to
// be judged passed.
export const PASS_THRESHOLD = 0.8;

export const UNMEASURED = "unmeasured";
export const MEASURED = "measured";

/** The CLI command for one arm.
 *
 * wiped restricts settings loading to the project source alone (--setting-sources project),
 * which is the ablation baseline. wiped+1 starts from that same baseline and restores exactly
 * one harness element by appending it to the system prompt (--append-system-prompt), rather
 * than reloading it through normal discovery. full-harness runs unmodified, with no
 * restricting flag, as the upper-bound comparison point. */
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

/** MEASURED once an arm has reached RUN_COUNT runs, otherwise UNMEASURED. */
export function measurement_status(runs: number): string {
  return runs >= RUN_COUNT ? MEASURED : UNMEASURED;
}
