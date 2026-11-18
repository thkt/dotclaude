/// <reference types="node" />
// gate.py is retired in favor of gate.ts (workflows/_lib/gate.ts, .ja/workflows/_lib/gate.ts,
// established by the preceding units). This file guards the retirement itself: no tracked file
// still names the retired path.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and docs in one
// change, then confirm zero residual references across git ls-files. The walk itself is
// assertNoResidualReferences (workflows/_lib/tests/_retirement.ts), shared with
// record-retirement.test.ts and ts-harness-retirement.test.ts, so the historical-directory
// exclusions it applies (docs/decisions/ and docs/research/, kept as historical
// record by that same procedure) live in one place rather than a copy per test file.
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, assertNoResidualReferences } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_PATH = "_lib/gate.py";

// The one predicate the absence scan below relies on, factored out so the positive
// control can drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return content.includes(RETIRED_PATH);
}

test("T-014 no tracked file references _lib/gate.py", () => {
  // The fixture is a hand-typed literal, not a reference to RETIRED_PATH: a typo in the
  // constant must not flow into the fixture the positive control is checked against
  // (docs/wiki/absence-test-positive-control-fixture.md item 4).
  assertDetectsAndMisses(referencesRetiredPath, "_lib/gate.py");

  // This test's own file names RETIRED_PATH to describe what it checks, so it is passed as an
  // extra exclusion; the historical directories (docs/decisions/, docs/research/)
  // are assertNoResidualReferences's own default, not repeated here.
  assertNoResidualReferences(
    REPO_ROOT,
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPath,
    RETIRED_PATH,
    [SELF_PATH],
  );
});
