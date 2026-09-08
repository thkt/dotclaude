/// <reference types="node" />
// Behavior tests for workflows/build/verify-pr.ts, the TypeScript port of the retired Python PR
// verifier it replaces. T-147 replays every frozen case in
// tests/fixtures/verify-pr-cases.json, produced by running the Python verifier itself before
// it was retired (U-004, U-009), and compares the port's exit code and parsed stdout against it
// case by case. Each case whose `gh` field is non-empty gets a fake `gh` executable dropped into a
// temp directory with PATH pointed at that directory alone, so the CLI's own `gh pr view`
// call reaches this fake instead of a real `gh`; a case with no `gh` field never reaches the
// spawn (its payload fails validation first) and runs with PATH left empty. T-148 exercises
// the fail-closed stderr contract for a payload naming neither repository nor cwd, and for a
// relative cwd. The replay (runCli, withTempHome, fixture) lives in
// workflows/_lib/tests/_cli-fixture.ts, shared with workflows/build/tests/record.test.ts,
// workflows/build/tests/revalidate.test.ts, and workflows/build/tests/diff-files.test.ts.
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture, runCli, withTempHome, type FixtureCase } from "../../_lib/tests/_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "verify-pr.ts");

interface VerifyPrFixtureCase extends FixtureCase {
  gh: string;
}

const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "verify-pr-cases.json"), "utf8"),
) as VerifyPrFixtureCase[];

/** Writes `script` as an executable `gh` under a fresh temp directory below `root`, returning
 * that directory's path -- suitable as the sole entry of PATH so the CLI's `gh pr view` call
 * reaches this fake instead of a real `gh`. */
function fakeGhDir(root: string, script: string): string {
  const dir = mkdtempSync(join(root, "fake-gh-"));
  const ghPath = join(dir, "gh");
  writeFileSync(ghPath, script);
  chmodSync(ghPath, 0o755);
  return dir;
}

test("T-147 every frozen case in verify-pr-cases.json reproduces the python verifier's exit code and parsed stdout with the fake gh answering as recorded", () => {
  for (const testCase of FIXTURES) {
    withTempHome((home) => {
      const options = testCase.gh
        ? { cwd: home, env: { PATH: fakeGhDir(home, testCase.gh) } }
        : { cwd: home, env: { PATH: "" } };
      const result = runCli(SCRIPT, home, testCase.stdin, [], options);
      assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
      if (testCase.stdout === "") {
        assert.equal(result.stdout, "", `${testCase.name}: stdout`);
        return;
      }
      assert.deepEqual(
        JSON.parse(result.stdout) as unknown,
        JSON.parse(testCase.stdout) as unknown,
        `${testCase.name}: parsed stdout`,
      );
    });
  }
});

const STDERR_PREFIXES: Record<string, string> = {
  exits_1_when_neither_repository_nor_cwd_says_which_repository_to_ask:
    "either repository or cwd is required, so gh knows which repository to ask",
  exits_1_on_a_relative_working_directory: "cwd must be an absolute path when present",
};

test("T-148 a payload with neither repository nor cwd, and a relative cwd, each exit 1 with the python verifier's stderr prefix and no stdout", () => {
  for (const [name, prefix] of Object.entries(STDERR_PREFIXES)) {
    const testCase = fixture(FIXTURES, name);
    withTempHome((home) => {
      const result = runCli(SCRIPT, home, testCase.stdin, [], {
        cwd: home,
        env: { PATH: "" },
      });
      assert.equal(result.status, 1, `${name}: exit code`);
      assert.equal(result.stdout, "", `${name}: stdout`);
      assert.equal(result.stderr.startsWith(prefix), true, `${name}: stderr prefix`);
    });
  }
});
