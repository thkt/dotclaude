/// <reference types="node" />
// Aggregates one reference-arm's per-run observations into the complies value
// skills/ablate/scripts/verdict.ts's classify() reads (its `complies` for the wiped arm,
// its `restored_complies` for the wiped+1 arm -- this module runs once per arm, the caller
// passes each arm's own runs), and reports the clean case's false-positive rate apart from it.
// Exposure and contamination come from U-002's classify_exposure (exposure.ts); a
// planted-defect hit comes from U-003's is_hit (reference_match.ts). RUN_COUNT and
// PASS_THRESHOLD come from arms.ts, never rewritten here as literals.
//
// Constant and function names stay snake_case, the convention arms.ts, verdict.ts,
// reference_arm.ts, exposure.ts and reference_match.ts hold in this same directory.

import { PASS_THRESHOLD, RUN_COUNT } from "./arms.ts";
import { classify_exposure } from "./exposure.ts";
import { is_hit, type Finding, type PlantedDefect } from "./reference_match.ts";

/** One run's transcript, the fixture cwd it was launched from (exposure.ts's classify_exposure
 * reads paths relative to it), and the findings the reviewer agent reported for it. */
export interface ObservedRun {
  transcript: string;
  cwd: string;
  findings: Finding[];
}

/** The complies value skills/ablate/scripts/verdict.ts's classify() reads for one arm
 * (`complies` for the wiped arm, `restored_complies` for the wiped+1 arm), plus how many of
 * the arm's runs were counted (exposed and not contaminated, per exposure.ts's
 * classify_exposure) and how many of those counted runs hit the planted defect (per
 * reference_match.ts's is_hit). `complies` is null, so classify() reads it as unmeasured, when
 * counted_runs has not reached arms.ts's RUN_COUNT. */
export interface ArmObservation {
  complies: boolean | null;
  counted_runs: number;
  hit_runs: number;
}

/** The clean case's false-positive rate, reported apart from ArmObservation's `complies`: a
 * clean-case run carries no planted defect, so any finding it reports against the clean
 * corpus file is a false positive rather than a hit. */
export interface CleanCaseObservation {
  false_positive_rate: number | null;
  counted_runs: number;
  false_positive_runs: number;
}

/** `runs` filtered down to the ones exposure.ts's classify_exposure (U-002) reports exposed and
 * not contaminated against `element` and `root` -- the counted-run set observe_arm and
 * observe_clean_case both aggregate over. */
function counted_runs(runs: readonly ObservedRun[], element: string, root: string): ObservedRun[] {
  return runs.filter((run) => {
    const { exposed, contaminated } = classify_exposure(run.transcript, element, run.cwd, root);
    return exposed && !contaminated;
  });
}

/** Aggregates one arm's `runs` into an ArmObservation against `element` and the single
 * `defect` planted into its corpus, scoped to the real repository at `root` (the same `root`
 * exposure.ts's classify_exposure reads contamination against). A run counts only when
 * classify_exposure reports it exposed and not contaminated; among the counted runs, a hit is
 * judged by reference_match.ts's is_hit (U-003) against `defect`. `complies` is null -- and
 * verdict.ts's classify then reports UNMEASURED for it -- until counted_runs reaches
 * arms.ts's RUN_COUNT; once it does, `complies` is whether the hit share of counted_runs meets
 * arms.ts's PASS_THRESHOLD. */
export function observe_arm(
  runs: readonly ObservedRun[],
  element: string,
  root: string,
  defect: PlantedDefect,
): ArmObservation {
  const counted = counted_runs(runs, element, root);
  const hit_runs = counted.filter((run) =>
    run.findings.some((finding) => is_hit(finding, defect)),
  ).length;
  const complies = counted.length < RUN_COUNT ? null : hit_runs / counted.length >= PASS_THRESHOLD;
  return { complies, counted_runs: counted.length, hit_runs };
}

/** Aggregates the clean case's `runs` into a CleanCaseObservation against `element`, scoped to
 * the real repository at `root`. A run counts only when classify_exposure reports it exposed
 * and not contaminated, the same counted-run definition observe_arm uses. The clean case's
 * corpus carries no planted defect, so a counted run is a false positive when it reports any
 * finding against `cleanCorpusFile`, the file the reviewer reviewed. `element` is the guidance
 * page under measurement, which the reviewer reads but never reviews.
 * `false_positive_rate` is null -- the same unmeasured shape observe_arm's `complies` takes --
 * until counted_runs reaches arms.ts's RUN_COUNT. */
export function observe_clean_case(
  runs: readonly ObservedRun[],
  element: string,
  root: string,
  cleanCorpusFile: string,
): CleanCaseObservation {
  const counted = counted_runs(runs, element, root);
  const false_positive_runs = counted.filter((run) =>
    run.findings.some((finding) => finding.file === cleanCorpusFile),
  ).length;
  const false_positive_rate =
    counted.length < RUN_COUNT ? null : false_positive_runs / counted.length;
  return { false_positive_rate, counted_runs: counted.length, false_positive_runs };
}
