/// <reference types="node" />
// revalidate.py, verify-tests.py, diff-files.py and verify-pr.py (workflows/build/*.py, their
// .ja mirrors, and their workflows/build/tests/*_test.py fixtures-replay tests) are retired in
// favor of the .ts rewrites established by the preceding units U-005/U-006/U-007/U-008. This
// file guards the retirement itself, in the same shape as record-retirement.test.ts: no tracked
// file still names one of the four scripts. The .ts rewrites went with the build workflow
// (DR-0128), so only the absence scan remains.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees in one change, then
// confirm zero residual references across git ls-files. A mention under docs/decisions/ or
// docs/research/ is kept as historical record, so both are excluded here rather
// than counted as a leftover reference. docs/wiki/deterministic-script-judgment.md's mention of
// verify-tests.py is the cited basis line for issue #623 (a quote of the pre-retirement
// verifier split the issue reported), not a live pointer either, so it is excluded the same way.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const HISTORICAL_FILE = "docs/wiki/deterministic-script-judgment.md";

// The four retired scripts named as bare filenames (no directory: build.js calls
// bundled("workflows/build/revalidate.py") but the RECORD_SCHEMA-style description strings and
// prompt comments name the bare filename with no directory at all, the same asymmetry
// record-retirement.test.ts's own RETIRED_PATTERN comment describes). One regex
// covers all four, each guarded the same way: a preceding word/dot/hyphen character rules out a
// match inside a longer name, and \b after ".py" rules out a match against a longer extension.
const RETIRED_NAMES = ["revalidate.py", "verify-tests.py", "diff-files.py", "verify-pr.py"];
const RETIRED_PATTERN = new RegExp(
  `(^|[^\\w.-])(?:${RETIRED_NAMES.map((name) => name.replace(/[.-]/g, "\\$&")).join("|")})\\b`,
);

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredScript(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-149 no tracked file outside docs/decisions/, docs/research/ and " +
    "the deterministic-script-judgment basis line references revalidate.py, verify-tests.py, " +
    "diff-files.py or verify-pr.py as a word, and the same predicate flags a fixture line " +
    "carrying one",
  () => {
    for (const name of RETIRED_NAMES) assertDetectsAndMisses(referencesRetiredScript, name);

    // This test's own file names the four scripts in comments to describe what it checks, and
    // the #623 basis line keeps verify-tests.py as history rather than as a live reference; the
    // historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredScript,
      [SELF_PATH, HISTORICAL_FILE],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/, docs/research/ and the " +
        `deterministic-script-judgment basis line references a retired verifier script\n${offenders.join(", ")}`,
    );
  },
);
