/// <reference types="node" />
// hooks/pre-bash/issue_body_gate.py, hooks/pre-bash/wiki_scene.py and hooks/_lib/gh_filing.py
// are retired in favor of their TypeScript replacements, which were later removed in turn
// (DR-0128, DR-0130). This file guards the retirement itself, the same shape as
// hooks/pre-bash/tests/pre-bash-hooks-retirement.test.ts: no tracked file still names the 3
// retired scripts (T-328). The walk and its historical-directory exclusions are offendersAmong
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

// The 3 retired hooks/pre-bash/*.py and hooks/_lib/*.py scripts, matched by name alone: this
// predicate only asks whether a retired filename still shows up anywhere.
const RETIRED_NAMES = ["issue_body_gate.py", "wiki_scene.py", "gh_filing.py"];

/** A retired name matched as a whole word: the character before it must not be a word / dot /
 * hyphen character, so the same stem with a .ts extension and a longer stem never match, and \b after "py" stops a
 * longer extension from matching. Mirrors pre-bash-hooks-retirement.test.ts's own
 * retiredPattern. */
function retiredPattern(name: string): RegExp {
  const escaped = name.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.-])${escaped}\\b`);
}

function referencesRetiredPython(content: string): boolean {
  return RETIRED_NAMES.some((name) => retiredPattern(name).test(content));
}

test("T-328 no tracked file outside the historical directories names issue_body_gate.py, wiki_scene.py or gh_filing.py as a word, and the same predicate flags a fixture line carrying each", () => {
  for (const name of RETIRED_NAMES) {
    assertDetectsAndMisses((content) => retiredPattern(name).test(content), name);
  }

  // This test's own file names all 3 retired paths in its comments and constants, so it is
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
    `files still naming issue_body_gate.py, wiki_scene.py or gh_filing.py ` +
      `(docs/decisions/ and docs/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});
