/// <reference types="node" />
// The six Python edit-tooling files retire once settings.json's 8 PostToolUse/PreToolUse
// entries run the .ts replacements the preceding units built (hooks/_lib/rust_target.ts,
// hooks/_lib/textlint.ts, hooks/edit/rust_pre_edit.ts, hooks/edit/rust_post_edit.ts,
// hooks/edit/textlint_fix.ts, hooks/edit/rumdl_check.ts): hooks/_lib/rust_target.py,
// hooks/_lib/textlint.py, hooks/edit/rumdl_check.py, hooks/edit/rust_post_edit.py,
// hooks/edit/rust_pre_edit.py, hooks/edit/textlint_fix.py. hooks/_lib/japanese.py is not part
// of this retirement -- its .ts sibling exists but this unit does not retire it.
//
// Same shape as hooks/_lib/tests/recall-index-retirement.test.ts, generalized from one retired
// name to six: no tracked file outside the historical directories (docs/decisions/,
// .claude/workspace/research/) names any of the six as a word, and offendersAmong
// (workflows/_lib/tests/_retirement.ts) is reused for the walk rather than re-derived.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_NAMES = [
  "rust_target.py",
  "textlint.py",
  "rumdl_check.py",
  "rust_post_edit.py",
  "rust_pre_edit.py",
  "textlint_fix.py",
];

// The character before the name must not be a word / dot / hyphen character, so
// "hooks/_lib/rust_target.py" still matches (the preceding "/" is not a word char) while
// "rust_target.ts" and a longer name sharing this one's tail never do.
function wordPattern(name: string): RegExp {
  const escaped = name.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.-])${escaped}\\b`);
}

const RETIRED_PATTERNS = RETIRED_NAMES.map((name) => wordPattern(name));

function referencesRetiredPython(content: string): boolean {
  return RETIRED_PATTERNS.some((pattern) => pattern.test(content));
}

test("T-385 no tracked file outside the historical directories names the six retired .py as a word, and the same predicate flags a fixture line carrying each", () => {
  for (const name of RETIRED_NAMES) {
    assertDetectsAndMisses(referencesRetiredPython, name);
  }

  // This test's own file names all six retired paths to describe what it checks, so it is
  // passed as an extra exclusion; the historical directories (docs/decisions/,
  // .claude/workspace/research/) are offendersAmong's own default, not repeated here.
  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPython,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming a retired edit-tooling .py (docs/decisions/ and ` +
      `.claude/workspace/research/ are kept as history, not counted): ${offenders.join(", ")}`,
  );
});
