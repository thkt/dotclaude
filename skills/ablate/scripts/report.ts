/// <reference types="node" />
// The TypeScript side of skills/ablate/scripts/report.py: mirrors build_report and the
// aggregation it calls (arms.ts, dr_gate.ts, enforcer_map.ts, usage_counts.ts, verdict.ts,
// ../../_lib/harness_elements.ts). report.py stays in the tree as report.ts's contract source
// until #646 retires the Python side, the same shape arms.ts's own header describes. render
// and write_report are report.py's own Markdown-writing concern, not part of what this unit
// carries; report.py's docstring already states this module is "Not a CLI entry point," so
// report.ts carries no shebang and no main() the way arms.ts, dr_gate.ts and verdict.ts do not
// either.
//
// Deviation from report.py: report.py reads a module-level TRANSCRIPTS_ROOT constant
// (Path.home() / ".claude" / "projects") from inside build_report. An ESM import binding
// cannot be rebound from a test file the way unittest.mock.patch.object rebinds a Python
// module attribute -- usage_counts.ts's window_days deviation note hits the same wall -- so
// this port threads TRANSCRIPTS_ROOT through as build_report's own `transcripts_root`
// parameter (defaulting to the module constant of the same name) instead: a caller drives it
// by passing a different value, never by patching a binding.
//
// Constant and function names stay exactly as report.py declares them, the same no-camelCase
// convention arms.ts, verdict.ts, dr_gate.ts, enforcer_map.ts and usage_counts.ts hold in this
// same directory.
import { homedir } from "node:os";
import { join } from "node:path";
import * as arms from "./arms.ts";
import * as dr_gate from "./dr_gate.ts";
import * as enforcer_map from "./enforcer_map.ts";
import type { EnforcerMapEntry } from "./enforcer_map.ts";
import { enumerate_elements } from "../../_lib/harness_elements.ts";
import type { HarnessElement } from "../../_lib/harness_elements.ts";
import * as usage_counts from "./usage_counts.ts";
import type { ElementUsage } from "./usage_counts.ts";
import * as verdict from "./verdict.ts";

// Held here once so every caller that does not override it reads the same value, the same
// reason report.py's own TRANSCRIPTS_ROOT comment gives.
export const TRANSCRIPTS_ROOT: string = join(homedir(), ".claude", "projects");

// The ablation apparatus's own script tree. A path under here is the code that produced the
// observation, not a harness element under test, so it must never appear in
// delete_candidates: deleting the apparatus that measures harness elements would remove the
// ability to keep measuring them. Copied from report.py's APPARATUS_DIR unchanged.
const APPARATUS_DIR = "skills/ablate/";

/** One entry of the `observations` list build_report reads: the caller-supplied record of one
 * harness element's trigger task, task set membership, and compliance, per report.py's
 * build_report and verdict.py's classify. */
export interface Observation {
  path: string;
  trigger_task?: string | null;
  task_set?: readonly string[] | null;
  complies?: boolean | null;
}

export interface TranscriptRange {
  count: number;
  date_range: { start: string | null; end: string | null };
}

export interface ReportResult {
  elements: HarnessElement[];
  arms: string[];
  verdicts: Record<string, string>;
  usage_verdicts: Record<string, string>;
  delete_candidates: string[];
  usage: Record<string, ElementUsage>;
  transcripts: TranscriptRange;
  enforcer_rows: EnforcerMapEntry[];
}

/** True when `path` sits inside APPARATUS_DIR (the ablate skill's own tree, matching
 * harness_elements.POPULATION_GLOBS's "skills/**\/scripts/*.py" the way
 * skills/ablate/scripts/report.ts itself does). Mirrors report.py's _is_apparatus; the paths
 * this module ever receives are already the posix-relative form globSync returns, so no
 * PurePosixPath normalization is needed on this side. */
function _is_apparatus(path: string): boolean {
  return path.startsWith(APPARATUS_DIR);
}

/** The usage verdict for one path, mirroring report.py's _usage_verdict. An element with no
 * transcript entry never fired, so it reaches classify as zero fires rather than being
 * skipped. */
function _usage_verdict(
  path: string,
  usage_elements: Record<string, ElementUsage>,
  now: Date,
): string {
  const entry = usage_elements[path];
  return usage_counts.classify(path, entry?.fires ?? 0, entry?.last_used ?? null, now);
}

/** Calls each preceding unit's script in turn and wires their outputs together, mirroring
 * report.py's build_report. `transcripts_root` replaces report.py's module-namespace
 * TRANSCRIPTS_ROOT read -- see the header deviation note above.
 *
 * dr_gate.gate runs after verdict.classify's one-sided judgment and before the result reaches
 * the returned dict, so a held candidate never enters delete_candidates below.
 *
 * usage_counts reads `transcripts_root` rather than `observations`, so the reader learns usage
 * from the report without also running an ablation arm. */
export function build_report(
  root: string,
  observations: readonly Observation[],
  transcripts_root: string = TRANSCRIPTS_ROOT,
  now: Date = new Date(),
): ReportResult {
  const elements = enumerate_elements(root);
  const usage = usage_counts.count_usage(transcripts_root);

  const verdicts: Record<string, string> = {};
  for (const observation of observations) {
    const path = observation.path;
    const task_set = observation.task_set != null ? new Set(observation.task_set) : null;
    const raw_verdict = verdict.classify(
      observation.trigger_task ?? null,
      task_set,
      observation.complies ?? null,
    );
    verdicts[path] = dr_gate.gate(path, raw_verdict, root);
  }

  const usagePaths = new Set<string>([...elements.map((element) => element.path), ...Object.keys(verdicts)]);
  const usage_verdicts: Record<string, string> = {};
  for (const path of usagePaths) {
    usage_verdicts[path] = _usage_verdict(path, usage.elements, now);
  }

  const delete_candidates = Object.keys(verdicts)
    .filter(
      (path) =>
        verdicts[path] === verdict.DELETE_CANDIDATE &&
        usage_verdicts[path] === verdict.DELETE_CANDIDATE &&
        !_is_apparatus(path),
    )
    .sort();

  return {
    elements,
    arms: [...arms.ARMS],
    verdicts,
    usage_verdicts,
    delete_candidates,
    usage: usage.elements,
    transcripts: { count: usage.transcript_count, date_range: usage.date_range },
    enforcer_rows: enforcer_map.map_all(root),
  };
}
