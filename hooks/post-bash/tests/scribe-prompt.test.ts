/// <reference types="node" />
// Ports hooks/post-bash/tests/scribe_prompt_test.py's five observations to scribe_prompt.ts's
// side (unit U-002), folding them into three scenarios the way
// hooks/_lib/tests/scribe-trigger.test.ts folds scribe_trigger_test.py's fourteen: T-390 (the
// prompting case, test_prompting_decided_puts_scribe_in_additional_context), T-391 (the two "no
// output" cases, test_not_prompting_decided_stdout_is_empty and
// test_failed_tool_response_does_not_prompt), and T-392 (the executable-bit check,
// test_the_hook_file_is_executable, plus the settings.json registration check,
// test_settings_json_registers_hook_under_posttooluse_bash). The hook runs as a real subprocess
// against the real scribe_trigger.ts module; only gh, the external system should_prompt calls
// out to, is stubbed -- the same shape scribe_prompt_test.py and
// hooks/lifecycle/tests/recall-index.test.ts both use.
import assert from "node:assert/strict";
import { accessSync, chmodSync, constants, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK = join(HERE, "..", "scribe_prompt.ts");
const SETTINGS = join(HERE, "..", "..", "..", "settings.json");

// should_prompt's three gh calls in the order hooks/_lib/scribe_trigger.ts makes them: the
// unmerged-PR check, the last-scribe-merge cursor, then the new-input count. Values match
// scribe_prompt_test.py's PROMPTING_GH_RESPONSES so a drift between the two suites would show
// up as one of them alone going red.
const PROMPTING_GH_RESPONSES = ["[]", "", '[{"number": 5}]'];

// A fake `gh` that pops one canned response per invocation, in call order. Same shape
// scribe_prompt_test.py's GH_STUB and hooks/_lib/tests/scribe-trigger.test.ts's GH_STUB both use.
const GH_STUB = `#!/usr/bin/env python3
import os
import pathlib
import sys

responses = pathlib.Path(os.environ["GH_STUB_RESPONSES"]).read_text(encoding="utf-8").split("\\n")
index_path = pathlib.Path(os.environ["GH_STUB_INDEX"])
i = int(index_path.read_text()) if index_path.is_file() else 0
index_path.write_text(str(i + 1))
sys.stdout.write(responses[i])
`;

interface Fixture {
  root: string;
  home: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "scribe-prompt-tests-"));
  const home = join(root, "home");
  mkdirSync(home);
  return { root, home };
}

function ghStubDir(root: string, responses: readonly string[]): { dir: string; env: NodeJS.ProcessEnv } {
  const dir = join(root, "gh-stub");
  mkdirSync(dir);
  const stub = join(dir, "gh");
  writeFileSync(stub, GH_STUB);
  chmodSync(stub, 0o755);
  const responsesFile = join(dir, "responses");
  writeFileSync(responsesFile, responses.join("\n"));
  return {
    dir,
    env: {
      CLAUDE_GH_BIN: stub,
      GH_STUB_RESPONSES: responsesFile,
      GH_STUB_INDEX: join(dir, "index"),
    },
  };
}

/** Runs the hook on a Bash PostToolUse payload for `command`. HOME moves to a fresh temp dir so
 * shouldPrompt's cooldown stamp (~/.cache/claude-scribe_trigger.last) never touches this
 * machine's real one, the same isolation scribe_prompt_test.py's run_hook uses.
 *
 * ghResponses is undefined on every path where should_prompt is expected to return before it
 * ever calls gh (no docs/wiki, or the tool_response-failure short-circuit): PATH then carries no
 * `gh` at all, so an implementation bug that reaches gh anyway fails fast on "not found" instead
 * of making a real network call. */
function runHook(
  f: Fixture,
  command: string,
  options: { interrupted?: boolean; ghResponses?: readonly string[] } = {},
): string {
  const payload = {
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_input: { command },
    tool_response: {
      stdout: "",
      stderr: "",
      interrupted: options.interrupted ?? false,
      isImage: false,
    },
  };
  const base: NodeJS.ProcessEnv = { ...process.env, HOME: f.home };
  if (options.ghResponses !== undefined) {
    const stub = ghStubDir(f.root, options.ghResponses);
    return run(HOOK, payload, {
      ...base,
      ...stub.env,
      PATH: `${stub.dir}${base.PATH ? `:${base.PATH}` : ""}`,
    });
  }
  return run(HOOK, payload, { ...base, PATH: f.root });
}

test("T-390 a triggering command reaches notify with the prompt text unchanged", () => {
  const f = fixture();
  const directory = join(f.root, "target-prompt");
  mkdirSync(join(directory, "docs", "wiki"), { recursive: true });

  const stdout = runHook(f, `cd ${directory}; git pull`, { ghResponses: PROMPTING_GH_RESPONSES });
  const payload = JSON.parse(stdout) as { hookSpecificOutput: { additionalContext: string } };

  assert.equal(
    payload.hookSpecificOutput.additionalContext,
    "scribe_prompt: 直近の pull で docs/wiki/ 未反映の入力が増えた。/scribe を実行して知見を抽出する。",
    "the retired Python module's message text must reach additionalContext unchanged",
  );
});

test("T-391 a non-triggering command produces no output", () => {
  const f = fixture();

  // No docs/wiki under the target: shouldPrompt's first gate returns false before it ever
  // calls gh (hooks/_lib/scribe_trigger.ts's shouldPrompt docstring).
  const noWiki = join(f.root, "target-no-wiki");
  mkdirSync(noWiki);
  assert.equal(
    runHook(f, `cd ${noWiki}; git pull`),
    "",
    "a command with no docs/wiki must produce no output",
  );

  // docs/wiki is present here, unlike above: the only thing that can stop a prompt on this
  // fixture is the tool_response check itself, not shouldPrompt's own gates.
  const interrupted = join(f.root, "target-interrupted");
  mkdirSync(join(interrupted, "docs", "wiki"), { recursive: true });
  assert.equal(
    runHook(f, `cd ${interrupted}; git pull`, { interrupted: true }),
    "",
    "an interrupted tool_response must produce no output",
  );
});

test("T-392 settings.json registers this hook under the PostToolUse Bash matcher, read from settings.json rather than restated", (t) => {
  // settings.json runs the path directly, so a hook without the exec bit never starts and the
  // miss shows up as nothing happening rather than as an error -- scribe_prompt_test.py folds
  // this same check alongside the registration one.
  accessSync(HOOK, constants.X_OK);

  let settingsText: string;
  try {
    settingsText = readFileSync(SETTINGS, "utf8");
  } catch {
    // .gitignore has settings.json untracked, so a checkout without one (CI) has nothing to
    // check -- scribe_prompt_test.py's registration test skips the same way for the same reason.
    t.skip("settings.json は追跡外で、このチェックアウトには無い");
    return;
  }
  const settings = JSON.parse(settingsText) as {
    hooks: { PostToolUse: { matcher?: string; hooks: { command?: string }[] }[] };
  };
  const commands = settings.hooks.PostToolUse.filter((entry) => entry.matcher === "Bash")
    .flatMap((entry) => entry.hooks)
    .map((hook) => hook.command ?? "");
  // Read off HOOK itself rather than restating the filename as its own literal, so a rename
  // cannot leave this assertion stale against the file it is meant to track.
  const hookName = basename(HOOK);
  assert.ok(
    commands.some((command) => command.includes(hookName)),
    `post-bash/${hookName} が settings.json の PostToolUse/Bash に無い: ${commands.join(", ")}`,
  );
});
