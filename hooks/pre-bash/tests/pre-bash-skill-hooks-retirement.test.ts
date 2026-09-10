/// <reference types="node" />
// hooks/pre-bash/issue_body_gate.py, hooks/pre-bash/wiki_scene.py and hooks/_lib/gh_filing.py
// retire once settings.json's PreToolUse Bash hooks run their TypeScript replacements, the .ts
// files the preceding units built (hooks/pre-bash/issue_body_gate.ts, hooks/pre-bash/wiki_scene.ts).
// This file guards the retirement itself, the same shape as
// hooks/pre-bash/tests/pre-bash-hooks-retirement.test.ts: no tracked file still names the 3
// retired scripts (T-328), and the actually-registered wiki_scene entry both names the .ts
// replacement and still returns this repository's real issue-close pages once it does (T-327,
// carrying forward wiki_scene_seam_test.py's T-013 real-finder pin and T-014 settings.json
// registration check together). The walk and its historical-directory exclusions are
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

// The 3 retired hooks/pre-bash/*.py and hooks/_lib/*.py scripts, matched by name alone:
// T-327's own settings.json check is what verifies the wiki_scene replacement is wired in, this
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
    `files still naming issue_body_gate.py, wiki_scene.py or gh_filing.py ` +
      `(docs/decisions/ and .claude/workspace/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

/** The `command` string of every hook settings.json's PreToolUse array registers under the
 * "Bash" matcher. Mirrors pre-bash-hooks-retirement.test.ts's own preToolUseBashCommands. */
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
 * PreToolUse Bash command registers that stem at all. Mirrors pre-bash-hooks-retirement.test.ts's
 * own commandNaming. */
function commandNaming(commands: string[], stem: string): string | undefined {
  const pattern = new RegExp(`(^|[/\\s])${stem}\\.\\w+($|\\s)`);
  return commands.find((command) => pattern.test(command));
}

// The docs/wiki/ pages this repository currently tags `scenes: ["issue-close"]`
// (skills/scribe/tests/skill_contract_test.py fixes this set; a page added or dropped there has
// to move here too). Listed exactly, not as a lower bound, the same way
// wiki_scene_seam_test.py's ISSUE_CLOSE_PAGES did before this test replaced it.
const ISSUE_CLOSE_PAGES = [
  "incident-driven-deferral.md",
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
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, "settings.json"), "utf8"));
  const commands = preToolUseBashCommands(settings);
  const command = commandNaming(commands, "wiki_scene");
  assert.ok(
    command,
    `settings.json's PreToolUse Bash hooks carry no command naming wiki_scene: ${commands.join(", ")}`,
  );

  const token = (command as string).split(/\s+/).find((piece) => piece.includes("wiki_scene"));
  assert.ok(token, `no whitespace-delimited token in the wiki_scene command names it: ${command}`);
  assert.ok(
    (token as string).endsWith(".ts"),
    `settings.json's wiki_scene command does not end in .ts: ${token}`,
  );

  const relPath = (token as string).startsWith("~/.claude/")
    ? (token as string).slice("~/.claude/".length)
    : (token as string);
  const hookPath = join(REPO_ROOT, relPath);

  // Real repository, real find_wiki_rule.ts, nothing stubbed: pins the pages this repository's
  // own docs/wiki/ tags scenes: ["issue-close"] against the entry settings.json actually
  // registers, not a hardcoded path to wiki_scene.ts.
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
