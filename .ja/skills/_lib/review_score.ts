#!/usr/bin/env node
/// <reference types="node" />
// Usage: review_score.ts <expected.json> <results.json> [previous-results.json]
//
// stdout: JSON { counts, metrics, byCategory, diff, unknownVerdicts }
// exit: verdict が全て閉じた集合の中なら 0、外があれば 1、引数が足りなければ 2
//
// 置き換え元の Python 版 scorer の VERDICTS / score / main を TypeScript へ移植したもの。results は素の
// 配列か `{results: [...]}` の wrapper のどちらでも読み、unknownVerdicts が空でなければ
// exit 1、引数が足りなければ usage を stderr へ書いて exit 2 にする。Python の snake_case な
// 識別子は harness_hash.ts で既に行ったのと同じリネームで TS 側では camelCase になる。
// Report のフィールド名 (byCategory, unknownVerdicts, below_severity, ...) は
// Python 版がそのまま出力していた wire format であり TS の識別子ではないため、
// 綴りをそのまま残す。
import { readFileSync } from "node:fs";
import { isMainModule } from "../../workflows/_lib/entry-point.ts";

// verdict は閉じた集合にする。過去のログは実行ごとに独自の語 (true、hit、full_hit、
// detected_below_severity_min) を使っており、実行どうしで指標を比べられず、
// ハーネス文書が謳う差分が取れなくなっていた。
export const VERDICTS: Record<string, string> = {
  hit: "the expected finding, reported at severity_min or above",
  below_severity: "the expected finding, reported below severity_min",
  other_finding: "a finding on the file, but not the expected one",
  miss: "no finding on the file",
  pass: "a clean case that drew no finding",
  false_positive: "a clean case that drew a finding",
  below_min_findings: "fewer findings than min_findings, each at severity_min or above",
};

/** expected.json の 1 件。clean ケースは category と severity_min を持たない。 */
export interface Case {
  file: string;
  expected: string;
  category?: string;
  severity_min?: string;
}

/** results.json の 1 件。verdict を欠く行は形が壊れているので unknown へ落ちる。 */
export interface Outcome {
  file?: string;
  verdict?: string | null;
}

export interface Counts {
  flagged: number;
  clean: number;
  hit: number;
  below_severity: number;
  other_finding: number;
  miss: number;
  false_positive: number;
  below_min_findings: number;
}

export interface Category {
  total: number;
  hit: number;
  recall_strict: number | null;
}

// named interface でなく plain な record にしているのは、diff がキーを舐めて前回の値を
// 引き算するため。
export type Metrics = Record<string, number | null>;

export interface Previous {
  metrics?: Metrics;
}

export interface Report {
  counts: Counts;
  metrics: Metrics;
  byCategory: Record<string, Category>;
  diff: Metrics | null;
  unknownVerdicts: (string | null)[];
}

/** Python の `round(x, 3)` に相当する。ちょうど中間に来た値は偶数側へ丸める。`Math.round` は
 * 切り上げるので、1/16 は Python が 0.062、`Math.round` は 0.063 を返す。分母が 16 で割り切れる
 * ときにこの境界へ乗る。 */
function round3(value: number): number {
  const scaled = value * 1000;
  const floor = Math.floor(scaled);
  const remainder = scaled - floor;
  if (remainder > 0.5) return (floor + 1) / 1000;
  if (remainder < 0.5) return floor / 1000;
  return (floor % 2 === 0 ? floor : floor + 1) / 1000;
}

function ratio(hit: number, total: number): number | null {
  return total === 0 ? null : round3(hit / total);
}

export function score(
  expected: readonly Case[],
  results: readonly Outcome[],
  previous?: Previous | null,
): Report {
  const verdictByFile = new Map<string | undefined, string | null | undefined>();
  for (const r of results) {
    verdictByFile.set(r.file, r.verdict);
  }

  // Python の dict.fromkeys(...) は初出順を保ったまま重複を落とす。下の Set は同じ動きを
  // フィルタの前に行い、その後で unknown だけへ絞り込む。
  const seenVerdicts = new Set<string | null>();
  const unknown: (string | null)[] = [];
  for (const r of results) {
    const verdict = r.verdict ?? null;
    if (seenVerdicts.has(verdict)) continue;
    seenVerdicts.add(verdict);
    if (verdict === null || !(verdict in VERDICTS)) unknown.push(verdict);
  }

  const flagged = expected.filter((e) => e.expected === "detected");
  const clean = expected.filter((e) => e.expected === "no_finding");

  // verdict の無いケースは脱落でなく miss として数える。落とすと分母が縮んで recall が上がり、
  // 退行を隠す方向へ倒れる。
  function verdictOf(entry: Case): string {
    const fallback = entry.expected === "detected" ? "miss" : "pass";
    return verdictByFile.get(entry.file) || fallback;
  }

  const counts: Counts = {
    flagged: flagged.length,
    clean: clean.length,
    hit: flagged.filter((e) => verdictOf(e) === "hit").length,
    below_severity: flagged.filter((e) => verdictOf(e) === "below_severity").length,
    other_finding: flagged.filter((e) => verdictOf(e) === "other_finding").length,
    miss: flagged.filter((e) => verdictOf(e) === "miss").length,
    false_positive: clean.filter((e) => verdictOf(e) === "false_positive").length,
    below_min_findings: flagged.filter((e) => verdictOf(e) === "below_min_findings").length,
  };

  const metrics: Metrics = {
    recall_detection: ratio(
      counts.hit + counts.below_severity + counts.other_finding,
      counts.flagged,
    ),
    recall_expected: ratio(counts.hit + counts.below_severity, counts.flagged),
    recall_strict: ratio(counts.hit, counts.flagged),
    fp_rate: ratio(counts.false_positive, counts.clean),
  };

  const byCategory: Record<string, Category> = {};
  for (const entry of flagged) {
    const key = entry.category || "uncategorized";
    const bucket = (byCategory[key] ??= { total: 0, hit: 0, recall_strict: null });
    bucket.total += 1;
    if (verdictOf(entry) === "hit") bucket.hit += 1;
  }
  for (const bucket of Object.values(byCategory)) {
    bucket.recall_strict = ratio(bucket.hit, bucket.total);
  }

  let diff: Metrics | null = null;
  if (previous != null) {
    const before = previous.metrics ?? {};
    diff = {};
    for (const [key, value] of Object.entries(metrics)) {
      const baseline = before[key];
      // `baseline == null` ではない。過去のログは指標を文章で書いており、それを引き算すると
      // 採点全体が壊れてしまう。
      diff[key] = value === null || typeof baseline !== "number" ? null : round3(value - baseline);
    }
  }

  return { counts, metrics, byCategory, diff, unknownVerdicts: unknown };
}

function load(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

// Python の main() は sys.argv (スクリプト名を含む) を受け取るため、そちらの
// `len(sys.argv) < 3` はここでは `argv.length < 2` になる: main() は process.argv.slice(2)
// を受け取る、harness_hash.ts の main() と同じ argv の扱いである。
export function main(argv: string[]): number {
  if (argv.length < 2) {
    process.stderr.write("usage: review_score.ts <expected.json> <results.json> [previous]\n");
    return 2;
  }
  const loaded = load(argv[1]);
  let rows: unknown = loaded;
  if (loaded !== null && typeof loaded === "object" && !Array.isArray(loaded)) {
    const payload = loaded as Record<string, unknown>;
    rows = "results" in payload ? payload.results : payload;
  }
  const report = score(
    load(argv[0]) as Case[],
    rows as Outcome[],
    argv.length > 2 ? (load(argv[2]) as Previous) : null,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report.unknownVerdicts.length > 0 ? 1 : 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
