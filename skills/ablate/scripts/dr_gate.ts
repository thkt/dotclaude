/// <reference types="node" />
// The TypeScript side of skills/ablate/scripts/dr_gate.py: DR cross-reference gate for delete
// candidates in the ablate skill. dr_gate.py stays live as report.py's import source until
// that slice retires the Python side, so both sides carry the same names until then.
//
// The lookup searches DR bodies for the path text because no DR maps a path to itself through
// any machine-readable field yet.
//
// Constant and function names stay exactly as dr_gate.py declares them, the same no-camelCase
// convention arms.ts and verdict.ts hold.
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DELETE_CANDIDATE } from "./verdict.ts";

// Returned in place of the input verdict when a delete candidate traces to a DR whose
// Reassessment Triggers carry no confirmation record. Kept out of verdict.ts: this is
// dr_gate's own outcome, not a fourth verdict.classify can return.
export const HELD = "held";

// Handed to node:fs's globSync unexpanded, never hand-copied as an expanded file list
// (docs/wiki/path-reference-audit.md). Same glob text as dr_gate.py's _DR_GLOB, so the two
// sides walk the same DR set.
const _DR_GLOB = "docs/decisions/*.md";

// The section this gate reads for a confirmation record. Both "## " and "### " occur across
// docs/decisions/*.md depending on the DR's heading depth, so the pattern matches either.
const _TRIGGERS_HEADING = /^#{2,3}\s+Reassessment Triggers\s*$/m;

// A line reading "Confirmed unmet: {date}" states that someone already checked the
// Reassessment Triggers and found them not yet met.
const _CONFIRMED_UNMET = /^Confirmed unmet:/m;

/** The first _DR_GLOB match under `root` whose body mentions `path`, paired with that
 * body's text, or null when no DR mentions it. Returns the text alongside the path so a
 * caller reading the matched DR's body does not open the same file a second time. */
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

/** True when the DR's Reassessment Triggers section is followed by a confirmation
 * record before the next heading (or the end of the file). */
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

/** Read top to bottom; take the first row that matches. This gate only ever holds a
 * delete candidate back; every other verdict passes through untouched.
 *
 * | Condition                                                   | Result   |
 * | ----------------------------------------------------------- | -------- |
 * | verdict is not DELETE_CANDIDATE                             | verdict  |
 * | no DR governs path                                          | verdict  |
 * | the governing DR records its triggers confirmed unmet       | verdict  |
 * | Anything else (a live DR governs the path)                  | HELD     |
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
