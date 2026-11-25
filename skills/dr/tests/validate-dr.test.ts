/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertStdoutShape, runCli, withTempHome } from "../../_lib/tests/_cli-fixture.ts";
import { countOptions, STATUS_VALUES } from "../scripts/validate-dr.ts";
import { type DrFixtureCase, withCaseDir } from "./_dr-cases.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const TS_SCRIPT = join(HERE, "..", "scripts", "validate-dr.ts");

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "validate-dr-cases.json"), "utf8"),
) as DrFixtureCase[];

test("every frozen case in validate-dr-cases.json reproduces the frozen exit code and stdout JSON", () => {
  for (const entry of CASES) {
    withCaseDir(entry.setup, (dir) => {
      const run = runCli(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
      assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
      assertStdoutShape(run.stdout, entry.stdout, {}, {}, entry.name);
    });
  }
});

test("STATUS_VALUES accepts the five lifecycle values including superseded by DR-NNNN and rejects a capitalised or free-text status as invalid_status", () => {
  for (const value of ["proposed", "accepted", "rejected", "deprecated", "superseded by DR-0001"]) {
    assert.equal(STATUS_VALUES.test(value), true, `${value}: accepted as a valid lifecycle value`);
  }
  for (const value of ["Accepted", "retired"]) {
    assert.equal(STATUS_VALUES.test(value), false, `${value}: rejected as invalid_status`);
  }
});

test("options are counted only under the Considered Options heading and a heading of the same or shallower depth ends the count", () => {
  const deeperHeadingStaysInSection = [
    "## Considered Options",
    "",
    "- Option A",
    "- Option B",
    "",
    "### Pros and Cons of Option A",
    "",
    "- a bullet under a deeper heading still counts",
  ];
  assert.equal(
    countOptions(deeperHeadingStaysInSection),
    3,
    "a heading deeper than Considered Options does not end the count",
  );

  const sameDepthHeadingEndsSection = [
    "## Considered Options",
    "- Option A",
    "## Decision Outcome",
    "- not counted, the section already ended",
  ];
  assert.equal(
    countOptions(sameDepthHeadingEndsSection),
    1,
    "a heading of the same depth as Considered Options ends the count",
  );

  const shallowerHeadingEndsSection = [
    "### Considered Options",
    "- Option A",
    "## Higher Level Heading",
    "- not counted, the section already ended",
  ];
  assert.equal(
    countOptions(shallowerHeadingEndsSection),
    1,
    "a heading shallower than Considered Options also ends the count",
  );
});

test("a directory argument fails with exit 1 and a single file-not-found stderr line, not a node stack trace", () => {
  withTempHome((home) => {
    const dir = mkdtempSync(join(home, "not-a-dr-file-"));
    const run = runCli(TS_SCRIPT, home, "", [dir], { cwd: home });
    assert.equal(run.status, 1, "exit code");
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, `Error: file not found: ${dir}\n`);
  });
});
