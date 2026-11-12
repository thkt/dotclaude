/// <reference types="node" />
// hooks/_lib/mirror_prose.py and hooks/edit/mirror_prose_guard.py are retired in favor of the
// TypeScript replacement (hooks/_lib/mirror_prose.ts, hooks/edit/mirror_prose_guard.ts, units
// U-001..U-003). This file guards the retirement itself, the same shape as
// hooks/_lib/tests/recall-index-retirement.test.ts: no tracked file still names either retired
// path, and mirror_prose_guard.ts carries the exec bit and the bun shebang DR-0114 requires.
// settings.json registers no hook (DR-0123), so the script is named by its tracked path. The walk and
// its historical-directory exclusions are offendersAmong (workflows/_lib/tests/_retirement.ts),
// reused here rather than re-derived; the exec-bit / shebang check reuses
// hooks/_lib/shebang_scope.ts's trackedEntries and SHEBANG for the same reason.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SHEBANG, trackedEntries } from "../../_lib/shebang_scope.ts";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// Catches mirror_prose.py and mirror_prose_guard.py as a whole word: the character before the
// name must not be a word / dot / hyphen character, so "mirror_prose.ts" and
// "mirror-prose.test.ts" never match, and \b after "py" stops a longer extension from matching.
const RETIRED_PYTHON = /(^|[^\w.-])mirror_prose(_guard)?\.py\b/;

function referencesRetiredPython(content: string): boolean {
  return RETIRED_PYTHON.test(content);
}

test("T-375 no tracked file outside the historical directories names mirror_prose.py or mirror_prose_guard.py as a word, and the same predicate flags a fixture line carrying each", () => {
  assertDetectsAndMisses(referencesRetiredPython, "mirror_prose.py");
  assertDetectsAndMisses(referencesRetiredPython, "mirror_prose_guard.py");

  // This test's own file names both retired paths to describe what it checks, so it is
  // passed as an extra exclusion; the historical directories (docs/decisions/,
  // docs/research/) are offendersAmong's own default, not repeated here.
  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPython,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming mirror_prose.py or mirror_prose_guard.py (docs/decisions/ and ` +
      `docs/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

test("T-374 mirror_prose_guard.ts is a tracked file that carries the exec bit and opens with the bun shebang", () => {
  const rel = "hooks/edit/mirror_prose_guard.ts";
  const trackedModes = new Map(
    trackedEntries("hooks/*.ts").map(([mode, absolutePath]) => [
      relative(REPO_ROOT, absolutePath),
      mode,
    ]),
  );

  assert.equal(trackedModes.get(rel), "100755", `${rel} must carry the exec bit`);
  assert.equal(
    readFileSync(join(REPO_ROOT, rel), "utf8").split(/\r?\n/, 1)[0],
    SHEBANG,
    `${rel} must open with the bun shebang`,
  );
});
