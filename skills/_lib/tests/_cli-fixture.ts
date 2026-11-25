/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface FixtureCase {
  name: string;
  argv?: string[];
  seed_lines?: string[];
  stdin: string;
  exit: number;
  stdout: string;
  rows?: Array<Record<string, unknown> | string>;
}

interface CliRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

export interface RunCliOptions {
  cwd?: string;
  env?: Record<string, string>;
}

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

export function withTempHome<T>(fn: (home: string) => T): T {
  const home = mkdtempSync(join(tmpdir(), "cli-fixture-test-"));
  try {
    return fn(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function assertRowShape(
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

export function fixture<T extends { name: string }>(fixtures: readonly T[], name: string): T {
  const found = fixtures.find((entry) => entry.name === name);
  assert.ok(found, `fixture case ${name} exists in the loaded fixtures`);
  return found as T;
}
