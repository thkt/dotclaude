/// <reference types="node" />
// Ports hooks/_lib/tests/scribe_gate_test.py's observations to the .ts side (DR-0116 keeps
// scribe_gate.ts in hooks/_lib/, next to scribe_trigger.py/.ts). T-446/T-448 spawn the CLI the
// way scribe_gate_test.py's TestCli does, faking gh through CLAUDE_GH_BIN the way that file's
// GH_STUB does. T-447 pins shouldRun's decision against scribe_gate.py itself for the same
// canned-response scenarios TestShouldRun records (T-003/T-004/T-005), so a TypeScript bug that
// flips a decision shows up as a mismatch with the Python side, not just a wrong constant --
// mirrors hooks/_lib/tests/hook-payload-parity.test.ts's differential-test shape.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { shouldRun } from "../scribe_gate.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS_LIB_DIR = join(HERE, "..");
const GATE = join(HOOKS_LIB_DIR, "scribe_gate.ts");

// Copied from scribe_gate_test.py's GH_STUB: gh is the only external system should_run reaches,
// so only it stays faked while the gate runs for real. Reads one canned response per call, in
// call order, off a file GH_STUB_RESPONSES names and a position GH_STUB_INDEX tracks across the
// separate stub invocations one gate run can make.
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
  // An unmerged scribe PR alone settles should_run=false, the same single-call shape
  // scribe_gate_test.py's T-003 uses.
  const skipDir = mkdtempSync(join(tmpdir(), "scribe-gate-skip-"));
  const skipOutput = join(skipDir, "github-output");
  const skipEnv = { ...stubGh(['[{"number": 1}]']), GITHUB_OUTPUT: skipOutput };
  const skipResult = runGate(skipEnv);
  assert.equal(skipResult.status, 0, skipResult.stderr);
  assert.equal(readFileSync(skipOutput, "utf-8"), "should_run=false\n");

  // No unmerged PR, then a merged PR newer than the cursor settles should_run=true, the same
  // three-call shape scribe_gate_test.py's T-005 uses.
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

// The same canned gh responses scribe_gate_test.py's TestShouldRun (T-003/T-004/T-005) records,
// frozen here so a change to either implementation's decision logic shows up as a mismatch
// against the other rather than against a hand-picked constant.
const FROZEN_CASES: ReadonlyArray<{ id: string; responses: readonly string[]; expected: boolean }> = [
  { id: "T-003", responses: ['[{"number": 1}]'], expected: false },
  { id: "T-004", responses: ["[]", "2026-01-01T00:00:00Z", "[]", "[]"], expected: false },
  { id: "T-005", responses: ["[]", "2026-01-01T00:00:00Z", '[{"number": 5}]'], expected: true },
];

const PY_DRIVER = `
import json
import sys

sys.path.insert(0, sys.argv[1])
import scribe_gate

responses = json.loads(sys.stdin.read())
queue = list(responses)


def runner(args):
    return queue.pop(0)


result = scribe_gate.should_run(runner=runner)
print(json.dumps({"result": result}))
`;

function runPython(responses: readonly string[]): boolean {
  const result = spawnSync("python3", ["-c", PY_DRIVER, HOOKS_LIB_DIR], {
    input: JSON.stringify(responses),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return (JSON.parse(result.stdout) as { result: boolean }).result;
}

test("T-447 the decision matches the python version for each input the frozen cases record", () => {
  for (const { id, responses, expected } of FROZEN_CASES) {
    const queue = [...responses];
    const runner = (): string => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error(`${id}: gh called more times than the frozen case has responses`);
      }
      return next;
    };

    const tsResult = shouldRun({ runner });
    const pyResult = runPython(responses);

    assert.equal(tsResult, expected, `${id}: scribe_gate.ts`);
    assert.equal(pyResult, expected, `${id}: scribe_gate.py`);
    assert.equal(tsResult, pyResult, `${id}: scribe_gate.ts and scribe_gate.py must agree`);
  }
});

test("T-448 a missing GITHUB_OUTPUT leaves the gate silent rather than failing", () => {
  const env = stubGh(['[{"number": 1}]']);
  const result = runGate(env);
  assert.equal(result.status, 0, result.stderr);
});
