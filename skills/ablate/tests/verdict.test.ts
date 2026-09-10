/// <reference types="node" />
// In-process tests for skills/ablate/scripts/verdict.ts, replaying the observation table
// skills/ablate/tests/verdict_test.py drives against verdict.py (verdict.py stays live as
// report.py's import source until that slice retires the Python side; see verdict.ts's
// header). This unit runs the assertions against the TypeScript side alone -- a dual-language
// name comparison, if one is planned, belongs in a later unit, not here.
import assert from "node:assert/strict";
import test from "node:test";
import { PASS_THRESHOLD, UNMEASURED } from "../scripts/arms.ts";
import { DELETE_CANDIDATE, NEEDS_HUMAN_JUDGMENT, classify } from "../scripts/verdict.ts";

test("T-337 an unmeasured input classifies as the unmeasured verdict rather than as a delete candidate", () => {
  // No observation at all: classify() must not read nothing-set as a passing element
  // (verdict_test.py's T-011, "No input produces a keep verdict" -- this unit's table
  // places no keep row, so the fallback is UNMEASURED, never DELETE_CANDIDATE).
  const noInput = classify();
  assert.equal(noInput, UNMEASURED);
  assert.notEqual(noInput, DELETE_CANDIDATE);

  // complies=true would earn DELETE_CANDIDATE on its own; task_set membership must win
  // because that row sits above compliance in the table (verdict_test.py's T-012).
  const triggerAbsent = classify("task-missing", new Set(["task-a", "task-b"]), true);
  assert.equal(triggerAbsent, UNMEASURED);
  assert.notEqual(triggerAbsent, DELETE_CANDIDATE);
});

test("T-338 a pass rate at and below the threshold classify on the sides the python cases record", () => {
  // complies is a bool in verdict.py's classify; the caller derives it by comparing an
  // arm's observed pass rate against arms.ts's PASS_THRESHOLD before calling classify.
  // At the threshold counts as passing (verdict_test.py's T-009 side); one step below it
  // does not (verdict_test.py's T-010 side).
  const rateAtThreshold = PASS_THRESHOLD;
  const rateBelowThreshold = PASS_THRESHOLD - 0.01;
  const atThreshold = rateAtThreshold >= PASS_THRESHOLD;
  const belowThreshold = rateBelowThreshold >= PASS_THRESHOLD;
  assert.equal(atThreshold, true);
  assert.equal(belowThreshold, false);

  assert.equal(classify("task-a", new Set(["task-a"]), atThreshold), DELETE_CANDIDATE);
  assert.equal(classify("task-a", new Set(["task-a"]), belowThreshold), NEEDS_HUMAN_JUDGMENT);
});

test("T-339 an input the table does not cover classifies as needs-human-judgment", () => {
  // complies=false is not covered by the unmeasured row (the trigger matches task_set) and
  // not covered by the delete-candidate row (complies is not true), so it must not fall
  // through to the catch-all UNMEASURED row either -- it lands on needs-human-judgment
  // (verdict_test.py's T-010).
  const result = classify("task-a", new Set(["task-a"]), false);
  assert.equal(result, NEEDS_HUMAN_JUDGMENT);
  assert.notEqual(result, UNMEASURED);
});
