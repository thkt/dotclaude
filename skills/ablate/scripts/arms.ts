// TypeScript port of the Python arm helper this module replaces: the arm names, the run count
// and the pass threshold, and the two functions that build an arm's CLI command and read its
// measurement status.
//
// Constant and function names stay exactly as the Python version declared them, not camelCased
// the way hook_payload.ts renames hook_payload.py's edited_file.

import { statSync } from "node:fs";
import { classify, SKILL_REFERENCE } from "../../_lib/harness_elements.ts";

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

/** Whether `element` is a skill-reference harness element: a real file that classify()
 * (skills/_lib/harness_elements.ts) reports as SKILL_REFERENCE. A path that does not resolve
 * to a file -- absent from disk, or a directory -- is never treated as skill-reference here,
 * the explicit statSync(path).isFile() guard docs/wiki/is-file-guard-lost-in-port.md calls
 * for, the same try/catch shape harness_elements.ts's own _is_skill_reference uses. */
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

/** The CLI command for one arm.
 *
 * wiped restricts settings loading to the project source alone (--setting-sources project),
 * which is the ablation baseline. wiped+1 starts from that same baseline and restores exactly
 * one harness element by having the CLI read the element file and append its content to the
 * system prompt (--append-system-prompt-file), rather than reloading it through normal
 * discovery. The path resolves against the run's cwd, the repo root. A skill-reference element
 * (a skills/<name>/references/<file>.md page the skill itself already pulls in) is refused:
 * restoring it through --append-system-prompt-file would double-load content the wiped
 * baseline never actually dropped, so the ablation could not isolate that element's effect.
 * full-harness runs unmodified, with no restricting flag, as the upper-bound comparison
 * point. */
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

/** MEASURED once an arm has reached RUN_COUNT runs, otherwise UNMEASURED. */
export function measurement_status(runs: number): string {
  return runs >= RUN_COUNT ? MEASURED : UNMEASURED;
}
