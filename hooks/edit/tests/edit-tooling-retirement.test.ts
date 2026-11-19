/// <reference types="node" />
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
  "rumdl_check.py",
  "rust_post_edit.py",
  "rust_pre_edit.py",
  "textlint_fix.py",
];

const RETIRED_PATHS = [
  "hooks/_lib/rust_target.py",
  "hooks/edit/rumdl_check.py",
  "hooks/edit/rust_post_edit.py",
  "hooks/edit/rust_pre_edit.py",
  "hooks/edit/textlint_fix.py",
  "hooks/edit/tests/rumdl_check_test.py",
  "hooks/edit/tests/rust_edit_test.py",
  "hooks/edit/tests/textlint_fix_test.py",
];

function wordPattern(name: string): RegExp {
  const escaped = name.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.-])${escaped}\\b`);
}

const RETIRED_PATTERNS = RETIRED_NAMES.map((name) => wordPattern(name));

function referencesRetiredPython(content: string): boolean {
  return RETIRED_PATTERNS.some((pattern) => pattern.test(content));
}

test("T-385 no tracked file outside the historical directories names the five retired .py as a word, and the same predicate flags a fixture line carrying each", () => {
  const tracked = new Set(trackedFiles(REPO_ROOT));
  const stillTracked = RETIRED_PATHS.filter((path) => tracked.has(path));
  assert.deepEqual(stillTracked, [], `retired paths still tracked: ${stillTracked.join(", ")}`);

  for (const name of RETIRED_NAMES) {
    assertDetectsAndMisses(referencesRetiredPython, name);
  }

  const offenders = offendersAmong(
    [...tracked],
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPython,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming a retired edit-tooling .py (docs/decisions/ and ` +
      `docs/research/ are kept as history, not counted): ${offenders.join(", ")}`,
  );
});
