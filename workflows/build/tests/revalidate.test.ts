/// <reference types="node" />
// Behavior tests for workflows/build/revalidate.ts, the TypeScript port of the retired Python
// precondition verifier it replaces. T-141 replays every frozen case in
// tests/fixtures/revalidate-cases.json, produced by running the Python verifier itself before
// it was retired (U-003, U-009), and compares the port's exit code and parsed stdout against it
// case by case. T-142 exercises the fail-closed stderr contract for an unparseable payload and for
// a payload that parses but is not a JSON array. The replay (runCli, withTempHome, fixture)
// lives in workflows/_lib/tests/_cli-fixture.ts, shared with workflows/build/tests/record.test.ts.
//
// Unlike record.ts, this CLI reads the working tree at its process cwd rather than a
// $HOME/.claude/history file, so each case writes its fixture's `files` into the temp
// directory withTempHome creates and passes that directory as `cwd` to runCli, instead of
// using the shared fixture's seedHistory/historyPath (those target $HOME, not cwd).
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture, runCli, withTempHome, type FixtureCase } from "../../_lib/tests/_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "revalidate.ts");

interface RevalidateFixtureCase extends FixtureCase {
  files?: Array<{ path: string; content: string }>;
}

const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "revalidate-cases.json"), "utf8"),
) as RevalidateFixtureCase[];

/** Materializes a fixture case's `files` (path relative to `cwd`, plus content) under `cwd`,
 * creating any parent directories the path needs. */
function writeFixtureFiles(
  cwd: string,
  files: Array<{ path: string; content: string }> = [],
): void {
  for (const { path, content } of files) {
    const target = join(cwd, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

test("T-141 every frozen case in revalidate-cases.json reproduces the python verifier's exit code and parsed stdout", () => {
  for (const testCase of FIXTURES) {
    withTempHome((home) => {
      writeFixtureFiles(home, testCase.files);
      const result = runCli(SCRIPT, home, testCase.stdin, [], { cwd: home });
      assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
      if (testCase.stdout === "") {
        assert.equal(result.stdout, "", `${testCase.name}: stdout`);
      } else {
        assert.deepEqual(
          JSON.parse(result.stdout) as unknown,
          JSON.parse(testCase.stdout) as unknown,
          `${testCase.name}: parsed stdout`,
        );
      }
    });
  }
});

test("T-142 text that is not JSON and a JSON object exit 1, print nothing to stdout, and start stderr with Error: preconditions", () => {
  for (const name of ["not_json", "non_array_payload_fails_closed"]) {
    const testCase = fixture(FIXTURES, name) as RevalidateFixtureCase;
    withTempHome((home) => {
      writeFixtureFiles(home, testCase.files);
      const result = runCli(SCRIPT, home, testCase.stdin, [], { cwd: home });
      assert.equal(result.status, 1, `${name}: exit code`);
      assert.equal(result.stdout, "", `${name}: stdout`);
      assert.equal(
        result.stderr.startsWith("Error: preconditions"),
        true,
        `${name}: stderr prefix`,
      );
    });
  }
});
