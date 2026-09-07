/// <reference types="node" />
// Behavior tests for workflows/_lib/tests/_cli-fixture.ts's own two exports that
// workflows/build/tests/record.test.ts's fixture replay does not exercise on its own:
// assertRowShape's key-order flag and assertStdoutShape's placeholder resolution. Both run
// against workflows/build/record.ts, a real CLI that reads workflows/_lib/cli.ts (U-001), to
// prove the connection workflows/build/tests/record.test.ts and
// workflows/assert/tests/record.test.ts (U-002, U-003) will lean on once those two files stop
// carrying their own copy of this replay. The one FixtureCase below is shaped the same way a
// record-cases.json entry is (seed_lines, stdin, stdout, rows) and drives both tests through
// fixture(), seedHistory() and assertRowLine() the same way the eventual record.test.ts pair
// will, so a seam break in any of those shows up here rather than only after the retirement.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertRowLine,
  assertRowShape,
  assertStdoutShape,
  fixture,
  historyPath,
  readLines,
  runCli,
  seedHistory,
  withTempHome,
  type FixtureCase,
} from "./_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD_RECORD = join(HERE, "..", "..", "build", "record.ts");
const HISTORY_NAME = "build-runs.jsonl";

const UUID4HEX = /^[0-9a-f]{32}$/;
const UTC_ISO8601_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SHAPE_CHECKS: Record<string, RegExp> = {
  "<uuid4hex>": UUID4HEX,
  "<utc-iso8601-Z>": UTC_ISO8601_Z,
};

// A single case, shaped the same way a workflows/build/tests/fixtures/record-cases.json entry
// is: one pre-existing raw line (kept un-reparsed, the way a seed line the fixture format
// itself does not normalize is compared), one appended row in the order
// workflows/build/record.ts writes it (run_id first, then the payload's own keys, then
// generated_at last), and the stdout line record.ts prints after counting both started rows
// in the window.
const FIXTURES: FixtureCase[] = [
  {
    name: "seam_started",
    seed_lines: ['{"run_id": "run-pre", "reason": "started", "plan_quality": false}'],
    stdin: JSON.stringify({
      issue: "999",
      repo: "/abs/target-repo",
      branch: "feat/fixture-seam",
      reason: "started",
      plan_quality: false,
    }),
    exit: 0,
    stdout: `${JSON.stringify({
      path: "<history-path>",
      run_id: "<uuid4hex>",
      started: 2,
      stops: 0,
      trigger_met: false,
      skipped_lines: 0,
    })}\n`,
    rows: [
      '{"run_id": "run-pre", "reason": "started", "plan_quality": false}',
      {
        run_id: "<uuid4hex>",
        issue: "999",
        repo: "/abs/target-repo",
        branch: "feat/fixture-seam",
        reason: "started",
        plan_quality: false,
        generated_at: "<utc-iso8601-Z>",
      },
    ],
  },
];

test(
  "T-123 the shared replay flags a row whose key order differs from the fixture and passes " +
    "the same row in fixture order",
  () => {
    const testCase = fixture(FIXTURES, "seam_started");
    withTempHome((home) => {
      seedHistory(home, HISTORY_NAME, testCase.seed_lines ?? []);
      const result = runCli(BUILD_RECORD, home, testCase.stdin);
      assert.equal(result.status, testCase.exit, "seam run: exit code");

      const actualLines = readLines(historyPath(home, HISTORY_NAME));
      assert.equal(actualLines.length, testCase.rows?.length, "seam run: row count");
      const [seedRow, appendedRow] = testCase.rows as Array<Record<string, unknown> | string>;
      assert.doesNotThrow(() => assertRowLine(actualLines[0], seedRow, SHAPE_CHECKS, "seed row"));
      assert.doesNotThrow(() =>
        assertRowLine(actualLines[1], appendedRow, SHAPE_CHECKS, "fixture order"),
      );

      const actual = JSON.parse(actualLines[1]) as Record<string, unknown>;
      const reordered = { ...(appendedRow as Record<string, unknown>) };
      const swapped: Record<string, unknown> = {
        issue: reordered.issue,
        run_id: reordered.run_id,
        repo: reordered.repo,
        branch: reordered.branch,
        reason: reordered.reason,
        plan_quality: reordered.plan_quality,
        generated_at: reordered.generated_at,
      };
      assert.throws(() => assertRowShape(actual, swapped, SHAPE_CHECKS, "reordered"));
    });
  },
);

test(
  "T-124 the shared replay resolves the <history-path> placeholder to the harness's own " +
    "history file under the temp HOME",
  () => {
    const testCase = fixture(FIXTURES, "seam_started");
    withTempHome((home) => {
      seedHistory(home, HISTORY_NAME, testCase.seed_lines ?? []);
      const result = runCli(BUILD_RECORD, home, testCase.stdin);
      assert.equal(result.status, testCase.exit, "seam run: exit code");

      assert.doesNotThrow(() =>
        assertStdoutShape(
          result.stdout,
          testCase.stdout,
          { "<history-path>": historyPath(home, HISTORY_NAME) },
          SHAPE_CHECKS,
          "placeholder resolution",
        ),
      );
    });
  },
);
