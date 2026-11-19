/// <reference types="node" />
// validate-issue-body.py and pick-plan.py (skills/issue/scripts/, .ja mirror) are retired in
// favor of their .ts ports (established by the preceding units U-002/U-003/U-004). This file
// guards the retirement itself: it scans the whole tree for a leftover reference to either
// retired name. The .ts ports and their callers (/issue, /slice, the issue-body-gate hook) were
// removed later (DR-0128), so the caller check went with them.
//
// Historical exclusions: docs/decisions/ and docs/research/ are offendersAmong's own default (a
// DR / a research report stays a record of what was true when it was written, not a live pointer
// retirement obliges to follow).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// Word-boundary needles, same shape as record-retirement.test.ts's RETIRED_PATTERN: a preceding
// char that is a word char, dot, or hyphen blocks the match, so a differently-named script that
// merely ends in one of these names (e.g. a hypothetical "quick-pick-plan.py") is not flagged.
const VALIDATE_ISSUE_BODY_PATTERN = /(^|[^\w.-])validate-issue-body\.py\b/;
const PICK_PLAN_PATTERN = /(^|[^\w.-])pick-plan\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (rules/development/TESTING.md § Whether the test swings at nothing).
function referencesRetiredScript(content: string): boolean {
  return VALIDATE_ISSUE_BODY_PATTERN.test(content) || PICK_PLAN_PATTERN.test(content);
}

test("no tracked file outside docs/decisions/ and docs/research/ references validate-issue-body.py or pick-plan.py as a word, and the same predicate flags a fixture line carrying each", () => {
  assertDetectsAndMisses(referencesRetiredScript, "validate-issue-body.py");
  assertDetectsAndMisses(referencesRetiredScript, "pick-plan.py");

  // This test's own file names both retired scripts in comments to describe what it checks; the
  // historical directories are offendersAmong's own default.
  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredScript,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    "no tracked file outside docs/decisions/ and docs/research/ references " +
      `validate-issue-body.py or pick-plan.py\n${offenders.join(", ")}`,
  );
});
