#!/usr/bin/env node
/// <reference types="node" />
// Usage: review_score.ts <expected.json> <results.json> [previous-results.json]
//
// stdout: JSON { counts, metrics, byCategory, diff, unknownVerdicts }
// exit: 0 when every verdict is in the closed set, 1 otherwise, 2 when an argument is missing
//
// TypeScript port of the Python reviewer scorer it replaces (VERDICTS, score, main): reads results as either a
// bare array or a `{results: [...]}` wrapper, exits 1 when unknownVerdicts is non-empty, exits
// 2 with a usage line on stderr when an argument is missing. Python's snake_case identifiers
// carry over as TS camelCase, the same rename harness_hash.ts already made; the JSON field
// names in Report (byCategory, unknownVerdicts, below_severity, ...) stay exactly as
// the Python version printed them, since they are wire format, not TS identifiers.
import { readFileSync } from "node:fs";
import { isMainModule } from "../../workflows/_lib/entry-point.ts";

// The verdict set is closed. Earlier logs each invented their own wording (true, hit, full_hit,
// detected_below_severity_min), which left the metrics incomparable between runs and made the
// diff the harness doc promises impossible to take.
export const VERDICTS: Record<string, string> = {
  hit: "the expected finding, reported at severity_min or above",
  below_severity: "the expected finding, reported below severity_min",
  other_finding: "a finding on the file, but not the expected one",
  miss: "no finding on the file",
  pass: "a clean case that drew no finding",
  false_positive: "a clean case that drew a finding",
  below_min_findings: "fewer findings than min_findings, each at severity_min or above",
};

/** One entry of expected.json. A clean case carries neither category nor severity_min. */
export interface Case {
  file: string;
  expected: string;
  category?: string;
  severity_min?: string;
}

/** One entry of results.json. A row missing verdict is malformed and falls to unknown. */
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

// A plain record rather than a named interface, because diff walks the keys and subtracts the
// previous run's value per key.
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

function ratio(hit: number, total: number): number | null {
  return total === 0 ? null : Math.round((hit / total) * 1000) / 1000;
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

  // dict.fromkeys(...) in Python keeps first-occurrence order while dropping duplicates; the
  // Set below does the same before the filter to unknown-only runs over it.
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

  // A case with no verdict counts as a miss rather than dropping out. Dropping it would raise
  // recall by shrinking the denominator, which is the direction that hides a regression.
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
      // Not `baseline == null`: earlier logs wrote a metric as prose, and subtracting one
      // took the whole scoring down.
      diff[key] =
        value === null || typeof baseline !== "number"
          ? null
          : Math.round((value - baseline) * 1000) / 1000;
    }
  }

  return { counts, metrics, byCategory, diff, unknownVerdicts: unknown };
}

function load(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

// Python's main() takes sys.argv (script name included), so `len(sys.argv) < 3` there is
// this CLI's `argv.length < 2` here: main() receives process.argv.slice(2), the same argv
// convention harness_hash.ts's main() uses.
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
