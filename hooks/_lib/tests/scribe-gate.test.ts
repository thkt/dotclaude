/// <reference types="node" />
// Pins scribe_gate.ts's CLI: the GITHUB_OUTPUT-writing behavior the retired Python original
// (docs/decisions/0116-place-the-scribe-gate-outside-the-hooks-shebang-rule.md) used to carry.
// Its own observations, and the differential check that once ran the .ts decision against that
// original, are history now that hooks/_lib/tests/scribe-gate-retirement.test.ts fixes the
// retirement. T-446/T-448 spawn the CLI, faking gh through CLAUDE_GH_BIN.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS_LIB_DIR = join(HERE, "..");
const GATE = join(HOOKS_LIB_DIR, "scribe_gate.ts");

// gh is the only external system should_run reaches, so only it stays faked while the gate runs
// for real. Reads one canned response per call, in call order, off a file GH_STUB_RESPONSES
// names and a position GH_STUB_INDEX tracks across the separate stub invocations one gate run
// can make.
const GH_STUB = `#!/usr/bin/env python3
import os
import pathlib
import sys

responses = pathlib.Path(os.environ["GH_STUB_RESPONSES"]).read_text(encoding="utf-8").split("\\n")
index_path = pathlib.Path(os.environ["GH_STUB_INDEX"])
i = int(index_path.read_text()) if index_path.is_file() else 0
index_path.write_text(str(i + 1))
sys.stdout.write(responses[i])
`;

/** Writes a fake gh to its own temp directory and the env vars that point CLAUDE_GH_BIN and the
 * stub itself at it, queuing `responses` in call order. */
function stubGh(responses: readonly string[]): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), "scribe-gate-gh-stub-"));
  const bin = join(dir, "gh");
  writeFileSync(bin, GH_STUB, "utf-8");
  chmodSync(bin, 0o755);
  const responsesFile = join(dir, "responses");
  writeFileSync(responsesFile, responses.join("\n"), "utf-8");
  return {
    CLAUDE_GH_BIN: bin,
    GH_STUB_RESPONSES: responsesFile,
    GH_STUB_INDEX: join(dir, "index"),
  };
}

interface GateResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs the gate CLI with `env` layered onto a clean copy of the current environment --
 * GITHUB_OUTPUT is never inherited from the test's own process, so a scenario that omits it
 * (T-448) omits it for real rather than by accident. */
function runGate(env: Record<string, string>): GateResult {
  const { GITHUB_OUTPUT: _dropped, ...base } = process.env;
  const result = spawnSync(process.execPath, [GATE], {
    encoding: "utf8",
    env: { ...base, ...env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test("T-446 the gate writes the should_run line into the file GITHUB_OUTPUT points at, for both the run and the skip decision", () => {
  // An unmerged scribe PR alone settles should_run=false.
  const skipDir = mkdtempSync(join(tmpdir(), "scribe-gate-skip-"));
  const skipOutput = join(skipDir, "github-output");
  const skipEnv = { ...stubGh(['[{"number": 1}]']), GITHUB_OUTPUT: skipOutput };
  const skipResult = runGate(skipEnv);
  assert.equal(skipResult.status, 0, skipResult.stderr);
  assert.equal(readFileSync(skipOutput, "utf-8"), "should_run=false\n");

  // No unmerged PR, then a merged PR newer than the cursor settles should_run=true.
  const runDir = mkdtempSync(join(tmpdir(), "scribe-gate-run-"));
  const runOutput = join(runDir, "github-output");
  const runEnv = {
    ...stubGh(["[]", "2026-01-01T00:00:00Z", '[{"number": 5}]']),
    GITHUB_OUTPUT: runOutput,
  };
  const runResult = runGate(runEnv);
  assert.equal(runResult.status, 0, runResult.stderr);
  assert.equal(readFileSync(runOutput, "utf-8"), "should_run=true\n");
});

test("T-448 a missing GITHUB_OUTPUT leaves the gate silent rather than failing", () => {
  const env = stubGh(['[{"number": 1}]']);
  const result = runGate(env);
  assert.equal(result.status, 0, result.stderr);
});
