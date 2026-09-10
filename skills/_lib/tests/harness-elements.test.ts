/// <reference types="node" />
// Behavior tests for skills/_lib/harness_elements.ts: the TS port of harness_elements.py's
// classify, enumerate_elements and main. skills/_lib/tests/fixtures/harness-elements-cases.json
// (built by U-001) freezes the real python3 harness_elements.py's own argv -> exit/stdout,
// captured against a constructed temp repo tree; every scenario below drives that same fixture
// through classify()/enumerate_elements() directly or through the .ts CLI, rather than
// hand-copying the frontmatter shapes or the expected element list a second time
// (docs/wiki/harness-production-divergence.md; the same DRY choice harness_elements.py's own
// _instantiate helper makes for its test suite).
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runCli } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { writeTree } from "./_python-cli-fixture.ts";
import { classify, enumerate_elements } from "../harness_elements.ts";
import type { HarnessElement } from "../harness_elements.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "harness_elements.ts");

const ROOT_PLACEHOLDER = "<root>";

interface FixtureCase {
  name: string;
  files: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "harness-elements-cases.json"), "utf8"),
) as FixtureCase[];

function fixture(name: string): FixtureCase {
  const found = CASES.find((entry) => entry.name === name);
  assert.ok(found, `fixture case ${name} exists in the loaded fixtures`);
  return found as FixtureCase;
}

// The one fixture case that carries every frontmatter shape harness_elements.py's own
// classify() branches on (no-frontmatter rules file, paths-bearing rules file, globs-bearing
// docs/wiki page, and the non-prompt leftovers), recorded by running the real python3 CLI --
// not a second, hand-written copy of those shapes.
const MULTI_SHAPE_CASE = fixture("classifies_every_element_kind_and_collapses_a_ja_mirror");

function expectedElements(entry: FixtureCase): HarnessElement[] {
  return JSON.parse(entry.stdout) as HarnessElement[];
}

test("T-348 classify returns the same category for each frontmatter shape the python cases record", () => {
  const root = writeTree("harness-elements-classify", MULTI_SHAPE_CASE.files);
  try {
    for (const expected of expectedElements(MULTI_SHAPE_CASE)) {
      const actual = classify(join(root, expected.path));
      assert.equal(
        actual,
        expected.classification,
        `${expected.path}: expected ${expected.classification}, got ${actual}`,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("T-349 enumerate_elements returns the same element list for a constructed tree, compared as names", () => {
  const root = writeTree("harness-elements-enumerate", MULTI_SHAPE_CASE.files);
  try {
    const expectedNames = expectedElements(MULTI_SHAPE_CASE)
      .map((element) => element.path)
      .sort();
    const actualNames = enumerate_elements(root)
      .map((element) => element.path)
      .sort();
    assert.deepEqual(actualNames, expectedNames);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("T-350 the frozen CLI cases replay through the .ts entry point", () => {
  assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
  for (const entry of CASES) {
    const root = writeTree("harness-elements-cli", entry.files);
    try {
      const argv = entry.argv.map((token) => (token === ROOT_PLACEHOLDER ? root : token));
      const run = runCli(SCRIPT, root, "", argv);
      assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
      assert.equal(
        run.stdout,
        entry.stdout.replaceAll(ROOT_PLACEHOLDER, root),
        `${entry.name}: stdout`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
