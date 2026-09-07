/// <reference types="node" />
// Behavior tests for workflows/assert/record.ts, the TypeScript port of the Python assert recorder.
// T-111 replays the frozen fixture in tests/fixtures/record-cases.json, produced by running
// the Python recorder itself before it was retired (U-001), and compares the port's
// stdin/stdout/row/exit against it case by case. generated_at is frozen in the fixture as the
// placeholder <utc-iso8601-Z> because it is minted fresh on every run; that key is compared by
// shape, everything else by exact value. Unlike workflows/build/record.ts, assert is 1 run 1
// line: no run_id joins rows and stdout carries only {path}. The replay itself (runCli,
// withTempHome, seedHistory, readLines, assertRowLine, assertStdoutShape, fixture) lives in
// workflows/_lib/tests/_cli-fixture.ts, shared with workflows/build/tests/record.test.ts;
// workflows/_lib/tests/cli-fixture.test.ts covers that shared replay's own key-order and
// placeholder-resolution behavior directly.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertRowLine,
  assertStdoutShape,
  fixture,
  historyPath,
  readLines,
  runCli,
  seedHistory,
  withTempHome,
  type FixtureCase,
} from "../../_lib/tests/_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "record.ts");
const HISTORY_NAME = "assert-runs.jsonl";
const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "record-cases.json"), "utf8"),
) as FixtureCase[];

const UTC_ISO8601_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SHAPE_CHECKS: Record<string, RegExp> = {
  "<utc-iso8601-Z>": UTC_ISO8601_Z,
};

test("T-111 every frozen case in record-cases.json reproduces the python recorder's exit code, stdout keys, and the appended row's keys in order, with generated_at compared by shape", () => {
  for (const testCase of FIXTURES) {
    withTempHome((home) => {
      const seedLines = testCase.seed_lines ?? [];
      if (seedLines.length > 0) {
        seedHistory(home, HISTORY_NAME, seedLines);
      }
      const result = runCli(SCRIPT, home, testCase.stdin);
      assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
      assertStdoutShape(
        result.stdout,
        testCase.stdout,
        { "<history-path>": historyPath(home, HISTORY_NAME) },
        SHAPE_CHECKS,
        testCase.name,
      );

      const rows = testCase.rows ?? [];
      const actualLines = readLines(historyPath(home, HISTORY_NAME));
      assert.equal(actualLines.length, rows.length, `${testCase.name}: row count`);
      actualLines.forEach((line, index) => {
        assertRowLine(line, rows[index], SHAPE_CHECKS, `${testCase.name}: row ${index}`);
      });
    });
  }
});

test("T-112 an unparseable payload exits 1, prints nothing to stdout, starts stderr with the python recorder's message prefix, and leaves no file behind", () => {
  const testCase = fixture(FIXTURES, "not_json");
  withTempHome((home) => {
    const result = runCli(SCRIPT, home, testCase.stdin);
    assert.equal(result.status, 1, "not_json: exit code");
    assert.equal(result.stdout, "", "not_json: stdout");
    assert.equal(result.stderr.startsWith("Error: "), true, "not_json: stderr prefix");
    assert.equal(existsSync(historyPath(home, HISTORY_NAME)), false, "not_json: no file written");
  });
});
