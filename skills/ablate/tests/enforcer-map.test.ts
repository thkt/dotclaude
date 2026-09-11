/// <reference types="node" />
// In-process and CLI-facing tests for skills/ablate/scripts/enforcer_map.ts: DELETE_CANDIDATE,
// ABLATION_RESIDUE, ENFORCER_TABLE, classify_line, classify_file, target_files, map_all and
// main. skills/ablate/tests/fixtures/enforcer-map-cases.json was frozen against the real
// python3 Python version this module replaced; the scenarios below replay that same fixture
// against the .ts port rather than hand-writing a second set of expected rows that could drift
// from it (docs/wiki/fixture-freeze-before-port.md), the same DRY choice
// skills/_lib/tests/harness-elements.test.ts makes for harness_elements.ts.
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture, runCli } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import {
  loadTreeFixtures,
  replayTreeFixtures,
  writeTree,
} from "../../_lib/tests/_tree-fixture.ts";
import {
  ABLATION_RESIDUE,
  DELETE_CANDIDATE,
  ENFORCER_TABLE,
  classify_line,
  map_all,
} from "../scripts/enforcer_map.ts";
import type { EnforcerMapEntry } from "../scripts/enforcer_map.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "enforcer_map.ts");

const CASES = loadTreeFixtures(join(HERE, "fixtures", "enforcer-map-cases.json"));

test("T-351 classify_line returns the category the table names for each enforcer shape", () => {
  // ENFORCER_TABLE is an exported const object: its binding cannot be reassigned from outside
  // the module, but its contents can be mutated in place, the substitute for
  // enforcer_map_test.py's unittest.mock.patch.object(enforcer_map, "ENFORCER_TABLE", table).
  const original = { ...ENFORCER_TABLE };
  try {
    const coveredLine = "never use --no-verify";
    for (const key of Object.keys(ENFORCER_TABLE)) delete ENFORCER_TABLE[key];
    ENFORCER_TABLE[coveredLine] = "hooks/pre-commit-block-no-verify.py";

    // enforcer_map_test.py's T-001: a line an existing enforcer already covers.
    assert.equal(classify_line(coveredLine), DELETE_CANDIDATE);
    // enforcer_map_test.py's T-002: a line with no matching enforcer.
    assert.equal(classify_line("always ask before deleting a branch"), ABLATION_RESIDUE);

    // enforcer_map_test.py's T-003: removing the entry moves the same line to residue.
    delete ENFORCER_TABLE[coveredLine];
    assert.equal(classify_line(coveredLine), ABLATION_RESIDUE);
  } finally {
    for (const key of Object.keys(ENFORCER_TABLE)) delete ENFORCER_TABLE[key];
    Object.assign(ENFORCER_TABLE, original);
  }
});

test("T-352 map_all runs over an injected file list rather than the real tree, and returns the rows the python cases record", () => {
  const entry = fixture(
    CASES,
    "classifies_covered_and_uncovered_lines_across_every_always_loaded_file",
  );
  const root = writeTree("enforcer-map-inject", entry.files);
  try {
    const expected = JSON.parse(entry.stdout) as EnforcerMapEntry[];
    // The injected list carries only the two always-loaded files the fixture's own frozen
    // stdout reports on -- rules/path-triggered.md is deliberately left out, the same way
    // target_files(root) would leave it out by classification, so this scenario proves the
    // override replaces the real tree scan rather than merely adding to it.
    const result = map_all(root, ["CLAUDE.md", "rules/sample.md"]);
    assert.deepEqual(result, expected);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("T-353 the frozen CLI cases replay through the .ts entry point", () => {
  replayTreeFixtures(CASES, "enforcer-map-cli", (argv, root) => runCli(SCRIPT, root, "", argv));
});
