/// <reference types="node" />
// In-process tests for skills/ablate/scripts/arms.ts, replaying the observation table the
// Python version's own test suite drove against it. This unit runs the assertions against the
// TypeScript side alone.
import assert from "node:assert/strict";
import test from "node:test";
import {
  ARMS,
  BASE_COMMAND,
  FULL_HARNESS,
  MEASURED,
  PASS_THRESHOLD,
  RUN_COUNT,
  UNMEASURED,
  WIPED,
  WIPED_PLUS_ONE,
  arm_command,
  measurement_status,
} from "../scripts/arms.ts";

test("T-334 ARMS lists the three arm names in the order the python module declares them", () => {
  assert.deepEqual(ARMS, [WIPED, WIPED_PLUS_ONE, FULL_HARNESS]);
  assert.deepEqual(ARMS, ["wiped", "wiped+1", "full-harness"]);
});

test("T-335 the run count and the pass threshold come back as the numbers the python module holds", () => {
  assert.equal(RUN_COUNT, 5);
  assert.equal(PASS_THRESHOLD, 0.8);

  // arms_test.py's T-008 rebinds arms.RUN_COUNT to move the boundary; an ESM namespace binding
  // cannot be reassigned from outside, so the boundary is driven relative to the constant
  // instead. Both sides of it are asserted, because a comparison written as `runs > RUN_COUNT`
  // reports a run at the count as unmeasured and no other case here would notice.
  assert.equal(measurement_status(RUN_COUNT - 1), UNMEASURED);
  assert.equal(measurement_status(RUN_COUNT), MEASURED);
  assert.equal(measurement_status(RUN_COUNT + 1), MEASURED);
});

test("T-336 the arm-building functions return the same shape the python cases expect for each arm", () => {
  // wiped restricts settings loading to the project source alone (the Python version's
  // arm_command docstring).
  const wipedCommand = arm_command(WIPED);
  assert.deepEqual(wipedCommand, [...BASE_COMMAND, "--setting-sources", "project"]);

  // wiped+1 starts from the same restricted baseline and restores exactly one element by
  // appending it to the system prompt.
  const element = "rules/example.md";
  const restoreCommand = arm_command(WIPED_PLUS_ONE, element);
  assert.deepEqual(restoreCommand.slice(0, BASE_COMMAND.length + 2), [
    ...BASE_COMMAND,
    "--setting-sources",
    "project",
  ]);
  const flagIndex = restoreCommand.indexOf("--append-system-prompt");
  assert.notEqual(flagIndex, -1, "wiped+1 must carry --append-system-prompt");
  assert.ok(restoreCommand[flagIndex + 1].includes(element));

  // full-harness runs unmodified, with no restricting flag.
  const fullHarnessCommand = arm_command(FULL_HARNESS);
  assert.deepEqual(fullHarnessCommand, BASE_COMMAND);
});
