/// <reference types="node" />
// Behavior tests for skills/dr/scripts/validate-dr.ts: the TS port of the retired Python
// validate-dr's section checks, frontmatter/status validation, options counting, and
// markdownlint-cli2 wiring. skills/dr/tests/fixtures/validate-dr-cases.json (built by U-001)
// freezes the retired Python validate-dr's own argv/env -> exit/stdout, so T-204 replays it
// through workflows/_lib/tests/_cli-fixture.ts's runCli rather than hand-writing cases that
// could drift from the Python script it must match.
// T-205..T-207 isolate the STATUS_VALUES, countOptions, and lint_check wiring the fixture
// cases only cover indirectly.
//
// This unit is still Red (see validate-dr.ts's own header): every scenario below fails on its
// planned assertion against the scaffold's "not implemented" stub, not on a module/parse/type
// error.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertStdoutShape, fixture, runCli } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { countOptions, STATUS_VALUES } from "../scripts/validate-dr.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/dr/tests -> skills/dr -> skills -> repo root, the same climb
// skills/dr/tests/pre-check.test.ts's TS_SCRIPT makes from the same starting point.
const TS_SCRIPT = join(HERE, "..", "scripts", "validate-dr.ts");

interface FixtureCase {
  name: string;
  setup: Record<string, string>;
  argv: string[];
  env: Record<string, string>;
  exit: number;
  stdout: string;
  files_after: Record<string, string>;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "validate-dr-cases.json"), "utf8"),
) as FixtureCase[];

/** Creates a fresh temp directory, writes `setup`'s files under it (each key a path relative
 * to the directory), runs `fn` against it, and removes it afterward whether `fn` returns or
 * throws -- so a case's leftover files never bleed into the next case. The same helper
 * skills/dr/tests/pre-check.test.ts's withCaseDir provides, duplicated here rather than
 * shared: the two CLIs' fixture shapes are unrelated beyond this one setup step. */
function withCaseDir<T>(setup: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "validate-dr-case-"));
  try {
    for (const [relPath, content] of Object.entries(setup)) {
      const full = join(dir, relPath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("T-204 every frozen case in validate-dr-cases.json reproduces the python script's exit code and stdout JSON", () => {
  for (const entry of CASES) {
    withCaseDir(entry.setup, (dir) => {
      const run = runCli(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
      assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
      assertStdoutShape(run.stdout, entry.stdout, {}, {}, entry.name);
    });
  }
});

test("T-205 STATUS_VALUES accepts the five lifecycle values including superseded by DR-NNNN and rejects a capitalised or free-text status as invalid_status", () => {
  for (const value of ["proposed", "accepted", "rejected", "deprecated", "superseded by DR-0001"]) {
    assert.equal(STATUS_VALUES.test(value), true, `${value}: accepted as a valid lifecycle value`);
  }
  for (const value of ["Accepted", "retired"]) {
    assert.equal(STATUS_VALUES.test(value), false, `${value}: rejected as invalid_status`);
  }
});

test("T-206 options are counted only under the Considered Options heading and a heading of the same or shallower depth ends the count", () => {
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

test("T-207 with markdownlint-cli2 absent from PATH the checks carry markdown_lint=skipped", () => {
  const entry = fixture(CASES, "four-required-sections-frontmatter-and-two-options-exit-0");
  withCaseDir(entry.setup, (dir) => {
    // runCli clears PATH by default (workflows/_lib/tests/_cli-fixture.ts's runCli), so
    // markdownlint-cli2 is unreachable here the same way it was when the fixture was frozen.
    const run = runCli(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
    assert.equal(run.status, entry.exit, `exit code (stderr: ${run.stderr})`);
    const parsed = JSON.parse(run.stdout) as { checks: string[] };
    assert.ok(
      parsed.checks.includes("markdown_lint=skipped (markdownlint-cli2 not installed)"),
      `checks carries markdown_lint=skipped (checks: ${JSON.stringify(parsed.checks)})`,
    );
  });
});
