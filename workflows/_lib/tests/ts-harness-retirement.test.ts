/// <reference types="node" />
// run-workflow.js, codex-run.js and tests/_brace.js are retired once their TypeScript
// replacements (run-workflow.ts, codex-run.ts, tests/_brace.ts) carry the harness. This file
// guards the retirement itself, the same way workflows/_lib/tests/gate-retirement.test.ts guards
// gate.py's: no tracked file outside docs/decisions/ and .claude/workspace/research/ (kept as
// historical record, per docs/wiki/retire-rename-procedure.md) still names a retired path. The
// walk and the historical-directory exclusions are assertNoResidualReferences
// (workflows/_lib/tests/_retirement.ts), shared with gate-retirement.test.ts and
// record-retirement.test.ts, as are the tracked-file list and the positive control; this file
// keeps only its retired paths and their predicate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, assertNoResidualReferences } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));
const GATE_RETIREMENT_PATH = join(REPO_ROOT, "workflows", "_lib", "tests", "gate-retirement.test.ts");

// The three retired paths T-042 and T-043 used to check as two separate tests (one path, then a
// loop of two); T-053, T-430 and T-432 drive all three through this one list instead.
const RETIRED_PATHS = ["_lib/run-workflow.js", "_lib/codex-run.js", "_lib/tests/_brace.js"];

function referencesPath(content: string, retiredPath: string): boolean {
  return content.includes(retiredPath);
}

test(
  "T-053 no tracked file outside docs/decisions/ and .claude/workspace/research/ references " +
    "_lib/run-workflow.js, _lib/codex-run.js, or _lib/tests/_brace.js",
  () => {
    // Positive controls stay hand-typed literals, one per retired path, independent of
    // RETIRED_PATHS: a typo in that array must not flow into the fixture the control checks
    // against (docs/wiki/absence-test-positive-control-fixture.md item 4; T-431 pins this).
    // Each call stays on one line so that check can read its fixture argument back out.
    assertDetectsAndMisses((content) => referencesPath(content, "_lib/run-workflow.js"), "_lib/run-workflow.js");
    assertDetectsAndMisses((content) => referencesPath(content, "_lib/codex-run.js"), "_lib/codex-run.js");
    assertDetectsAndMisses((content) => referencesPath(content, "_lib/tests/_brace.js"), "_lib/tests/_brace.js");

    // The three residual-reference scans themselves, previously one assertion per test
    // (T-042 alone, T-043 looping two), now one loop over all three so a failure names the
    // offending path (T-432 pins this).
    for (const retiredPath of RETIRED_PATHS) {
      assertNoResidualReferences(
        REPO_ROOT,
        (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
        (content) => referencesPath(content, retiredPath),
        retiredPath,
        [SELF_PATH],
      );
    }
  },
);

test(
  "T-430 both retirement tests drive the shared scan, and each keeps its own historical-directory exclusions",
  () => {
    const read = (path: string): string => readFileSync(join(REPO_ROOT, path), "utf8");

    // gate-retirement.test.ts's own scenario, replayed here through the shared helper under its
    // own self-exclusion: must stay clean. Built from parts rather than written as one literal
    // substring, or T-014's own scan (this file is outside its exclusion list) would flag this
    // file as a new offender.
    const gateRetiredPath = ["_lib", "gate.py"].join("/");
    const gateSelfPath = "workflows/_lib/tests/gate-retirement.test.ts";
    assert.doesNotThrow(
      () =>
        assertNoResidualReferences(
          REPO_ROOT,
          read,
          (content) => content.includes(gateRetiredPath),
          gateRetiredPath,
          [gateSelfPath],
        ),
      "gate-retirement.test.ts's own retirement scan, driven through the shared helper, must " +
        "stay clean under its own self-exclusion",
    );

    // ts-harness-retirement.test.ts's own scenario for each of the three retired paths this
    // file checks, under its own self-exclusion: must stay clean too.
    for (const retiredPath of RETIRED_PATHS) {
      assert.doesNotThrow(
        () =>
          assertNoResidualReferences(
            REPO_ROOT,
            read,
            (content) => referencesPath(content, retiredPath),
            retiredPath,
            [SELF_PATH],
          ),
        `ts-harness-retirement.test.ts's own scan for ${retiredPath}, driven through the ` +
          "shared helper, must stay clean under its own self-exclusion",
      );
    }

    // Each call's exclusion list is its own: substituting ts-harness-retirement.test.ts's
    // self-exclusion into gate-retirement.test.ts's scenario must surface gate-retirement.test.ts
    // itself as an offender, because that file still names gateRetiredPath in its own source and
    // is no longer the excluded path.
    assert.throws(
      () =>
        assertNoResidualReferences(
          REPO_ROOT,
          read,
          (content) => content.includes(gateRetiredPath),
          gateRetiredPath,
          [SELF_PATH],
        ),
      "gate-retirement.test.ts's own self-exclusion must not be substitutable by another " +
        "file's, or the two retirement tests are not really keeping their own exclusions",
    );
  },
);

test(
  "T-431 a mistyped retired name makes the positive control fail, because the fixture is " +
    "built from a literal rather than from the searched constant",
  () => {
    const ownSource = readFileSync(fileURLToPath(import.meta.url), "utf8");
    const gateSource = readFileSync(GATE_RETIREMENT_PATH, "utf8");

    // assertDetectsAndMisses's 2nd argument builds the positive-control fixture
    // (docs/wiki/absence-test-positive-control-fixture.md item 4). When that argument is a bare
    // reference to the same constant the predicate searches for, a typo introduced in the
    // constant changes both sides together, so the positive control keeps passing even though
    // the scan it guards is now broken -- exactly the gap that wiki page's own retirement-test
    // citation names. The fixture argument must instead be a hand-typed literal, independent of
    // that constant.
    for (const [label, source] of [
      ["gate-retirement.test.ts", gateSource],
      ["ts-harness-retirement.test.ts", ownSource],
    ] as const) {
      // A genuine call site has "assertDetectsAndMisses(" in code position, not quoted inside a
      // string or regex literal -- this file's own source below names the call in both forms
      // (a filter string, a match() regex), so a bare .includes() would flag itself as a call.
      const callLines = source.split("\n").filter((line) => {
        const idx = line.indexOf("assertDetectsAndMisses(");
        if (idx === -1) return false;
        const before = line[idx - 1];
        return before === undefined || !['"', "'", "`", "/"].includes(before);
      });
      assert.ok(callLines.length > 0, `${label} must call assertDetectsAndMisses`);
      for (const line of callLines) {
        const m = line.match(/assertDetectsAndMisses\(.*,\s*([^);]+)\);/);
        assert.ok(m, `${label}: could not read assertDetectsAndMisses's arguments from: ${line}`);
        const fixtureArg = (m as RegExpMatchArray)[1].trim();
        assert.ok(
          fixtureArg.startsWith('"') || fixtureArg.startsWith("'") || fixtureArg.startsWith("`"),
          `${label}: assertDetectsAndMisses's fixture argument (\`${fixtureArg}\`) must be a ` +
            "literal, not a reference to the constant the predicate searches for",
        );
      }
    }
  },
);

test(
  "T-432 the three paths T-042 and T-043 checked separately run through one loop and report " +
    "the offending path by name",
  () => {
    const ownSource = readFileSync(fileURLToPath(import.meta.url), "utf8");

    const testNames = [...ownSource.matchAll(/test\(\s*"([^"]+)"/g)].map((m) => m[1]);
    const splitSurvivors = testNames.filter(
      (name) => name.startsWith("T-042") || name.startsWith("T-043"),
    );
    assert.deepEqual(
      splitSurvivors,
      [],
      "T-042 and T-043 must be merged into one test that loops over all three retired paths, " +
        `not left as separate tests: ${splitSurvivors.join(", ")}`,
    );

    const namesAllThreePaths = RETIRED_PATHS.every((retiredPath) =>
      ownSource.includes(`"${retiredPath}"`),
    );
    assert.ok(
      namesAllThreePaths,
      "one shared loop over the three retired paths " +
        `(${RETIRED_PATHS.join(", ")}) must replace the two separate T-042/T-043 tests`,
    );

    const loopMatch = ownSource.match(/for \(const retiredPath of RETIRED_PATHS\)/);
    assert.ok(
      loopMatch,
      "the merged test must run the three paths through one `for` loop over RETIRED_PATHS so a " +
        "failure message names the offending path, rather than one assertion per path",
    );
  },
);
