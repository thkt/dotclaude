/// <reference types="node" />
// Behavior tests for skills/ablate/scripts/report.ts's build_report and the aggregation it
// calls (arms.ts, dr_gate.ts, enforcer_map.ts, usage_counts.ts, verdict.ts,
// ../../_lib/harness_elements.ts). Every scenario here calls report.build_report directly --
// report.ts is the module under test, not a driver around the Python version it replaced.
//
// T-473 replays skills/ablate/tests/fixtures/report-cases.json (frozen by U-001 from the real
// python3 build_report() of the Python version this module replaced) straight against the TS
// port, the docs/wiki/fixture-freeze-before-port.md shape this file's other units already apply.
//
// The freeze was checked against the running Python version once, while both sides stood: every
// case in report-cases.json reproduced that build_report dict for the same pinned now and
// transcripts root. That module is retired, so the check cannot run again; what replaces it is
// T-472 below, which holds the fixture to the verdicts the report can render, and needs no
// interpreter.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { writeTree } from "../../_lib/tests/_tree-fixture.ts";
import { UNMEASURED } from "../scripts/arms.ts";
import { HELD } from "../scripts/dr_gate.ts";
import * as report from "../scripts/report.ts";
import { DELETE_CANDIDATE, NEEDS_HUMAN_JUDGMENT } from "../scripts/verdict.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The same pinned instant and fixture transcripts directory the frozen report-cases.json fixture
// was captured against, so a fire recorded in report-transcripts/seed.jsonl sits at the same
// distance from "now" on both sides of the module boundary this report draws on.
const NOW = new Date("2026-08-27T00:00:00.000Z");
const TRANSCRIPTS_ROOT_FIXTURE = join(HERE, "fixtures", "report-transcripts");

interface ReportFixtureCase {
  name: string;
  // The repo-root tree report.build_report(root, ...) scans (harness elements, DRs, ...).
  files: Record<string, string>;
  // build_report's second argument, exactly as the frozen fixture recorded it.
  observations: Array<Record<string, unknown>>;
  exit: number;
  // json.dumps(report.build_report(...), ensure_ascii=False), the python3 port's own frozen
  // return value -- never hand-typed (docs/wiki/fixture-freeze-before-port.md).
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "report-cases.json"), "utf8"),
) as ReportFixtureCase[];

test("T-473 build_report reproduces the frozen dict for each case", () => {
  assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
  for (const entry of CASES) {
    const root = writeTree("report-case", entry.files);
    try {
      const result = report.build_report(
        root,
        entry.observations as unknown as report.Observation[],
        TRANSCRIPTS_ROOT_FIXTURE,
        NOW,
      );
      assert.deepEqual(result, JSON.parse(entry.stdout), entry.name);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("T-472 the fixture carries a case for each verdict the report can render", () => {
  // Read off the modules that define them rather than retyped: a verdict renamed on one side
  // would otherwise leave this comparison agreeing with a set nothing produces.
  const renderable = new Set([UNMEASURED, DELETE_CANDIDATE, NEEDS_HUMAN_JUDGMENT, HELD]);

  const seen = new Set<string>();
  for (const entry of CASES) {
    for (const verdict of Object.values(
      (JSON.parse(entry.stdout) as { verdicts: Record<string, string> }).verdicts,
    )) {
      seen.add(verdict);
    }
  }

  assert.deepEqual(
    [...renderable].filter((verdict) => !seen.has(verdict)),
    [],
    "every verdict the report can render must appear in the frozen fixture",
  );
});

test("T-476 a path under the ablation apparatus never reaches the delete candidates", () => {
  // The apparatus measures the harness, so a script of its own scoring as a delete candidate
  // would put the measuring instrument on the list of things to delete.
  const apparatus = "skills/ablate/scripts/sample_probe.py";
  const outside = "skills/sample/scripts/sample_probe.py";
  const root = writeTree("report-apparatus", {
    [apparatus]: "# a probe\n",
    [outside]: "# a probe\n",
  });
  // The same observation shape the frozen delete-candidate case carries, so both paths reach
  // classify by the row that earns DELETE_CANDIDATE.
  const observed = (path: string) => ({
    path,
    trigger_task: "task-a",
    task_set: ["task-a"],
    complies: true,
  });
  try {
    const result = report.build_report(
      root,
      [observed(apparatus), observed(outside)] as unknown as report.Observation[],
      TRANSCRIPTS_ROOT_FIXTURE,
      NOW,
    );

    assert.equal(
      result.verdicts[apparatus],
      result.verdicts[outside],
      "the two paths must score the same verdict, so the exclusion below is the only difference",
    );
    assert.equal(
      result.verdicts[apparatus],
      DELETE_CANDIDATE,
      "the shared verdict must be the one the exclusion has to override",
    );
    assert.ok(
      result.delete_candidates.includes(outside),
      "a path outside the apparatus with that verdict must be listed",
    );
    assert.ok(
      !result.delete_candidates.includes(apparatus),
      "a path under the apparatus must be absent from the delete candidates",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a secret carried on an observation never reaches the rendered report", () => {
  // The retired Python suite passed a secret through an observation's settings field and read
  // the rendered report for it. _render now reads the aggregated result alone, so the leak is
  // structurally out of reach; this holds that reach where it is, so widening _render's input
  // brings the check back rather than passing silently.
  const secret = "zzsecretvaluenotinthereport";
  const path = "skills/sample/scripts/leaky.py";
  const root = writeTree("report-secret", { [path]: "# stand-in source\n" });
  try {
    const observation = {
      path,
      trigger_task: "task-a",
      task_set: ["task-a"],
      complies: true,
      settings: { ANTHROPIC_API_KEY: secret },
    } as unknown as report.Observation;

    const result = report.build_report(root, [observation], TRANSCRIPTS_ROOT_FIXTURE, NOW);
    assert.equal(result.verdicts[path], DELETE_CANDIDATE, "the observation must have been read");

    const written = report.write_report(root, [observation], join(root, "out"));
    assert.ok(
      !readFileSync(written, "utf8").includes(secret),
      "the rendered report must not carry a value the observation brought in",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("T-474 the transcripts root arrives as an argument, so a caller can point it at a fixture without patching a module binding", () => {
  const root = writeTree("report-transcripts-root-arg", {});
  try {
    // report-transcripts/seed.jsonl records two PreToolUse fires against
    // skills/sample/scripts/dr-governed.py (2026-08-01 and 2026-08-20), independent of
    // `root` and `observations` -- so pointing `transcripts_root` at that fixture directory,
    // as a plain argument, is what makes it show up here. No binding on the report module is
    // ever touched.
    const withFixtureTranscripts = report.build_report(root, [], TRANSCRIPTS_ROOT_FIXTURE, NOW);
    assert.deepEqual(withFixtureTranscripts.usage["skills/sample/scripts/dr-governed.py"], {
      fires: 2,
      last_used: "2026-08-20",
    });

    const emptyTranscriptsRoot = mkdtempSync(join(tmpdir(), "report-empty-transcripts-"));
    try {
      const withEmptyTranscripts = report.build_report(root, [], emptyTranscriptsRoot, NOW);
      assert.equal(
        withEmptyTranscripts.usage["skills/sample/scripts/dr-governed.py"],
        undefined,
        "an empty transcripts_root carries no fire for the same path",
      );
    } finally {
      rmSync(emptyTranscriptsRoot, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("T-475 a run with no observations returns the empty-report shape the python version produced", () => {
  const root = writeTree("report-no-observations", {});
  const transcriptsRoot = mkdtempSync(join(tmpdir(), "report-empty-transcripts-"));
  try {
    const result = report.build_report(root, [], transcriptsRoot, NOW);
    // Captured from the real python3 report.build_report(empty root, [], now=2026-08-27)
    // against an empty TRANSCRIPTS_ROOT -- arms is always the full ARMS list even with zero
    // observations, and every other field is empty.
    assert.deepEqual(result, {
      elements: [],
      arms: ["wiped", "wiped+1", "full-harness"],
      verdicts: {},
      usage_verdicts: {},
      delete_candidates: [],
      usage: {},
      transcripts: { count: 0, date_range: { start: null, end: null } },
      enforcer_rows: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(transcriptsRoot, { recursive: true, force: true });
  }
});
