/// <reference types="node" />
// scribe_gate.py (hooks/_lib/scribe_gate.py) and its test scribe_gate_test.py
// (hooks/_lib/tests/scribe_gate_test.py) retire once .github/workflows/scribe.yml's `gate` step
// runs hooks/_lib/scribe_gate.ts, the TypeScript replacement the preceding units built
// (hooks/_lib/scribe_gate.ts, hooks/_lib/tests/scribe-gate.test.ts, per
// docs/decisions/0116-place-the-scribe-gate-outside-the-hooks-shebang-rule.md). This file guards
// the retirement itself, the same shape as hooks/_lib/tests/recall-index-retirement.test.ts and
// workflows/_lib/tests/gate-retirement.test.ts: no tracked file still names scribe_gate.py. The
// walk and its historical-directory exclusions are offendersAmong
// (workflows/_lib/tests/_retirement.ts), reused here rather than re-derived.
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
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// Catches scribe_gate.py as a whole word: the character before "scribe_gate" must not be a
// word / dot / hyphen character, so "scribe_gate.ts" and "scribe-gate.test.ts" never match, and
// \b after "py" stops a longer extension from matching.
const RETIRED_PYTHON = /(^|[^\w.-])scribe_gate\.py\b/;

function referencesRetiredPython(content: string): boolean {
  return RETIRED_PYTHON.test(content);
}

test("T-451 no tracked file outside the historical directories names scribe_gate.py as a word, and the same predicate flags a fixture line carrying it", () => {
  assertDetectsAndMisses(referencesRetiredPython, "scribe_gate.py");

  // This test's own file names scribe_gate.py to describe what it checks, so it is passed as an
  // extra exclusion; the historical directories (docs/decisions/, .claude/workspace/research/)
  // are offendersAmong's own default, not repeated here.
  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPython,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming scribe_gate.py (docs/decisions/ and .claude/workspace/research/ are ` +
      `kept as history, not counted)\n${offenders.join(", ")}`,
  );
});
