/// <reference types="node" />
// TypeScript port of the Python report script this module replaces: mirrors build_report,
// write_report, and the render pass write_report drives (_render/_table/_date_range), plus the
// aggregation build_report calls (arms.ts, dr_gate.ts, enforcer_map.ts, usage_counts.ts,
// verdict.ts, ../../_lib/harness_elements.ts). The Python version's docstring already stated
// this module is "Not a CLI entry point," so report.ts carries no shebang and no main() the way
// arms.ts, dr_gate.ts and verdict.ts do not either.
//
// Deviation from the Python version: it read a module-level TRANSCRIPTS_ROOT constant
// (Path.home() / ".claude" / "projects") from inside build_report. An ESM import binding
// cannot be rebound from a test file the way unittest.mock.patch.object rebinds a Python
// module attribute -- usage_counts.ts's window_days deviation note hits the same wall -- so
// this port threads TRANSCRIPTS_ROOT through as build_report's own `transcripts_root`
// parameter (defaulting to the module constant of the same name) instead: a caller drives it
// by passing a different value, never by patching a binding.
//
// Constant and function names stay exactly as the Python version declared them, the same
// no-camelCase convention arms.ts, verdict.ts, dr_gate.ts, enforcer_map.ts and usage_counts.ts
// hold in this same directory.
import { mkdirSync, writeFileSync } from "node:fs";
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
// reason the Python version's own TRANSCRIPTS_ROOT comment gave.
export const TRANSCRIPTS_ROOT: string = join(homedir(), ".claude", "projects");

// The ablation apparatus's own script tree. A path under here is the code that produced the
// observation, not a harness element under test, so it must never appear in
// delete_candidates: deleting the apparatus that measures harness elements would remove the
// ability to keep measuring them. Copied from the Python version's APPARATUS_DIR unchanged.
const APPARATUS_DIR = "skills/ablate/";

/** One entry of the `observations` list build_report reads: the caller-supplied record of one
 * harness element's trigger task, task set membership, and compliance, per build_report and
 * verdict's classify. */
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
 * harness_elements.POPULATION_GLOBS's "skills/**\/scripts/*.ts" the way
 * skills/ablate/scripts/report.ts itself does). Mirrors the Python version's _is_apparatus; the
 * paths this module ever receives are already the posix-relative form globSync returns, so no
 * PurePosixPath normalization is needed on this side. */
function _is_apparatus(path: string): boolean {
  return path.startsWith(APPARATUS_DIR);
}

/** The usage verdict for one path, mirroring the Python version's _usage_verdict. An element with no
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

/** Calls each preceding unit's script in turn and wires their outputs together, mirroring the
 * Python version's build_report. `transcripts_root` replaces its module-namespace
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

// The Python version named its written file with this constant appended after the UTC
// timestamp (REPORT_NAME = "ablate"). Copied unchanged.
const REPORT_NAME = "ablate";

/** The header + separator + data lines of a Markdown table, factored out because _render
 * builds every section's table from differently-shaped inputs -- one row-joining rule changed
 * here changes all of them. Column count comes from `headers`, so a two-column caller and a
 * wider one share the same rendering. Mirrors the Python version's _table. */
function _table(headers: readonly string[], rows: readonly (readonly string[])[]): string[] {
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  lines.push(...rows.map((row) => `| ${row.join(" | ")} |`));
  return lines;
}

/** The parsed transcripts' date span as one cell. A run whose transcripts hold no fire has no
 * span, and renders as "none" rather than as a pair of empty cells. Mirrors the Python
 * version's _date_range. */
function _date_range(date_range: { start: string | null; end: string | null }): string {
  const { start, end } = date_range;
  return start && end ? `${start} - ${end}` : "none";
}

/** Renders build_report's result as Markdown. Reads that result alone, never the raw
 * `observations` a caller passed in, so a field an observation carries for its own provenance
 * (such as the settings snapshot a run used) can never reach the written report, verbatim or
 * otherwise (T-014). Mirrors the Python version's _render; the section order below is the contract
 * skills/ablate/templates/report-template.md's skeleton names, and report-render.test.ts's
 * T-476 reads that file to check it, so this order must never drift from the template without
 * updating the template in the same change. */
function _render(result: ReportResult): string {
  const lines: string[] = ["# Ablation Report", ""];

  lines.push("## Summary", "");
  lines.push(
    ..._table(
      ["Metric", "Value"],
      [
        ["Harness elements enumerated", String(result.elements.length)],
        ["Arms", String(result.arms.length)],
        ["Elements observed", String(Object.keys(result.verdicts).length)],
        ["Delete candidates", String(result.delete_candidates.length)],
        ["Always-loaded lines mapped", String(result.enforcer_rows.length)],
        // Counted apart, since without this row the number is only reachable by scanning the
        // Verdicts table for the held literal.
        [
          "Held by a live DR",
          String(Object.values(result.verdicts).filter((v) => v === dr_gate.HELD).length),
        ],
        ["Transcripts parsed", String(result.transcripts.count)],
        ["Transcript date range", _date_range(result.transcripts.date_range)],
      ],
    ),
  );
  lines.push("");

  lines.push("## Always-Loaded Elements", "");
  lines.push(
    ..._table(
      ["File", "Line", "Verdict", "Enforcer"],
      result.enforcer_rows.map((row) => [
        row.file,
        String(row.line_number),
        row.verdict,
        row.enforcer ?? "",
      ]),
    ),
  );
  lines.push("");

  lines.push("## Harness Elements", "");
  lines.push(
    ..._table(
      ["Path", "Classification", "Fires", "Last Used", "Usage Verdict"],
      result.elements.map((element) => {
        const element_usage = result.usage[element.path] ?? { fires: 0, last_used: null };
        return [
          element.path,
          element.classification,
          String(element_usage.fires ?? 0),
          element_usage.last_used ?? "never",
          result.usage_verdicts[element.path],
        ];
      }),
    ),
  );
  lines.push("");

  lines.push("## Arms", "");
  lines.push(...result.arms.map((arm) => `- ${arm}`));
  lines.push("");

  lines.push("## Verdicts", "");
  lines.push(
    ..._table(
      ["Path", "Verdict"],
      Object.keys(result.verdicts)
        .sort()
        .map((path) => [path, result.verdicts[path]]),
    ),
  );
  lines.push("");

  lines.push("## Delete Candidates", "");
  lines.push(
    result.delete_candidates.length > 0
      ? result.delete_candidates.map((path) => `- ${path}`).join("\n")
      : "No delete candidates.",
  );
  lines.push("");

  return lines.join("\n");
}

/** Writes build_report's result under `out_dir` (defaulting to `<root>/docs/audit`) to
 * `<YYYY-MM-DD>-<HHMMSS>-ablate.md` in UTC (this module's convention, matching
 * skills/census/SKILL.md Phase 5's `date -u +%Y-%m-%d-%H%M%S` naming so same-day reruns from
 * different timezones never collide), mirroring the Python version's write_report and the `_render`
 * Markdown pass it calls. */
export function write_report(
  root: string,
  observations: readonly Observation[],
  out_dir?: string,
): string {
  const result = build_report(root, observations);
  const content = _render(result);

  const target_dir = out_dir ?? join(root, "docs", "audit");
  mkdirSync(target_dir, { recursive: true });

  const now = new Date();
  const pad2 = (value: number) => String(value).padStart(2, "0");
  // Python's `datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M%S")`, read off the UTC
  // getters so the shape holds regardless of the host's local timezone.
  const timestamp = [
    now.getUTCFullYear(),
    pad2(now.getUTCMonth() + 1),
    pad2(now.getUTCDate()),
    `${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}`,
  ].join("-");
  const report_path = join(target_dir, `${timestamp}-${REPORT_NAME}.md`);
  writeFileSync(report_path, content, "utf8");
  return report_path;
}
