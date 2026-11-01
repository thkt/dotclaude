/// <reference types="node" />
// hooks/_lib/hook_payload.py, hooks/_lib/japanese.py, hooks/_lib/textlint.py,
// hooks/_lib/tests/japanese_test.py and hooks/_lib/tests/shebang_test.py were the last Python
// files under hooks/. They retire with DR-0121, which also drops Python as a hook implementation
// language, so this file guards two things no earlier retirement test covers: that no tracked
// file names one of the five again, and that hooks/ carries no tracked .py at all.
//
// The second check is what the name scan cannot do on its own. A module whose own text never
// spells its filename leaves a name scan with nothing to report, which is the hole
// hooks/edit/tests/edit-tooling-retirement.test.ts documents for its own paths. Here the
// language itself retired, so the stronger invariant is available: the extension, not a list of
// names, is what may not come back.
//
// The walk and its historical-directory exclusions are offendersAmong
// (workflows/_lib/tests/_retirement.ts), reused rather than re-derived, the same shape as
// hooks/integrations/tests/hooks-python-retirement.test.ts.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

// The 5 retired files, matched by name alone. settings.json never named any of them, so unlike
// the earlier retirement tests there is no wiring check to pair with this predicate.
const RETIRED_NAMES = [
  "hook_payload.py",
  "japanese.py",
  "textlint.py",
  "japanese_test.py",
  "shebang_test.py",
];

/** A retired name matched as a whole word: the character before it must not be a word / dot /
 * hyphen character, so "japanese.ts" and a longer stem never match, and \b after "py" stops a
 * longer extension from matching. Mirrors hooks-python-retirement.test.ts's retiredPattern. */
function retiredPattern(name: string): RegExp {
  const escaped = name.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.-])${escaped}\\b`);
}

function referencesRetiredPython(content: string): boolean {
  return RETIRED_NAMES.some((name) => retiredPattern(name).test(content));
}

test("T-543 no tracked file outside the historical directories names the five retired .py as a word, and the same predicate flags a fixture line carrying each", () => {
  for (const name of RETIRED_NAMES) {
    assertDetectsAndMisses((content) => retiredPattern(name).test(content), name);
  }

  // This file names all 5 in its header and in RETIRED_NAMES, so it is passed as an extra
  // exclusion; docs/decisions/ and docs/research/ are offendersAmong's own default, kept as
  // history per docs/wiki/retire-rename-procedure.md and not repeated here.
  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPython,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming a retired .py (${RETIRED_NAMES.join(", ")}) ` +
      `(docs/decisions/ and docs/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

/** Every tracked path under hooks/ ending in .py, read from git rather than the filesystem so an
 * untracked scratch file or a stale __pycache__ entry cannot fail this. */
function trackedPythonUnderHooks(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "hooks/**/*.py", "hooks/*.py"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

test("T-544 hooks/ carries no tracked .py file, and the same query reports one that exists elsewhere in the tree", () => {
  assert.deepEqual(trackedPythonUnderHooks(), []);

  // Positive control: the same git query against a directory that does carry tracked .py must
  // return something. Without it an emptied pathspec, a renamed hooks/ or a git invocation that
  // silently stopped matching would read as "no Python left" (
  // docs/wiki/absence-test-positive-control-fixture.md).
  const elsewhere = execFileSync("git", ["ls-files", "-z", "--", "*.py"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  assert.ok(
    elsewhere.length > 0,
    "the control found no tracked .py anywhere, so this query cannot tell an empty hooks/ " +
      "from a query that stopped working",
  );
  assert.deepEqual(
    elsewhere.filter((path) => path.startsWith("hooks/")),
    [],
    "the tree-wide query disagrees with the hooks/ pathspec about whether hooks/ holds Python",
  );
});

test("T-545 ruff.toml and pyrightconfig.json name no path under hooks/", () => {
  for (const configPath of ["ruff.toml", "pyrightconfig.json"]) {
    const content = readFileSync(join(REPO_ROOT, configPath), "utf8");
    assert.ok(
      !/["']hooks\//.test(content),
      `${configPath} still names a path under hooks/, which carries no Python to configure`,
    );
  }
});
