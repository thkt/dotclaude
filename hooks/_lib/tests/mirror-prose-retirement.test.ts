/// <reference types="node" />
// hooks/_lib/mirror_prose.py and hooks/edit/mirror_prose_guard.py retire once the PostToolUse
// hook runs hooks/edit/mirror_prose_guard.ts, the TypeScript replacement the preceding units
// built (hooks/_lib/mirror_prose.ts, hooks/edit/mirror_prose_guard.ts, units U-001..U-003). This
// file guards the retirement itself, the same shape as
// hooks/_lib/tests/recall-index-retirement.test.ts: no tracked file still names either retired
// path, and settings.json's two mirror_prose_guard commands name the .ts replacement -- with
// the exec bit and the bun shebang DR-0114 requires -- rather than the retired .py. The walk and
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
    `files still naming mirror_prose.py or mirror_prose_guard.py (docs/decisions/ and ` +
      `.claude/workspace/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

/** The `command` string of every hook settings.json's PostToolUse array runs, filtered to the
 * ones naming mirror_prose_guard. Read from the parsed settings.json tree, not a copied
 * literal, so editing settings.json's command strings is what turns T-374 green. */
function mirrorProseGuardCommands(settings: unknown): string[] {
  const hooksNode =
    settings !== null && typeof settings === "object"
      ? (settings as Record<string, unknown>).hooks
      : undefined;
  const postToolUse =
    hooksNode !== null && typeof hooksNode === "object"
      ? (hooksNode as Record<string, unknown>).PostToolUse
      : undefined;
  const commands: string[] = [];
  if (!Array.isArray(postToolUse)) return commands;
  for (const group of postToolUse) {
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
      if (typeof command === "string" && command.includes("mirror_prose_guard")) {
        commands.push(command);
      }
    }
  }
  return commands;
}

test("T-374 the two mirror_prose_guard commands settings.json registers end in .ts, carry the exec bit and open with the bun shebang, read from settings.json rather than a copied literal", () => {
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, "settings.json"), "utf8"));
  const commands = mirrorProseGuardCommands(settings);
  assert.equal(
    commands.length,
    2,
    `settings.json must register exactly two mirror_prose_guard commands, found: ${commands.join(", ")}`,
  );

  const trackedModes = new Map(
    trackedEntries("hooks/*.ts").map(([mode, absolutePath]) => [
      relative(REPO_ROOT, absolutePath),
      mode,
    ]),
  );

  for (const command of commands) {
    assert.ok(command.endsWith(".ts"), `command must end in .ts, got: ${command}`);
    const rel = command.startsWith("~/.claude/") ? command.slice("~/.claude/".length) : command;
    assert.equal(trackedModes.get(rel), "100755", `${rel} must carry the exec bit`);
    assert.equal(
      readFileSync(join(REPO_ROOT, rel), "utf8").split(/\r?\n/, 1)[0],
      SHEBANG,
      `${rel} must open with the bun shebang`,
    );
  }
});
