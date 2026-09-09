/// <reference types="node" />
// recall_index.py (hooks/lifecycle/recall_index.py) and its test recall_index_test.py
// (hooks/lifecycle/tests/recall_index_test.py) retire once SessionStart runs
// hooks/lifecycle/recall_index.ts, the TypeScript replacement the preceding units built
// (hooks/lifecycle/recall_index.ts, hooks/lifecycle/tests/recall-index.test.ts). This file
// guards the retirement itself, the same shape as workflows/_lib/tests/gate-retirement.test.ts:
// no tracked file still names the retired path, and settings.json's SessionStart command
// names the .ts replacement rather than the retired .py. The walk and its historical-directory
// exclusions are offendersAmong (workflows/_lib/tests/_retirement.ts), reused here rather than
// re-derived.
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

// Catches recall_index.py and recall_index_test.py as a whole word: the character before
// "recall_index" must not be a word / dot / hyphen character, so "recall_index.ts" and
// "recall-index.test.ts" never match, and \b after "py" stops a longer extension from matching.
const RETIRED_PYTHON = /(^|[^\w.-])recall_index(_test)?\.py\b/;

function referencesRetiredPython(content: string): boolean {
  return RETIRED_PYTHON.test(content);
}

test("T-247 no tracked file outside docs/decisions/ and .claude/workspace/research/ references recall_index.py or recall_index_test.py as a word, and the same predicate flags a fixture line carrying it", () => {
  assertDetectsAndMisses(referencesRetiredPython, "recall_index.py");
  assertDetectsAndMisses(referencesRetiredPython, "recall_index_test.py");

  // This test's own file names both retired paths to describe what it checks, so it is
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
    `files still naming recall_index.py or recall_index_test.py (docs/decisions/ and ` +
      `.claude/workspace/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

/** The `command` string of every hook settings.json's SessionStart array runs. */
function sessionStartCommands(settings: unknown): string[] {
  const hooksNode =
    settings !== null && typeof settings === "object"
      ? (settings as Record<string, unknown>).hooks
      : undefined;
  const sessionStart =
    hooksNode !== null && typeof hooksNode === "object"
      ? (hooksNode as Record<string, unknown>).SessionStart
      : undefined;
  const commands: string[] = [];
  if (!Array.isArray(sessionStart)) return commands;
  for (const group of sessionStart) {
    const groupHooks =
      group !== null && typeof group === "object"
        ? (group as Record<string, unknown>).hooks
        : undefined;
    if (!Array.isArray(groupHooks)) continue;
    for (const hook of groupHooks) {
      const command =
        hook !== null && typeof hook === "object"
          ? (hook as Record<string, unknown>).command
          : undefined;
      if (typeof command === "string") commands.push(command);
    }
  }
  return commands;
}

test("T-248 settings.json's SessionStart command names hooks/lifecycle/recall_index.ts and no command in settings.json names recall_index.py", () => {
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, "settings.json"), "utf8"));
  const sessionStartCommandList = sessionStartCommands(settings);
  assert.ok(
    sessionStartCommandList.some((command) => command.includes("hooks/lifecycle/recall_index.ts")),
    `no SessionStart command names hooks/lifecycle/recall_index.ts: ${sessionStartCommandList.join(", ")}`,
  );

  assert.equal(
    sessionStartCommandList.some((command) => RETIRED_PYTHON.test(command)),
    false,
    "settings.json SessionStart still names recall_index.py",
  );
});
