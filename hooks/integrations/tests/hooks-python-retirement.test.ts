/// <reference types="node" />
// hooks/_lib/scribe_trigger.py, hooks/_lib/command_scan.py, hooks/_lib/hook_harness.py,
// hooks/post-bash/scribe_prompt.py and hooks/integrations/amphetamine_agent_session.py are
// retired in favor of their TypeScript replacements: scribe_trigger.ts / scribe_prompt.ts
// (units U-001/U-002) and amphetamine_agent_session.ts (units U-003/U-004). This file guards the
// retirement itself, the same shape as hooks/_lib/tests/recall-index-retirement.test.ts and
// hooks/_lib/tests/security-hooks-retirement.test.ts: no tracked file still names the 5 retired
// scripts. settings.json registers no hook (DR-0123), so no event wiring is checked here. The
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

// The 5 retired hooks/**/*.py scripts, matched by name alone: this predicate only asks whether
// the retired filename still shows up anywhere.
const RETIRED_NAMES = [
  "scribe_trigger.py",
  "command_scan.py",
  "hook_harness.py",
  "scribe_prompt.py",
  "amphetamine_agent_session.py",
];

/** A retired name matched as a whole word: the character before it must not be a word / dot /
 * hyphen character, so "scribe_trigger.ts" and a longer stem never match, and \b after "py"
 * stops a longer extension from matching. Mirrors security-hooks-retirement.test.ts's
 * retiredPattern. */
function retiredPattern(name: string): RegExp {
  const escaped = name.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.-])${escaped}\\b`);
}

function referencesRetiredPython(content: string): boolean {
  return RETIRED_NAMES.some((name) => retiredPattern(name).test(content));
}

test("T-401 no tracked file outside the historical directories names the five retired .py as a word, and the same predicate flags a fixture line carrying each", () => {
  for (const name of RETIRED_NAMES) {
    assertDetectsAndMisses((content) => retiredPattern(name).test(content), name);
  }

  // This test's own file names all 5 retired paths in its header and RETIRED_NAMES, so it is
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
    `files still naming a retired .py (${RETIRED_NAMES.join(", ")}) ` +
      `(docs/decisions/ and docs/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});
