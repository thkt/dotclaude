/// <reference types="node" />
// gate.py is retired in favor of gate.ts (workflows/_lib/gate.ts, .ja/workflows/_lib/gate.ts,
// established by the preceding units). This file guards the retirement itself: no tracked file
// still names the retired path, and the EN / .ja copies of code.js agree on the replacement.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and docs in one
// change, then confirm zero residual references across git ls-files. The walk itself is
// offendersAmong (workflows/_lib/tests/_retirement.ts), shared with record-retirement.test.ts
// and ts-harness-retirement.test.ts, so the historical-directory exclusions it applies
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

const RETIRED_PATH = "_lib/gate.py";

// The one predicate the absence scan below relies on, factored out so the positive
// control can drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return content.includes(RETIRED_PATH);
}

test("T-014 no tracked file references _lib/gate.py", () => {
  assertDetectsAndMisses(referencesRetiredPath, RETIRED_PATH);

  // This test's own file names RETIRED_PATH to describe what it checks, so it is passed as an
  // extra exclusion; the historical directories (docs/decisions/, .claude/workspace/research/)
  // are offendersAmong's own default, not repeated here.
  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPath,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming ${RETIRED_PATH} (docs/decisions/ and .claude/workspace/research/ are ` +
      `kept as history, not counted): ${offenders.join(", ")}`,
  );
});

// Same extraction shape as workflows/audit/tests/audit.routing.test.js's parseNumericConst:
// read both sources and compare what they actually hold, never a copied-in literal
// (docs/wiki/workflow-const-source-text-check.md).
function extractGateScript(source: string): string | null {
  const m = source.match(/const gateScript = bundled\("([^"]+)"\)/);
  return m ? m[1] : null;
}

test("T-016 the EN and .ja code.js carry the same gateScript constant", () => {
  const enSource = readFileSync(join(REPO_ROOT, "workflows", "code.js"), "utf8");
  const jaSource = readFileSync(join(REPO_ROOT, ".ja", "workflows", "code.js"), "utf8");
  const enGateScript = extractGateScript(enSource);
  const jaGateScript = extractGateScript(jaSource);
  assert.ok(enGateScript, "gateScript is extractable from workflows/code.js");
  assert.ok(jaGateScript, "gateScript is extractable from .ja/workflows/code.js");
  assert.equal(jaGateScript, enGateScript, "EN and .ja gateScript point at different files");
  assert.equal(
    enGateScript,
    "workflows/_lib/gate.ts",
    "gateScript still points at the retired gate.py",
  );
});
