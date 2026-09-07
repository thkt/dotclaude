/// <reference types="node" />
// Behavior tests for workflows/build/record.ts, the TypeScript port of the Python build recorder.
// T-107..T-110 replay the frozen fixture in tests/fixtures/record-cases.json, produced by
// running the Python recorder itself before it was retired (U-001), and compare the
// port's stdin/stdout/row/exit against it case by case. run_id and generated_at are frozen in
// the fixture as the placeholders <uuid4hex> and <utc-iso8601-Z> because both are minted fresh
// on every run; those two keys are compared by shape, everything else by exact value.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "record.ts");
const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "record-cases.json"), "utf8"),
) as FixtureCase[];

interface FixtureCase {
  name: string;
  seed_lines: string[];
  stdin: string;
  exit: number;
  stdout: string;
  stderr: string;
  rows: Array<Record<string, unknown> | string>;
}

interface CliRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

const UUID4HEX = /^[0-9a-f]{32}$/;
const UTC_ISO8601_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SHAPE_CHECKS: Record<string, RegExp> = {
  "<uuid4hex>": UUID4HEX,
  "<utc-iso8601-Z>": UTC_ISO8601_Z,
};

function runCli(home: string, stdin: string): CliRun {
  const result = spawnSync(process.execPath, [SCRIPT], {
    input: stdin,
    encoding: "utf8",
    env: { ...process.env, HOME: home, PATH: "" },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function historyPath(home: string): string {
  return join(home, ".claude", "history", "build-runs.jsonl");
}

function seedHistory(home: string, lines: readonly string[]): string {
  const path = historyPath(home);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.map((line) => `${line}\n`).join(""));
  return path;
}

function readLines(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "");
}

function withTempHome<T>(fn: (home: string) => T): T {
  const home = mkdtempSync(join(tmpdir(), "record-test-"));
  try {
    return fn(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

/** Asserts `actual` carries the same keys, in the same order, as `expected`, and that each
 * value matches -- exactly, except a value naming one of SHAPE_CHECKS is checked by regex
 * instead, since run_id and generated_at are minted fresh on every run. */
function assertRowShape(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
  label: string,
): void {
  assert.deepEqual(Object.keys(actual), Object.keys(expected), `${label}: key order`);
  for (const [key, expectedValue] of Object.entries(expected)) {
    const shape = typeof expectedValue === "string" ? SHAPE_CHECKS[expectedValue] : undefined;
    if (shape) {
      assert.match(String(actual[key]), shape, `${label}.${key}: shape`);
    } else {
      assert.deepEqual(actual[key], expectedValue, `${label}.${key}: value`);
    }
  }
}

/** The fixture's stdout is a single JSON line (or "" for the exit-1 cases). Parsed and
 * compared the same shape-aware way as a row -- except "path", which the fixture froze as
 * the literal absolute path from whatever temp $HOME U-001's fixture-generation run happened
 * to get. Every test run mints its own $HOME (withTempHome), so that literal can never recur;
 * "path" is instead checked against this run's own historyPath(home), the same way run_id and
 * generated_at are checked by shape rather than by value. */
function assertStdoutShape(
  actualStdout: string,
  expectedStdout: string,
  home: string,
  label: string,
): void {
  if (expectedStdout === "") {
    assert.equal(actualStdout, "", `${label}: stdout`);
    return;
  }
  assert.equal(actualStdout.endsWith("\n"), true, `${label}: stdout ends with a newline`);
  const { path: actualPath, ...actualRest } = JSON.parse(actualStdout) as Record<string, unknown>;
  const { path: _expectedPath, ...expectedRest } = JSON.parse(expectedStdout) as Record<
    string,
    unknown
  >;
  assert.equal(actualPath, historyPath(home), `${label}: stdout.path`);
  assertRowShape(actualRest, expectedRest, `${label}: stdout`);
}

/** One appended row, compared against the fixture's row: a raw seed line the fixture kept as
 * an un-reparsed string compares literally, everything else parses as JSON first. */
function assertRowLine(
  actualLine: string,
  expectedRow: Record<string, unknown> | string,
  label: string,
): void {
  if (typeof expectedRow === "string") {
    assert.equal(actualLine, expectedRow, `${label}: raw line`);
    return;
  }
  assertRowShape(JSON.parse(actualLine) as Record<string, unknown>, expectedRow, label);
}

function fixture(name: string): FixtureCase {
  const found = FIXTURES.find((entry) => entry.name === name);
  assert.ok(found, `fixture case ${name} exists in record-cases.json`);
  return found as FixtureCase;
}

test("T-107 every frozen case in record-cases.json reproduces the python recorder's exit code, stdout keys in order, and the appended rows' keys in order, with run_id and generated_at compared by shape", () => {
  for (const testCase of FIXTURES) {
    withTempHome((home) => {
      if (testCase.seed_lines.length > 0) {
        seedHistory(home, testCase.seed_lines);
      }
      const result = runCli(home, testCase.stdin);
      assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
      assertStdoutShape(result.stdout, testCase.stdout, home, testCase.name);

      const actualLines = readLines(historyPath(home));
      assert.equal(actualLines.length, testCase.rows.length, `${testCase.name}: row count`);
      actualLines.forEach((line, index) => {
        assertRowLine(line, testCase.rows[index], `${testCase.name}: row ${index}`);
      });
    });
  }
});

test("T-108 an unparseable or non-object payload exits 1, prints nothing to stdout, starts stderr with the python recorder's message prefix, and leaves no file behind", () => {
  for (const name of ["not_json", "non_object_payload"]) {
    const testCase = fixture(name);
    withTempHome((home) => {
      const result = runCli(home, testCase.stdin);
      assert.equal(result.status, 1, `${name}: exit code`);
      assert.equal(result.stdout, "", `${name}: stdout`);
      assert.equal(result.stderr.startsWith("Error: "), true, `${name}: stderr prefix`);
      assert.equal(existsSync(historyPath(home)), false, `${name}: no file written`);
    });
  }
});

test("T-109 a history whose last 20 started runs carry 3 plan-quality stops reports started 20, stops 3 and trigger_met true, and a line that does not parse raises skipped_lines by one", () => {
  const windowCase = fixture("window_20_trigger_met");
  withTempHome((home) => {
    seedHistory(home, windowCase.seed_lines);
    const result = runCli(home, windowCase.stdin);
    assert.equal(result.status, 0, "window case: exit code");
    const row = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal(row.started, 20, "window case: started");
    assert.equal(row.stops, 3, "window case: stops");
    assert.equal(row.trigger_met, true, "window case: trigger_met");
  });

  const skipCase = fixture("unparseable_seed_line_skipped");
  withTempHome((home) => {
    seedHistory(home, skipCase.seed_lines);
    const result = runCli(home, skipCase.stdin);
    assert.equal(result.status, 0, "skip case: exit code");
    const row = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal(row.skipped_lines, 1, "skip case: skipped_lines raised by the malformed line");
  });
});

test("T-110 a history the process cannot read back still prints path and run_id and exits 0", () => {
  withTempHome((home) => {
    const path = seedHistory(home, [
      '{"run_id": "run-pre", "reason": "started", "plan_quality": false}',
    ]);
    chmodSync(path, 0o200); // write-only: append still works, read-back for counting cannot
    let result: CliRun;
    try {
      result = runCli(
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
