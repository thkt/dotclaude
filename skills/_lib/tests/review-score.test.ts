/// <reference types="node" />
// Behavior tests for skills/_lib/review_score.ts: the TS port of the Python scorer's VERDICTS,
// score(), and CLI main(). skills/_lib/tests/fixtures/review-score-cases.json (built by U-001)
// freezes the Python scorer's own argv -> exit/stdout, so the CLI-facing scenarios below replay
// it through workflows/_lib/tests/_cli-fixture.ts's runCli/withTempHome rather than
// hand-writing new cases that could drift from the Python scorer they must match.
import assert from "node:assert/strict";
import { existsSync, globSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture, runCli, withTempHome } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import type { CliRun } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { VERDICTS, score } from "../review_score.ts";
import type { Case, Previous } from "../review_score.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/_lib/tests -> skills/_lib -> skills -> repo root, the same climb
// harness-hash-cli.test.ts's REPO_ROOT makes from the same starting point.
const ROOT = join(HERE, "..", "..", "..");
const SCRIPT = join(HERE, "..", "review_score.ts");

interface FixtureCase {
  name: string;
  files: Record<string, unknown>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "review-score-cases.json"), "utf8"),
) as FixtureCase[];

/** Writes `entry.files` under a fresh temp HOME, resolves the `<home>` placeholders in its
 * argv, and spawns the CLI -- the replay every CLI-facing scenario below drives through. */
function runFixtureCase(entry: FixtureCase): CliRun {
  return withTempHome((home) => {
    for (const [name, content] of Object.entries(entry.files)) {
      writeFileSync(join(home, name), JSON.stringify(content));
    }
    const argv = entry.argv.map((arg) => arg.replace("<home>", home));
    return runCli(SCRIPT, home, "", argv);
  });
}

function flagged(file: string, category = "A03"): Case {
  return { file, expected: "detected", category, severity_min: "high" };
}

test("T-170 every frozen case in review-score-cases.json reproduces the python scorer's exit code and its parsed stdout on files written under a temp HOME", () => {
  for (const entry of CASES) {
    const run = runFixtureCase(entry);
    assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
    if (entry.stdout === "") {
      assert.equal(run.stdout, "", `${entry.name}: stdout`);
    } else {
      assert.deepEqual(JSON.parse(run.stdout), JSON.parse(entry.stdout), `${entry.name}: stdout`);
    }
  }
});

test("T-171 a missing argument exits 2 with the usage line on stderr and nothing on stdout, and a verdict outside the closed set exits 1 with the report still printed", () => {
  const missingArg = runFixtureCase(fixture(CASES, "insufficient_argv_exits_2_with_empty_stdout"));
  assert.equal(missingArg.status, 2, `exit code (stderr: ${missingArg.stderr})`);
  assert.equal(missingArg.stdout, "");
  assert.match(missingArg.stderr, /usage/i);

  const unknownVerdict = fixture(CASES, "unknown_verdict_among_known_exits_1");
  const run = runFixtureCase(unknownVerdict);
  assert.equal(run.status, 1, `exit code (stderr: ${run.stderr})`);
  assert.deepEqual(JSON.parse(run.stdout), JSON.parse(unknownVerdict.stdout));
});

test("T-172 an unreported flagged case counts as a miss, a verdict outside the closed set is listed in unknownVerdicts, a previous metric written as prose leaves that diff null, and per-category recall splits the strict hits", () => {
  const missReport = score([flagged("v1"), flagged("v2")], [{ file: "v1", verdict: "hit" }]);
  assert.equal(missReport.counts.miss, 1);
  assert.equal(missReport.metrics.recall_strict, 0.5);

  const unknownReport = score([flagged("v1")], [{ file: "v1", verdict: "full_hit" }]);
  assert.deepEqual(unknownReport.unknownVerdicts, ["full_hit"]);
  assert.ok(!("full_hit" in VERDICTS));

  const previous: Previous = { metrics: { recall_strict: "58% (7/12)" as unknown as number } };
  const proseReport = score([flagged("v1")], [{ file: "v1", verdict: "hit" }], previous);
  assert.equal(proseReport.metrics.recall_strict, 1.0);
  assert.equal(proseReport.diff?.recall_strict, null);

  const categoryReport = score(
    [flagged("v1", "A03"), flagged("v2", "A03"), flagged("v3", "LLM01")],
    [
      { file: "v1", verdict: "hit" },
      { file: "v2", verdict: "miss" },
      { file: "v3", verdict: "miss" },
    ],
  );
  assert.equal(categoryReport.byCategory.A03.recall_strict, 0.5);
  assert.equal(categoryReport.byCategory.LLM01.recall_strict, 0.0);
});

test("T-173 the verdict table in skills/_lib/review-harness.md and the VERDICTS constant carry the same key set, every harness corpus carries a flag case and a clean case whose files exist, and the recorded 2026-06-04 baseline scores to the fractions its metrics state", () => {
  const doc = readFileSync(join(ROOT, "skills", "_lib", "review-harness.md"), "utf8");
  const afterHeading = doc.slice(doc.indexOf("## Verdict set"));
  const section = afterHeading.slice(0, afterHeading.indexOf("## expected.json schema"));
  const documented = new Set([...section.matchAll(/^\|\s*`(\w+)`/gm)].map((match) => match[1]));
  assert.deepEqual(documented, new Set(Object.keys(VERDICTS)));

  const harnessSkills = globSync("skills/*/test/expected.json", { cwd: ROOT }).map(
    (path: string) => path.split("/")[1],
  );
  assert.ok(harnessSkills.length > 0, "at least one harness skill exists in the repo under test");
  for (const skill of harnessSkills) {
    const entries = JSON.parse(
      readFileSync(join(ROOT, "skills", skill, "test", "expected.json"), "utf8"),
    ) as Case[];
    assert.ok(
      entries.some((entry) => entry.expected === "detected"),
      `${skill}: flag case`,
    );
    assert.ok(
      entries.some((entry) => entry.expected === "no_finding"),
      `${skill}: clean case`,
    );
    for (const entry of entries) {
      const path = join(ROOT, "skills", skill, "test", entry.file);
      assert.ok(existsSync(path), `${skill}: ${entry.file} exists`);
    }
  }

  const MATCH_TO_VERDICT: Record<string, string> = {
    full_hit: "hit",
    detected_below_severity_min: "below_severity",
    expected_vuln_missed_other_vuln_found: "other_finding",
  };
  const baselinePath = join(
    ROOT,
    "skills",
    "use-context-reviewer-security",
    "test",
    "results",
    "2026-06-04-blind-baseline.json",
  );
  const recorded = JSON.parse(readFileSync(baselinePath, "utf8")) as {
    results: Array<{ file: string; match: string }>;
    metrics: Record<string, string>;
  };
  const results = recorded.results.map((row) => ({
    file: row.file.split(" + ")[0],
    verdict: MATCH_TO_VERDICT[row.match] ?? row.match,
  }));
  const corpus = JSON.parse(
    readFileSync(
      join(ROOT, "skills", "use-context-reviewer-security", "test", "expected.json"),
      "utf8",
    ),
  ) as Case[];
  const baselineReport = score(corpus, results);

  const fraction = (key: string): [number, number] => {
    const match = /\((\d+)\/(\d+)\)/.exec(recorded.metrics[key] ?? "");
    assert.ok(match, `${key} states its fraction`);
    const [, num, den] = match ?? [];
    return [Number(num), Number(den)];
  };
  const [strictNum, strictDen] = fraction("recall_strict");
  assert.equal(baselineReport.counts.hit, strictNum);
  assert.equal(baselineReport.counts.flagged, strictDen);

  const [fpNum, fpDen] = fraction("fp_rate");
  assert.equal(baselineReport.counts.false_positive, fpNum);
  assert.equal(baselineReport.counts.clean, fpDen);

  assert.equal(baselineReport.counts.below_min_findings, 0);
});
