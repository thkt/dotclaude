/// <reference types="node" />
// 1つの reference-arm が持つ run 単位の観測結果を集約し、skills/ablate/scripts/verdict.ts の
// classify() が読む complies の値にする (wiped arm については `complies`、wiped+1 arm に
// ついては `restored_complies` -- このモジュールは arm ごとに1回呼ばれ、呼び出し側がその arm
// 自身の run を渡す)。clean case の誤検知率はそれとは別に報告する。露出と汚染は U-002 の
// classify_exposure (exposure.ts) から、仕込んだ欠陥への当たりは U-003 の is_hit
// (reference_match.ts) から得る。RUN_COUNT と PASS_THRESHOLD は arms.ts から import し、
// ここに数値として書き写さない。
//
// 定数名と関数名は snake_case のまま保つ。arms.ts、verdict.ts、reference_arm.ts、
// exposure.ts、reference_match.ts が同じディレクトリで守る規約と同じ。

import { PASS_THRESHOLD, RUN_COUNT } from "./arms.ts";
import { classify_exposure } from "./exposure.ts";
import { is_hit, type Finding, type PlantedDefect } from "./reference_match.ts";

/** 1つの run の transcript、それを起動した fixture の cwd (exposure.ts の classify_exposure
 * がこれを基準にパスを読む)、そして reviewer agent がその run で報告した findings。 */
export interface ObservedRun {
  transcript: string;
  cwd: string;
  findings: Finding[];
}

/** skills/ablate/scripts/verdict.ts の classify() が1つの arm について読む complies の値
 * (wiped arm については `complies`、wiped+1 arm については `restored_complies`)。加えて、
 * その arm の run のうち何本が数えられたか (exposure.ts の classify_exposure による、露出済み
 * かつ非汚染) と、数えられた run のうち何本が仕込んだ欠陥に当たったか (reference_match.ts の
 * is_hit による)。counted_runs が arms.ts の RUN_COUNT に達していなければ `complies` は
 * null になり、classify() はそれを unmeasured と読む。 */
export interface ArmObservation {
  complies: boolean | null;
  counted_runs: number;
  hit_runs: number;
}

/** clean case の誤検知率。ArmObservation の `complies` とは別に報告する: clean case の run は
 * 仕込んだ欠陥を持たないので、clean case の corpus ファイルについて報告された finding は当たり
 * ではなく誤検知になる。 */
export interface CleanCaseObservation {
  false_positive_rate: number | null;
  counted_runs: number;
  false_positive_runs: number;
}

/** `runs` のうち、exposure.ts の classify_exposure (U-002) が `element` と `root` に対して
 * 露出済みかつ非汚染と判定したものだけを残した配列 -- observe_arm と observe_clean_case が
 * 共に集約対象とする、数えられる run の集合。 */
function counted_runs(runs: readonly ObservedRun[], element: string, root: string): ObservedRun[] {
  return runs.filter((run) => {
    const { exposed, contaminated } = classify_exposure(run.transcript, element, run.cwd, root);
    return exposed && !contaminated;
  });
}

/** 1つの arm の `runs` を、`element` とその corpus に仕込んだ単一の `defect` に対して
 * ArmObservation へ集約する。`root` は実リポジトリを指し、exposure.ts の classify_exposure が
 * 汚染を読むときと同じ `root`。classify_exposure が露出済みかつ非汚染と判定した run だけを
 * 数え、数えられた run のうち当たりは reference_match.ts の is_hit (U-003) が `defect` に
 * 対して判定する。counted_runs が arms.ts の RUN_COUNT に達するまで `complies` は null に
 * なり -- verdict.ts の classify はそれを UNMEASURED と読む --、達した時点で `complies` は
 * counted_runs のうち当たりの割合が arms.ts の PASS_THRESHOLD に達しているかどうかになる。 */
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

/** clean case の `runs` を、`element` に対して CleanCaseObservation へ集約する。`root` は
 * 実リポジトリを指す。observe_arm と同じ、露出済みかつ非汚染の run だけを数える。clean case の
 * corpus は仕込んだ欠陥を持たないので、数えられた run が `cleanCorpusFile` (reviewer がレビュー
 * したファイル) に対する finding を1つでも報告していれば、それは誤検知になる。`element` は測定
 * 対象の指針ページで、reviewer は読むがレビューはしない。
 * `false_positive_rate` は -- observe_arm の `complies` と同じ unmeasured の形として -- counted_runs
 * が arms.ts の RUN_COUNT に達するまで null になる。 */
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
