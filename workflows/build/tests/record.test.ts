/// <reference types="node" />
// Behavior tests for workflows/build/record.ts, the TypeScript port of the Python build recorder.
// T-107..T-110 replay the frozen fixture in tests/fixtures/record-cases.json, produced by
// running the Python recorder itself before it was retired (U-001), and compare the
// port's stdin/stdout/row/exit against it case by case. run_id and generated_at are frozen in
// the fixture as the placeholders <uuid4hex> and <utc-iso8601-Z> because both are minted fresh
// on every run; those two keys are compared by shape, everything else by exact value. The
// replay itself (runCli, withTempHome, seedHistory, readLines, assertRowLine, assertStdoutShape,
// fixture) lives in workflows/_lib/tests/_cli-fixture.ts, shared with
// workflows/assert/tests/record.test.ts; workflows/_lib/tests/cli-fixture.test.ts covers that
// shared replay's own key-order and placeholder-resolution behavior directly.
import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync } from "node:fs";
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
  type CliRun,
  type FixtureCase,
} from "../../_lib/tests/_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "record.ts");
const HISTORY_NAME = "build-runs.jsonl";
const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "record-cases.json"), "utf8"),
) as FixtureCase[];

const UUID4HEX = /^[0-9a-f]{32}$/;
const UTC_ISO8601_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SHAPE_CHECKS: Record<string, RegExp> = {
  "<uuid4hex>": UUID4HEX,
  "<utc-iso8601-Z>": UTC_ISO8601_Z,
};

test("T-107 every frozen case in record-cases.json reproduces the python recorder's exit code, stdout keys in order, and the appended rows' keys in order, with run_id and generated_at compared by shape", () => {
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

test("T-108 an unparseable or non-object payload exits 1, prints nothing to stdout, starts stderr with the python recorder's message prefix, and leaves no file behind", () => {
  for (const name of ["not_json", "non_object_payload"]) {
    const testCase = fixture(FIXTURES, name);
    withTempHome((home) => {
      const result = runCli(SCRIPT, home, testCase.stdin);
      assert.equal(result.status, 1, `${name}: exit code`);
      assert.equal(result.stdout, "", `${name}: stdout`);
      assert.equal(result.stderr.startsWith("Error: "), true, `${name}: stderr prefix`);
      assert.equal(existsSync(historyPath(home, HISTORY_NAME)), false, `${name}: no file written`);
    });
  }
});

test("T-109 a history whose last 20 started runs carry 3 plan-quality stops reports started 20, stops 3 and trigger_met true, and a line that does not parse raises skipped_lines by one", () => {
  const windowCase = fixture(FIXTURES, "window_20_trigger_met");
  withTempHome((home) => {
    seedHistory(home, HISTORY_NAME, windowCase.seed_lines ?? []);
    const result = runCli(SCRIPT, home, windowCase.stdin);
    assert.equal(result.status, 0, "window case: exit code");
    const row = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal(row.started, 20, "window case: started");
    assert.equal(row.stops, 3, "window case: stops");
    assert.equal(row.trigger_met, true, "window case: trigger_met");
  });

  const skipCase = fixture(FIXTURES, "unparseable_seed_line_skipped");
  withTempHome((home) => {
    seedHistory(home, HISTORY_NAME, skipCase.seed_lines ?? []);
    const result = runCli(SCRIPT, home, skipCase.stdin);
    assert.equal(result.status, 0, "skip case: exit code");
    const row = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal(row.skipped_lines, 1, "skip case: skipped_lines raised by the malformed line");
  });
});

test("T-110 a history the process cannot read back still prints path and run_id and exits 0", () => {
  withTempHome((home) => {
    const path = seedHistory(home, HISTORY_NAME, [
      '{"run_id": "run-pre", "reason": "started", "plan_quality": false}',
    ]);
    chmodSync(path, 0o200); // write-only: append still works, read-back for counting cannot
    let result: CliRun;
    try {
      result = runCli(
        SCRIPT,
        home,
        JSON.stringify({
          issue: "386",
          repo: "/abs/target-repo",
          branch: "feat/sample",
          reason: "started",
          plan_quality: false,
        }),
      );
    } finally {
      chmodSync(path, 0o600); // restore so the temp dir can be removed
    }
    assert.equal(result.status, 0, "unreadable history: exit code");
    const row = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal(row.path, path, "unreadable history: path");
    assert.equal(
      typeof row.run_id === "string" && row.run_id.length > 0,
      true,
      "unreadable history: run_id",
    );
  });
});

// Only a non-empty string counts as a supplied run_id. The Python recorder minted a fresh id for
// its falsy values ("" and empty containers among them); a JS truthiness test would have written
// "[object Object]" or "" as the row's run_id instead.
test("T-115 a run_id that is not a non-empty string is treated as absent and a fresh uuid is minted", () => {
  for (const supplied of [{}, [], "", 0, null]) {
    withTempHome((home) => {
      const result = runCli(
        SCRIPT,
        home,
        JSON.stringify({
          issue: "386",
          repo: "/abs/target-repo",
          reason: "stopped",
          run_id: supplied,
        }),
      );
      assert.equal(result.status, 0, `run_id ${JSON.stringify(supplied)}: exit code`);
      const printed = JSON.parse(result.stdout) as Record<string, unknown>;
      assert.match(String(printed.run_id), UUID4HEX, `run_id ${JSON.stringify(supplied)}: minted`);
      const [row] = readLines(historyPath(home, HISTORY_NAME)).map(
        (line) => JSON.parse(line) as Record<string, unknown>,
      );
      assert.equal(
        row.run_id,
        printed.run_id,
        `run_id ${JSON.stringify(supplied)}: row matches stdout`,
      );
    });
  }
});
