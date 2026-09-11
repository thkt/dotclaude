/// <reference types="node" />
// python3 invocations in code (not in docs or comments) are retired in favor of node-based
// TypeScript migrations, established by the preceding units. This file guards the retirement
// itself: no tracked file still invokes python3 except for the permanent exceptions defined below.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and docs in one
// change, then confirm zero residual references across git ls-files. The walk itself is
// offendersAmong (workflows/_lib/tests/_retirement.ts), shared with gate-retirement.test.ts
// and record-retirement.test.ts, so the historical-directory exclusions it applies
// (docs/decisions/ and .claude/workspace/research/, kept as historical record by that same
// procedure) live in one place rather than a copy per test file.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// The one predicate the absence scan below relies on, factored out so the positive
// control can drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function invokesPython3(content: string): boolean {
  return content.includes("python3");
}

test("T-406 no tracked file invokes python3 except permanent exceptions", () => {
  assertDetectsAndMisses(invokesPython3, "python3");

  // This test's own file names python3 to describe what it checks, so it is passed as an
  // extra exclusion; plugins/ (vendored Python excluded from the TypeScript migration) is
  // excluded via prefix filtering before the scan; hooks/herdr-agent-state.sh (DR-0117's
  // permanent exception: herdr's installer overwrites it on each install/update) is excluded
  // as an exact match; the historical directories (docs/decisions/, .claude/workspace/research/)
  // are offendersAmong's own default, not repeated here.
  const extraExclusions = [
    SELF_PATH,
    "hooks/herdr-agent-state.sh",
  ];

  const candidates = trackedFiles(REPO_ROOT).filter(
    (path) => !path.startsWith("plugins/"),
  );

  const offenders = offendersAmong(
    candidates,
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    invokesPython3,
    extraExclusions,
  );
  assert.deepEqual(
    offenders,
    [],
    `files still invoking python3 (docs/decisions/, .claude/workspace/research/, plugins/, ` +
      `hooks/herdr-agent-state.sh and this test file are excluded): ${offenders.join(", ")}`,
  );
});
