/// <reference types="node" />
// hooks/pre-bash/body_proofread.py, client_identifier_gate.py and package_manager_rewrite.py
// retire once settings.json's PreToolUse Bash hooks run their TypeScript replacements, the .ts
// files the preceding units built (hooks/pre-bash/body_proofread.ts, client_identifier_gate.ts,
// package_manager_rewrite.ts). This file guards the retirement itself, the same shape as
// hooks/_lib/tests/security-hooks-retirement.test.ts: no tracked file still names the 3 retired
// scripts, and settings.json's PreToolUse Bash commands name the .ts replacements. The walk and
// its historical-directory exclusions are offendersAmong (workflows/_lib/tests/_retirement.ts),
// reused here rather than re-derived; the exec-bit / shebang read reuses hooks/_lib/shebang_scope.ts
// rather than a second copy of that check.
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

const EXEC_MODE = "100755";

// The 3 retired hooks/pre-bash/*.py scripts, matched by name alone: settings.json's own
// PreToolUse Bash matcher check (below) is what verifies the replacement is wired in, this
// predicate only asks whether the retired filename still shows up anywhere.
const RETIRED_NAMES = [
  "body_proofread.py",
  "client_identifier_gate.py",
  "package_manager_rewrite.py",
];

/** A retired name matched as a whole word: the character before it must not be a word / dot /
 * hyphen character, so "body_proofread.ts" and a longer stem never match, and \b after "py"
 * stops a longer extension from matching. Mirrors security-hooks-retirement.test.ts's own
 * retiredPattern. */
function retiredPattern(name: string): RegExp {
  const escaped = name.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.-])${escaped}\\b`);
}

function referencesRetiredPython(content: string): boolean {
  return RETIRED_NAMES.some((name) => retiredPattern(name).test(content));
}

test("T-310 no tracked file outside the historical directories names body_proofread.py, client_identifier_gate.py or package_manager_rewrite.py as a word, and the same predicate flags a fixture line carrying each", () => {
  for (const name of RETIRED_NAMES) {
    assertDetectsAndMisses((content) => retiredPattern(name).test(content), name);
  }

  // This test's own file names all 3 retired paths in its comments and constants, so it is
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
    `files still naming body_proofread.py, client_identifier_gate.py or package_manager_rewrite.py ` +
      `(docs/decisions/ and .claude/workspace/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

/** The `command` string of every hook settings.json's PreToolUse array registers under the
 * "Bash" matcher. */
function preToolUseBashCommands(settings: unknown): string[] {
  const hooksNode =
    settings !== null && typeof settings === "object"
      ? (settings as Record<string, unknown>).hooks
      : undefined;
  const preToolUse =
    hooksNode !== null && typeof hooksNode === "object"
      ? (hooksNode as Record<string, unknown>).PreToolUse
      : undefined;
  const commands: string[] = [];
  if (!Array.isArray(preToolUse)) return commands;
  for (const group of preToolUse) {
    if (group === null || typeof group !== "object") continue;
    const groupRecord = group as Record<string, unknown>;
    if (groupRecord.matcher !== "Bash") continue;
    const groupHooks = groupRecord.hooks;
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

/** The whitespace-delimited token inside `command` that names `stem`, or undefined when no
 * PreToolUse Bash command registers that stem at all. */
function commandNaming(commands: string[], stem: string): string | undefined {
  const pattern = new RegExp(`(^|[/\\s])${stem}\\.\\w+($|\\s)`);
  return commands.find((command) => pattern.test(command));
}

test("T-311 the three PreToolUse Bash commands this slice moves end in .ts, carry the exec bit and open with the bun shebang, read from settings.json rather than a copied literal", () => {
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, "settings.json"), "utf8"));
  const commands = preToolUseBashCommands(settings);

  for (const stem of ["body_proofread", "client_identifier_gate", "package_manager_rewrite"]) {
    const command = commandNaming(commands, stem);
    assert.ok(
      command,
      `settings.json's PreToolUse Bash hooks carry no command naming ${stem}: ${commands.join(", ")}`,
    );

    const token = (command as string).split(/\s+/).find((piece) => piece.includes(stem));
    assert.ok(token, `no whitespace-delimited token in the ${stem} command names it: ${command}`);
    assert.ok(
      (token as string).endsWith(".ts"),
      `settings.json's ${stem} command does not end in .ts: ${token}`,
    );

    const relPath = (token as string).startsWith("~/.claude/")
      ? (token as string).slice("~/.claude/".length)
      : (token as string);
    const [entry] = trackedEntries(relPath);
    assert.ok(entry, `${relPath} is not a tracked file`);
    const [mode] = entry as [string, string];
    assert.equal(mode, EXEC_MODE, `${relPath} is not tracked with the exec bit`);

    const text = readFileSync(join(REPO_ROOT, relPath), "utf8");
    assert.equal(
      text.split(/\r?\n/, 1)[0],
      SHEBANG,
      `${relPath}'s first line is not the bun shebang`,
    );
  }
});
