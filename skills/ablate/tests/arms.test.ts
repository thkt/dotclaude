/// <reference types="node" />
// In-process tests for skills/ablate/scripts/arms.ts, replaying the observation table the
// Python version's own test suite drove against it. This unit runs the assertions against the
// TypeScript side alone.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { classify, SKILL_REFERENCE } from "../../_lib/harness_elements.ts";
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

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const MEASUREMENT_CRITERIA_PATH = join(
  REPO_ROOT,
  "skills",
  "ablate",
  "references",
  "measurement-criteria.md",
);

// The five skills/<name>/references/<file>.md pages the real repository's own classify()
// resolves to skill-reference (measurement-criteria.test.ts's EXAMPLES_BEARING_PATHS names the
// same set, from the same "Rule to triggering task" table this test also reads).
const EXAMPLES_BEARING_PATHS = [
  "skills/use-context-reviewer-readability/references/ai-antipatterns.md",
  "skills/use-context-reviewer-readability/references/control-flow.md",
  "skills/use-context-reviewer-testability/references/pure-functions.md",
  "skills/use-context-root-cause-analysis/references/hypothesis-examples.md",
  "skills/use-context-reviewer-silence/references/detection-patterns.md",
] as const;

/** Strips one layer of matching leading/trailing backticks, the shape the Rule column wraps
 * its value in (measurement-criteria.test.ts's stripBackticks does the same for the full
 * 4-column table; this copy reads only the two columns this file's assertions need). */
function stripBackticks(cell: string): string {
  return cell.replace(/^`/, "").replace(/`$/, "");
}

/** The "## Rule to triggering task" table's Rule and Classification columns, read out of
 * measurement-criteria.md. Not a general markdown-table parser: it assumes the same 4-column
 * shape measurement-criteria.test.ts's readTriggerTable assumes, redeclared here rather than
 * imported because this unit's target files do not include that test file. */
function readRuleClassifications(): { rule: string; classification: string }[] {
  const lines = readFileSync(MEASUREMENT_CRITERIA_PATH, "utf8").split("\n");
  const headerIndex = lines.findIndex((line) => line.trim().startsWith("| Rule "));
  assert.ok(
    headerIndex !== -1,
    "measurement-criteria.md carries no 'Rule to triggering task' table header",
  );
  const rows: { rule: string; classification: string }[] = [];
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) {
      break;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 4) {
      break;
    }
    rows.push({ rule: stripBackticks(cells[0]), classification: cells[1] });
  }
  return rows;
}

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

  // wiped+1 starts from the same restricted baseline; T-337 covers what it restores.
  const restoreCommand = arm_command(WIPED_PLUS_ONE, "rules/example.md");
  assert.deepEqual(restoreCommand.slice(0, BASE_COMMAND.length + 2), [
    ...BASE_COMMAND,
    "--setting-sources",
    "project",
  ]);

  // full-harness runs unmodified, with no restricting flag.
  const fullHarnessCommand = arm_command(FULL_HARNESS);
  assert.deepEqual(fullHarnessCommand, BASE_COMMAND);
});

test("T-337 wiped+1 hands the CLI the element file to read, so the restored prompt is the element's content rather than a line naming its path", () => {
  const element = "rules/example.md";
  const restoreCommand = arm_command(WIPED_PLUS_ONE, element);
  assert.deepEqual(restoreCommand.slice(BASE_COMMAND.length + 2), [
    "--append-system-prompt-file",
    element,
  ]);
});

test("T-496 arm_command refuses each of the five Examples-bearing reference files that the real repository classifies as skill-reference", () => {
  for (const relPath of EXAMPLES_BEARING_PATHS) {
    const absPath = join(REPO_ROOT, relPath);

    // Confirms the premise against the real repository's own classify(), rather than assuming
    // the fixed list still classifies as skill-reference (U-001's harness_elements.ts).
    assert.equal(
      classify(absPath),
      SKILL_REFERENCE,
      `${relPath} is expected to classify as ${SKILL_REFERENCE}`,
    );

    assert.throws(
      () => arm_command(WIPED_PLUS_ONE, absPath),
      (error: unknown) => {
        assert.ok(error instanceof Error, `expected an Error for ${relPath}`);
        assert.match(
          error.message,
          new RegExp(SKILL_REFERENCE.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")),
          `expected the thrown reason to name the ${SKILL_REFERENCE} classification for ${relPath}, got: ${error.message}`,
        );
        assert.ok(
          error.message.includes(absPath),
          `expected the thrown reason to name the refused element ${absPath}, got: ${error.message}`,
        );
        return true;
      },
    );
  }
});

test("T-497 arm_command still builds the wiped+1 command for every rule path the measurement-criteria trigger table names", () => {
  const rows = readRuleClassifications().filter((row) => row.classification !== SKILL_REFERENCE);
  assert.ok(rows.length > 0, "expected at least one non-skill-reference row in the trigger table");

  for (const row of rows) {
    const absPath = join(REPO_ROOT, row.rule);
    const command = arm_command(WIPED_PLUS_ONE, absPath);
    assert.deepEqual(
      command.slice(BASE_COMMAND.length + 2),
      ["--append-system-prompt-file", absPath],
      `expected arm_command to still build the wiped+1 command for ${row.rule}`,
    );
  }
});
