/// <reference types="node" />
// Seam guard for U-001..U-003: every .test.ts file that needs a real temporary git repository
// must create it through withTempRepo (workflows/_lib/tests/_git-repo.ts) rather than calling
// `git init` on its own, so the gc.auto / maintenance.auto guard and the finally-closed lifetime
// that helper provides (git-repo.test.ts) actually reach every caller instead of staying an
// unused capability. This file does not re-test withTempRepo itself (git-repo.test.ts already
// does); it scans the tree for callers that bypassed it.
//
// The walk reuses offendersAmong / trackedFiles from ./_retirement.ts, the same shared core
// gate-retirement.test.ts and ts-harness-retirement.test.ts scan with, so the historical-
// directory exclusions (docs/decisions/, .claude/workspace/research/) live in one place.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

/** True when `path` is a `.test.ts` file whose content calls `git init` without also naming
 * `withTempRepo` -- the substring check the positive control below drives directly, the same
 * shape as referencesRetiredPath in gate-retirement.test.ts / ts-harness-retirement.test.ts. */
function callsGitInitDirectly(content: string, path: string): boolean {
  if (!path.endsWith(".test.ts")) return false;
  if (!content.includes("git init")) return false;
  return !content.includes("withTempRepo");
}

// Positive control (docs/wiki/absence-test-positive-control-fixture.md), built as a literal
// fixture source the same way assertDetectsAndMisses builds its own -- hand-written here, not
// assembled from this file's own constants, so a typo in callsGitInitDirectly's needles cannot
// silently pass. The fixture calls git through a shell string (`execSync("git init -q")`)
// rather than the array-argument spawnSync form the migrated helper callers use, so the fixture
// carries the literal substring "git init" the predicate greps for. CLEAN is OFFENDING with
// only the helper import inserted, so the pair isolates exactly the "names withTempRepo" branch
// rather than also changing whether "git init" is present.
const FIXTURE_PATH = "workflows/example/tests/example.test.ts";
const OFFENDING_FIXTURE_SOURCE =
  'import test from "node:test";\n' +
  'import { execSync } from "node:child_process";\n' +
  "\n" +
  'test("creates a repo", () => {\n' +
  '  execSync("git init -q");\n' +
  "});\n";
const CLEAN_FIXTURE_SOURCE = OFFENDING_FIXTURE_SOURCE.replace(
  'import test from "node:test";\n',
  'import test from "node:test";\n' + 'import { withTempRepo } from "./_git-repo.ts";\n',
);

test(
  "T-422 no tracked .test.ts runs git init without importing the helper, and the same " +
    "predicate flags a fixture source that does",
  () => {
    assert.equal(
      callsGitInitDirectly(OFFENDING_FIXTURE_SOURCE, FIXTURE_PATH),
      true,
      "positive control: a fixture .test.ts calling git init without the helper import is detected",
    );
    assert.equal(
      callsGitInitDirectly(CLEAN_FIXTURE_SOURCE, FIXTURE_PATH),
      false,
      "positive control: the same predicate misses a fixture that also names withTempRepo",
    );

    // This test's own file names both needles to describe what it checks, so it is passed as
    // an extra exclusion; the historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      callsGitInitDirectly,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      `tracked .test.ts files still calling git init directly instead of withTempRepo: ${offenders.join(", ")}`,
    );
  },
);
