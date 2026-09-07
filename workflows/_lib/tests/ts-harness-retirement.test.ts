/// <reference types="node" />
// run-workflow.js, codex-run.js and tests/_brace.js are retired once their TypeScript
// replacements (run-workflow.ts, codex-run.ts, tests/_brace.ts) carry the harness. This file
// guards the retirement itself, the same way workflows/_lib/tests/gate-retirement.test.ts guards
// gate.py's: no tracked file outside docs/decisions/ and .claude/workspace/research/ (kept as
// historical record, per docs/wiki/retire-rename-procedure.md) still names a retired path. The
// walk and the historical-directory exclusions are offendersAmong (workflows/_lib/tests/_retirement.ts),
// shared with gate-retirement.test.ts and record-retirement.test.ts, as are the tracked-file
// list and the positive control; this file keeps only its retired paths and their predicate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

function referencesPath(content: string, retiredPath: string): boolean {
  return content.includes(retiredPath);
}

// This test's own file names each retiredPath to describe what it checks, so it is passed as
// an extra exclusion; the historical directories (docs/decisions/, .claude/workspace/research/)
// are offendersAmong's own default, not repeated here.
function offendersFor(retiredPath: string): string[] {
  return offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    (content) => referencesPath(content, retiredPath),
    [SELF_PATH],
  );
}

test("T-042 no tracked file outside docs/decisions/ and .claude/workspace/research/ references _lib/run-workflow.js", () => {
  const RETIRED_PATH = "_lib/run-workflow.js";
  assertDetectsAndMisses((content) => referencesPath(content, RETIRED_PATH), RETIRED_PATH);

  const offenders = offendersFor(RETIRED_PATH);
  assert.deepEqual(
    offenders,
    [],
    `files still naming ${RETIRED_PATH} (docs/decisions/ and .claude/workspace/research/ are ` +
      `kept as history, not counted): ${offenders.join(", ")}`,
  );
});

test("T-043 no tracked file outside docs/decisions/ and .claude/workspace/research/ references _lib/codex-run.js or _lib/tests/_brace.js", () => {
  for (const retiredPath of ["_lib/codex-run.js", "_lib/tests/_brace.js"]) {
    assertDetectsAndMisses((content) => referencesPath(content, retiredPath), retiredPath);

    const offenders = offendersFor(retiredPath);
    assert.deepEqual(
      offenders,
      [],
      `files still naming ${retiredPath} (docs/decisions/ and .claude/workspace/research/ are ` +
        `kept as history, not counted): ${offenders.join(", ")}`,
    );
  }
});
