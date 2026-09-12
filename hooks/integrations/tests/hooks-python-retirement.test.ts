/// <reference types="node" />
// hooks/_lib/scribe_trigger.py, hooks/_lib/command_scan.py, hooks/_lib/hook_harness.py,
// hooks/post-bash/scribe_prompt.py and hooks/integrations/amphetamine_agent_session.py retire
// once settings.json fires only their TypeScript replacements: scribe_trigger.ts / scribe_prompt.ts
// (units U-001/U-002, already wired for scribe_prompt.ts) and amphetamine_agent_session.ts
// (units U-003/U-004, not yet wired). This file guards the retirement itself, the same shape as
// hooks/_lib/tests/recall-index-retirement.test.ts and hooks/_lib/tests/security-hooks-retirement.test.ts:
// no tracked file still names the 5 retired scripts, and the events settings.json fires the
// amphetamine hook from carry the .ts command with the argv each event's action expects. The walk
// and its historical-directory exclusions are offendersAmong (workflows/_lib/tests/_retirement.ts),
// reused here rather than re-derived.
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

// The 5 retired hooks/**/*.py scripts, matched by name alone: settings.json's own event/argv
// check (below) is what verifies the .ts replacement is wired in, this predicate only asks
// whether the retired filename still shows up anywhere.
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
    `files still naming a retired .py (${RETIRED_NAMES.join(", ")}) ` +
      `(docs/decisions/ and .claude/workspace/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

/** The `command` string of every hook settings.json's `eventName` array registers, across every
 * matcher group under that event. */
function eventCommands(settings: unknown, eventName: string): string[] {
  const hooksNode =
    settings !== null && typeof settings === "object"
      ? (settings as Record<string, unknown>).hooks
      : undefined;
  const eventNode =
    hooksNode !== null && typeof hooksNode === "object"
      ? (hooksNode as Record<string, unknown>)[eventName]
      : undefined;
  const commands: string[] = [];
  if (!Array.isArray(eventNode)) return commands;
  for (const group of eventNode) {
    if (group === null || typeof group !== "object") continue;
    const groupHooks = (group as Record<string, unknown>).hooks;
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

/** The command among `commands` whose executable token names `stem`, regardless of extension. */
function commandNaming(commands: string[], stem: string): string | undefined {
  const pattern = new RegExp(`(^|[/\\s])${stem}\\.\\w+($|\\s)`);
  return commands.find((command) => pattern.test(command));
}

// The event each of settings.json's 3 amphetamine_agent_session registrations fires from, paired
// with the argv (action) that event's own contract expects: PostToolUse's "*" matcher calls
// `background`, Stop calls `release`, UserPromptSubmit calls `acquire`
// (hooks/integrations/amphetamine_agent_session.py's module docstring).
const EVENT_ACTIONS: Array<[event: string, action: string]> = [
  ["PostToolUse", "background"],
  ["Stop", "release"],
  ["UserPromptSubmit", "acquire"],
];

test("T-400 the three events settings.json registers for the amphetamine hook pass the argv each event's action expects, read from settings.json", () => {
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, "settings.json"), "utf8"));

  for (const [event, action] of EVENT_ACTIONS) {
    const commands = eventCommands(settings, event);
    const command = commandNaming(commands, "amphetamine_agent_session");
    assert.ok(
      command,
      `settings.json's ${event} hooks carry no command naming amphetamine_agent_session: ${commands.join(", ")}`,
    );

    const [token, argv] = (command as string).trim().split(/\s+/);
    assert.ok(
      token.endsWith(".ts"),
      `settings.json's ${event} amphetamine command does not end in .ts: ${token}`,
    );
    assert.equal(
      argv,
      action,
      `settings.json's ${event} amphetamine command must pass argv "${action}", got "${argv}"`,
    );
  }
});
