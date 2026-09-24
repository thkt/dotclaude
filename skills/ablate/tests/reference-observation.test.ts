/// <reference types="node" />
// In-process tests for skills/ablate/scripts/reference_observation.ts. This is #743's seam
// unit: rather than asserting against a hand-written expectation, each test also recomputes
// what exposure.ts's classify_exposure and reference_match.ts's is_hit -- the real U-002 and
// U-003 functions, not stand-ins for them -- say about the same fixtures, and checks
// observe_arm/observe_clean_case against those real answers. No claude process is started.
import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { PASS_THRESHOLD, RUN_COUNT, UNMEASURED } from "../scripts/arms.ts";
import { classify_exposure } from "../scripts/exposure.ts";
import { is_hit, type Finding, type PlantedDefect } from "../scripts/reference_match.ts";
import {
  observe_arm,
  observe_clean_case,
  type ObservedRun,
} from "../scripts/reference_observation.ts";
import { classify } from "../scripts/verdict.ts";

const ROOT = "/repo";
const ELEMENT = "skills/use-context-reviewer-readability/references/ai-antipatterns.md";
const DEFECT: PlantedDefect = { file: ELEMENT, line_start: 40, line_end: 50 };

/** One stream-json transcript line: a JSON object followed by a newline, the shape
 * `--output-format stream-json` writes one event per line (mirrors exposure.test.ts's own
 * `line` helper -- this test file builds its own fixtures rather than importing another test
 * file's helpers, the convention exposure.test.ts and reference-arm.test.ts already hold). */
function line(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
}

/** An assistant event carrying one tool_use content block, the shape a stream-json transcript
 * holds a tool call in (docs.claude.com/en/docs/claude-code/headless#stream-responses). */
function assistantToolUse(name: string, input: Record<string, unknown>): Record<string, unknown> {
  return {
    type: "assistant",
    message: {
      role: "assistant",
      content: [{ type: "tool_use", id: `toolu_${name}`, name, input }],
    },
  };
}

/** One run that reads the fixture's own copy of ELEMENT at `cwd`, so classify_exposure reports
 * it exposed and (absent any other tool call) not contaminated. */
function exposedRun(cwd: string, findings: Finding[]): ObservedRun {
  const transcript =
    line({ type: "system", subtype: "init" }) +
    line(assistantToolUse("Read", { file_path: join(cwd, ELEMENT) })) +
    line({ type: "result", subtype: "success" });
  return { transcript, cwd, findings };
}

/** One run that also touches a real path under ROOT, outside the fixture -- the shape T-504
 * (exposure.test.ts) counts as contaminated even though it read the fixture reference too. */
function contaminatedRun(cwd: string, findings: Finding[]): ObservedRun {
  const transcript =
    line({ type: "system", subtype: "init" }) +
    line(assistantToolUse("Read", { file_path: join(cwd, ELEMENT) })) +
    line(
      assistantToolUse("Read", {
        file_path: join(ROOT, "skills/use-context-reviewer-readability/SKILL.md"),
      }),
    ) +
    line({ type: "result", subtype: "success" });
  return { transcript, cwd, findings };
}

/** One run that never reads the fixture's own copy of ELEMENT, so classify_exposure reports it
 * unexposed -- the shape T-503 (exposure.test.ts) covers. */
function unexposedRun(cwd: string, findings: Finding[]): ObservedRun {
  const transcript =
    line({ type: "system", subtype: "init" }) +
    line(
      assistantToolUse("Read", {
        file_path: join(cwd, "skills/use-context-reviewer-readability/SKILL.md"),
      }),
    ) +
    line({ type: "result", subtype: "success" });
  return { transcript, cwd, findings };
}

/** Every run in `runs` that classify_exposure (the real U-002 function, not a stand-in) reports
 * exposed and not contaminated -- the oracle observe_arm/observe_clean_case's counted_runs must
 * agree with. */
function reallyCountedRuns(runs: readonly ObservedRun[]): ObservedRun[] {
  return runs.filter((run) => {
    const { exposed, contaminated } = classify_exposure(run.transcript, ELEMENT, run.cwd, ROOT);
    return exposed && !contaminated;
  });
}

test("T-509 An arm whose planted-case hit share among counted runs reaches the pass threshold complies", () => {
  const hittingFinding: Finding = { file: DEFECT.file, line: "45-50" };
  const missingFinding: Finding = { file: DEFECT.file, line: "5-10" };

  // RUN_COUNT runs, all exposed and uncontaminated; one misses the planted range so the hit
  // share lands exactly at PASS_THRESHOLD rather than trivially above it (verdict.test.ts's own
  // T-338 asserts the threshold itself counts as passing, on the arms.ts side of the compare).
  const runs: ObservedRun[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    const cwd = `/tmp/reference-arm-fixture-${i}`;
    runs.push(exposedRun(cwd, [i === RUN_COUNT - 1 ? missingFinding : hittingFinding]));
  }

  // Sanity-check the fixture against the real is_hit before trusting the hand count below.
  const counted = reallyCountedRuns(runs);
  const reallyHit = counted.filter((run) =>
    run.findings.some((finding) => is_hit(finding, DEFECT)),
  );
  assert.equal(counted.length, RUN_COUNT, "expected every run in this fixture to be counted");
  assert.ok(
    reallyHit.length / counted.length >= PASS_THRESHOLD,
    "expected this fixture's real hit share to reach PASS_THRESHOLD",
  );

  const result = observe_arm(runs, ELEMENT, ROOT, DEFECT);
  assert.equal(result.counted_runs, RUN_COUNT);
  assert.equal(result.hit_runs, reallyHit.length);
  assert.equal(result.complies, true);
});

test("T-510 An arm with fewer counted runs than the run count yields a null complies, so classify returns unmeasured", () => {
  const hittingFinding: Finding = { file: DEFECT.file, line: "45-50" };

  const runs: ObservedRun[] = [];
  for (let i = 0; i < RUN_COUNT - 1; i++) {
    runs.push(exposedRun(`/tmp/reference-arm-fixture-${i}`, [hittingFinding]));
  }
  assert.ok(
    reallyCountedRuns(runs).length < RUN_COUNT,
    "expected this fixture to hold fewer than RUN_COUNT counted runs",
  );

  const result = observe_arm(runs, ELEMENT, ROOT, DEFECT);
  assert.equal(result.complies, null);

  // The seam with verdict.ts's classify: a null complies must make classify() report
  // UNMEASURED for a trigger task the task set does hold, the same table row T-490 covers.
  assert.equal(classify("task-a", new Set(["task-a"]), result.complies, true), UNMEASURED);
});

test("T-511 Contaminated runs and unexposed runs are left out of the counted runs", () => {
  const hittingFinding: Finding = { file: DEFECT.file, line: "45-50" };

  const runs: ObservedRun[] = [
    exposedRun("/tmp/reference-arm-fixture-0", [hittingFinding]),
    exposedRun("/tmp/reference-arm-fixture-1", [hittingFinding]),
    contaminatedRun("/tmp/reference-arm-fixture-2", [hittingFinding]),
    unexposedRun("/tmp/reference-arm-fixture-3", [hittingFinding]),
  ];

  const counted = reallyCountedRuns(runs);
  assert.equal(counted.length, 2, "expected only the two clean, exposed runs to be counted");
  assert.ok(counted.length < runs.length, "expected the contaminated and unexposed runs excluded");

  const result = observe_arm(runs, ELEMENT, ROOT, DEFECT);
  assert.equal(result.counted_runs, counted.length);
});

test("T-512 The clean case's false-positive rate is reported apart from complies", () => {
  // A clean-case corpus carries no planted defect, so any finding a run reports against
  // ELEMENT's file is a false positive rather than a hit -- there is no DEFECT to pass here.
  const falseAlarm: Finding = { file: ELEMENT, line: "12" };

  const runs: ObservedRun[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    const cwd = `/tmp/reference-arm-fixture-clean-${i}`;
    runs.push(exposedRun(cwd, i < 2 ? [falseAlarm] : []));
  }
  const counted = reallyCountedRuns(runs);
  assert.equal(counted.length, RUN_COUNT);

  const cleanResult = observe_clean_case(runs, ELEMENT, ROOT);
  assert.equal(cleanResult.counted_runs, RUN_COUNT);
  assert.equal(cleanResult.false_positive_runs, 2);
  assert.equal(cleanResult.false_positive_rate, 2 / RUN_COUNT);

  // "reported apart from complies": the clean-case shape carries no complies field at all, and
  // an arm's ArmObservation carries no false_positive_rate field -- the two never merge into
  // one verdict.
  assert.equal(Object.hasOwn(cleanResult, "complies"), false);
  const armResult = observe_arm(runs, ELEMENT, ROOT, DEFECT);
  assert.equal(Object.hasOwn(armResult, "false_positive_rate"), false);
});
