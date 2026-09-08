/// <reference types="node" />
// review_score.py (skills/_lib/review_score.py, .ja/skills/_lib/review_score.py,
// skills/_lib/tests/review_score_test.py) is retired in favor of review_score.ts (established
// by the preceding units U-001/U-002/U-003). This file guards the retirement itself: no
// tracked file still names review_score.py, and the EN / .ja reviewer harness procedure and
// TESTING.md reviewer row invoke review_score.ts through node rather than review_score.py
// through python3.
//
// Same shape as workflows/_lib/tests/record-retirement.test.ts, which guards its own
// retirement: offendersAmong/trackedFiles/assertDetectsAndMisses from
// workflows/_lib/tests/_retirement.ts drive a full-tree scan, and only the helper's own
// defaults (docs/decisions/, .claude/workspace/research/) plus this file itself are excluded.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/_lib/tests -> skills/_lib -> skills -> repo root, the same climb
// harness-hash-cli.test.ts's REPO_ROOT makes from the same starting point.
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// A word boundary, not a bare substring: review_score.py.bak or my_review_score.py would not
// count as the retired file being referenced. Mirrors record-retirement.test.ts's own
// RETIRED_PATTERN.
const RETIRED_PATTERN = /(^|[^\w.-])review_score\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-174 no tracked file outside docs/decisions/ and .claude/workspace/research/ references " +
    "review_score.py as a word, and the same predicate flags a fixture line carrying it",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "review_score.py");

    // This test's own file names review_score.py in comments to describe what it checks; the
    // historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredPath,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/ and .claude/workspace/research/ references " +
        `review_score.py\n${offenders.join(", ")}`,
    );
  },
);

// Same extraction shape as workflows/_lib/tests/record-retirement.test.ts's
// extractRecorderInvocation: read the source text and pull out what the procedure actually
// names, never a copied-in literal (docs/wiki/workflow-const-source-text-check.md).
//
// review-harness.md's step 5 line carries the command inside a single backtick pair, on both
// trees (the command is code, not translated prose).
function extractStep5Command(source: string): string | null {
  const line = source.split("\n").find((l) => /^\s*5\.\s/.test(l) && l.includes("review_score"));
  if (!line) return null;
  const m = line.match(/`([^`]*review_score\.(?:ts|py)[^`]*)`/);
  return m ? m[1] : null;
}

// TESTING.md's reviewer row carries the bare filename inside a single backtick pair, on both
// trees.
function extractTestingReviewerCell(source: string): string | null {
  const m = source.match(/`(review_score\.(?:ts|py))`/);
  return m ? m[1] : null;
}

interface HarnessProcedureSource {
  label: string;
  path: string;
}

const HARNESS_PROCEDURE_SOURCES: HarnessProcedureSource[] = [
  { label: "skills/_lib/review-harness.md", path: "skills/_lib/review-harness.md" },
  { label: ".ja/skills/_lib/review-harness.md", path: ".ja/skills/_lib/review-harness.md" },
];

const TESTING_TABLE_SOURCES: HarnessProcedureSource[] = [
  { label: "rules/development/TESTING.md", path: "rules/development/TESTING.md" },
  { label: ".ja/rules/development/TESTING.md", path: ".ja/rules/development/TESTING.md" },
];

test(
  "T-175 the reviewer harness procedure and the TESTING.md reviewer row name review_score.ts " +
    "in both trees, and the procedure invokes it through node rather than python3",
  () => {
    for (const { label, path } of HARNESS_PROCEDURE_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const invocation = extractStep5Command(source);
      assert.ok(invocation, `${label} step 5 command is extractable from source`);
      // One fixed line per source, carrying no offender list, so a --require-output anchor on
      // the Red gate can seal on exactly one line rather than on a set that could reorder.
      assert.ok(
        invocation !== null &&
          invocation.startsWith("node ") &&
          invocation.includes("review_score.ts") &&
          !invocation.includes("python3"),
        `${label} step 5 still invokes python3, or does not name review_score.ts`,
      );
    }

    for (const { label, path } of TESTING_TABLE_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const cell = extractTestingReviewerCell(source);
      assert.equal(cell, "review_score.ts", `${label} reviewer row backtick cell`);
    }
  },
);
