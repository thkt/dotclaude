/// <reference types="node" />
// hooks/pre-bash/issue_body_gate.py, hooks/pre-bash/wiki_scene.py and hooks/_lib/gh_filing.py
// are retired in favor of their TypeScript replacements (hooks/pre-bash/issue_body_gate.ts,
// hooks/pre-bash/wiki_scene.ts). This file guards the retirement itself, the same shape as
// hooks/pre-bash/tests/pre-bash-hooks-retirement.test.ts: no tracked file still names the 3
// retired scripts (T-328), and wiki_scene.ts still returns this repository's real issue-close
// pages (T-327, carrying forward wiki_scene_seam_test.py's T-013 real-finder pin). settings.json
// registers no hook (DR-0123), so the hook is named by its tracked path. The walk and its
// historical-directory exclusions are
// offendersAmong (workflows/_lib/tests/_retirement.ts), reused here rather than re-derived; the
// hook spawn reuses hooks/_lib/tests/_hook-harness.ts's run() rather than a second copy of that
// child-process plumbing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";
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
 * hyphen character, so "wiki_scene.ts" and a longer stem never match, and \b after "py" stops a
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

// The docs/wiki/ pages this repository currently tags `scenes: ["issue-close"]`
// (skills/scribe/tests/skill_contract_test.py fixes this set; a page added or dropped there has
// to move here too). Listed exactly, not as a lower bound, the same way
// wiki_scene_seam_test.py's ISSUE_CLOSE_PAGES did before this test replaced it.
const ISSUE_CLOSE_PAGES = [
  "incident-driven-deferral.md",
  "integration-base-pr-closes-no-autoclose.md",
  "premise-collapse-not-planned.md",
  "runtime-bug-wontfix.md",
  "umbrella-issue-recut.md",
  "untracked-output-manual-close.md",
];

interface Notification {
  hookSpecificOutput?: { additionalContext?: string };
}

function contextOf(stdout: string): string {
  if (!stdout.trim()) {
    return "";
  }
  return (JSON.parse(stdout) as Notification).hookSpecificOutput?.additionalContext ?? "";
}

test("T-327 feeding the hook entry a gh issue close payload for this repository returns the issue-close page names, driven through the real finder", () => {
  const hookPath = join(REPO_ROOT, "hooks", "pre-bash", "wiki_scene.ts");

  // Real repository, real find_wiki_rule.ts, nothing stubbed: pins the pages this repository's
  // own docs/wiki/ tags scenes: ["issue-close"].
  const stdout = run(hookPath, {
    tool_name: "Bash",
    tool_input: { command: `cd ${REPO_ROOT} && gh issue close 42` },
  });
  const context = contextOf(stdout);
  const listed = context
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .sort();
  assert.deepEqual(
    listed,
    [...ISSUE_CLOSE_PAGES].sort(),
    `expected exactly the issue-close pages, got: ${context}`,
  );
});
