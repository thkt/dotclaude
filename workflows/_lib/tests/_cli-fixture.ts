/// <reference types="node" />
// Shared by workflows/build/tests/record.test.ts and workflows/assert/tests/record.test.ts,
// and open to an argv-based CLI fixture such as #631's validate-issue-body: each needs to
// launch a CLI under a temp HOME, replay a frozen fixture case (argv and stdin in, exit code
// and stdout out), and compare the result against the frozen case with certain
// values (a minted uuid, a resolved history path) checked by shape instead of exact value.
// This module gives that replay one home, in the same shape as
// workflows/_lib/tests/_brace.ts (small, independently testable, named exports; no .ja
// mirror, per rules/conventions/MIRROR.md -- tests stay English-only).
//
// Two layers:
//   - CLI-replay core (record-agnostic): FixtureCase, CliRun, runCli, withTempHome,
//     assertRowShape, assertStdoutShape, fixture. FixtureCase's seed_lines and rows are
//     optional -- only a history-backed CLI seeds a file before the run and checks appended
//     rows after it; an argv CLI with no file of its own supplies neither.
//   - record layer, on top of the core: historyPath, seedHistory, readLines, assertRowLine.
//     Adds the $HOME/.claude/history/<name>.jsonl concept the build and assert recorders
//     share. historyPath calls workflows/_lib/cli.ts's historyPath(home, name) -- the same
//     function the CLIs under test call -- rather than hand-joining ".claude"/"history" a
//     second time the way workflows/build/tests/record.test.ts and
//     workflows/assert/tests/record.test.ts each used to.
//
// T-123 and T-124 exercise the shape-aware comparison below (key-order check, placeholder
// resolution) directly against workflows/build/record.ts; workflows/build/tests/record.test.ts
// and workflows/assert/tests/record.test.ts exercise it again, end to end, through their own
// fixtures.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Re-exported so a caller (a test, or seedHistory/readLines below) reaches the same function
// the CLI under test calls through this fixture module, without hand-joining
// ".claude"/"history" a second time.
import { historyPath } from "../cli.ts";
export { historyPath };

/** One frozen replay case: argv and stdin in, exit code and stdout out. argv is optional for
 * a stdin-only CLI; seed_lines and rows are optional -- only a history-backed CLI seeds a file
 * before the run and checks appended rows after it. */
export interface FixtureCase {
  name: string;
  argv?: string[];
  seed_lines?: string[];
  stdin: string;
  exit: number;
  stdout: string;
  rows?: Array<Record<string, unknown> | string>;
}

export interface CliRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** `cwd` and `env` for a `runCli` call that needs the CLI under test to read a file relative to
 * a caller-chosen directory, or to reach a real binary (`git`, `gh`) through a restored PATH. */
export interface RunCliOptions {
  cwd?: string;
  env?: Record<string, string>;
}

/** Run `scriptPath` with `argv` under a temp HOME, feeding `stdin`, with PATH cleared so the
 * CLI cannot lean on anything found via the ambient PATH. `options.cwd` passes straight through
 * to `spawnSync`, and `options.env` layers over the cleared-PATH env above -- so a caller can
 * restore PATH (to reach a real `git`/`gh`) while HOME still points at the temp home. */
export function runCli(
  scriptPath: string,
  home: string,
  stdin: string,
  argv: readonly string[] = [],
  options: RunCliOptions = {},
): CliRun {
  const result = spawnSync(process.execPath, [scriptPath, ...argv], {
    input: stdin,
    encoding: "utf8",
    cwd: options.cwd,
    env: { ...process.env, HOME: home, PATH: "", ...options.env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Runs `fn` against a freshly created temp directory used as HOME, removing it afterward
 * whether `fn` returns or throws. */
export function withTempHome<T>(fn: (home: string) => T): T {
  const home = mkdtempSync(join(tmpdir(), "cli-fixture-test-"));
  try {
    return fn(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

/** Asserts `actual` carries the same keys, in the same order, as `expected`, and that each
 * value matches -- exactly, except a value naming one of `shapeChecks` is checked by regex
 * instead, for a field minted fresh on every run (a uuid, a timestamp). */
export function assertRowShape(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
  shapeChecks: Record<string, RegExp>,
  label: string,
): void {
  assert.deepEqual(Object.keys(actual), Object.keys(expected), `${label}: key order`);
  for (const [key, expectedValue] of Object.entries(expected)) {
    const shape = typeof expectedValue === "string" ? shapeChecks[expectedValue] : undefined;
    if (shape) {
      assert.match(String(actual[key]), shape, `${label}.${key}: shape`);
    } else {
      assert.deepEqual(actual[key], expectedValue, `${label}.${key}: value`);
    }
  }
}

/** The fixture's stdout is a single JSON line (or "" for an exit-nonzero case), compared the
 * same shape-aware way as a row. A value in `expected` that names a key of `placeholders` is
 * resolved to that real value first (e.g. "<history-path>" to this run's own history path)
 * before the shape-aware comparison runs. */
export function assertStdoutShape(
  actualStdout: string,
  expectedStdout: string,
  placeholders: Record<string, string>,
  shapeChecks: Record<string, RegExp>,
  label: string,
): void {
  if (expectedStdout === "") {
    assert.equal(actualStdout, "", `${label}: stdout`);
    return;
  }
  assert.equal(actualStdout.endsWith("\n"), true, `${label}: stdout ends with a newline`);
  const expected = JSON.parse(expectedStdout) as Record<string, unknown>;
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === "string" && value in placeholders) {
      expected[key] = placeholders[value];
    }
  }
  assertRowShape(
    JSON.parse(actualStdout) as Record<string, unknown>,
    expected,
    shapeChecks,
    `${label}: stdout`,
  );
}

/** The fixture case named `name` in `fixtures`. */
export function fixture<T extends { name: string }>(fixtures: readonly T[], name: string): T {
  const found = fixtures.find((entry) => entry.name === name);
  assert.ok(found, `fixture case ${name} exists in the loaded fixtures`);
  return found as T;
}

/** Writes `lines` (each newline-terminated) to the history file named `name` under `home`,
 * returning its path. */
export function seedHistory(home: string, name: string, lines: readonly string[]): string {
  const path = historyPath(home, name);
  writeFileSync(path, lines.map((line) => `${line}\n`).join(""));
  return path;
}

/** Every non-blank line of the file at `path`, or an empty array when it does not exist. */
export function readLines(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "");
}

/** One appended row, compared against the fixture's row: a raw seed line the fixture kept as
 * an un-reparsed string compares literally, everything else parses as JSON first and goes
 * through assertRowShape. */
export function assertRowLine(
  actualLine: string,
  expectedRow: Record<string, unknown> | string,
  shapeChecks: Record<string, RegExp>,
  label: string,
): void {
  if (typeof expectedRow === "string") {
    assert.equal(actualLine, expectedRow, `${label}: raw line`);
    return;
  }
  assertRowShape(
    JSON.parse(actualLine) as Record<string, unknown>,
    expectedRow,
    shapeChecks,
    label,
  );
}
