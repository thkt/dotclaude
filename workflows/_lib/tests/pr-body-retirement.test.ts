/// <reference types="node" />
// pr-body.py (workflows/build/pr-body.py, .ja/workflows/build/pr-body.py) is retired in favor of
// pr-body.ts (established by the preceding units U-002/U-003). This file guards the retirement
// itself: no tracked file still names pr-body.py. pr-body.ts and the build workflow that ran it
// were removed later (DR-0128), so only the absence scan remains.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and the wiki in one
// change, then confirm zero residual references across git ls-files. A mention under
// docs/decisions/ or docs/research/ is kept as historical record (a DR / a research
// report is written once and stays a record of what was true when it was written, not a live
// pointer that retirement obliges to follow), so both are excluded here rather than counted as a
// leftover reference. docs/wiki/pr-tail-translate-prose-only.md's mention of pr-body.py is the
// cited basis line for issue #176 (a quote of the pre-retirement design, not a live pointer
// either), so it is excluded the same way.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const HISTORICAL_FILE = "docs/wiki/pr-tail-translate-prose-only.md";

// Same shape as record-retirement.test.ts's needle: build.js calls
// bundled("workflows/build/pr-body.py") with no directory qualifier in the prompt text, so the
// needle here is the filename with a word boundary, and a preceding `/` counts as a reference.
const RETIRED_PATTERN = /(^|[^\w.-])pr-body\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-129 no tracked file outside docs/decisions/, docs/research/and " +
    "docs/wiki/pr-tail-translate-prose-only.md references pr-body.py as a word, and the same " +
    "predicate flags a fixture line carrying it",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "pr-body.py");

    // This test's own file names pr-body.py in comments to describe what it checks, and the
    // #176 basis line keeps the retired name as history rather than as a live reference; the
    // historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredPath,
      [SELF_PATH, HISTORICAL_FILE],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/, docs/research/ and " +
        `docs/wiki/pr-tail-translate-prose-only.md references pr-body.py\n${offenders.join(", ")}`,
    );
  },
);
