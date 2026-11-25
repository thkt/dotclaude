/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hookCommands } from "./_settings-hooks.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function settings(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(REPO_ROOT, "settings.json"), "utf8"));
}

test("hookCommands returns the command string of every group under the named event", () => {
  const settings = {
    hooks: {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "a.ts" }] },
        {
          matcher: "Edit",
          hooks: [
            { type: "command", command: "b.ts" },
            { type: "command", command: "c.ts" },
          ],
        },
      ],
    },
  };
  assert.deepEqual(hookCommands(settings, "PreToolUse"), ["a.ts", "b.ts", "c.ts"]);
});

test("hookCommands with a matcher returns only the groups whose matcher equals it", () => {
  const settings = {
    hooks: {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "a.ts" }] },
        { matcher: "Edit", hooks: [{ type: "command", command: "b.ts" }] },
        { matcher: "Bash", hooks: [{ type: "command", command: "d.ts" }] },
      ],
    },
  };
  assert.deepEqual(hookCommands(settings, "PreToolUse", "Bash"), ["a.ts", "d.ts"]);
});

test("hookCommands returns an empty list when the event or its groups are not arrays, and the commands once one group is an array", () => {
  assert.deepEqual(hookCommands({}, "PreToolUse"), []);
  assert.deepEqual(hookCommands({ hooks: {} }, "PreToolUse"), []);
  assert.deepEqual(hookCommands({ hooks: { PreToolUse: "not-an-array" } }, "PreToolUse"), []);
  assert.deepEqual(
    hookCommands({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: "nope" }] } }, "PreToolUse"),
    [],
  );

  const withOneRealGroup = {
    hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "a.ts" }] }] },
  };
  assert.deepEqual(hookCommands(withOneRealGroup, "PreToolUse"), ["a.ts"]);
});

test("settings.json registers exactly one Stop command, done_gate.ts stop", () => {
  const commands = hookCommands(settings(), "Stop");
  assert.deepEqual(commands, ["~/.claude/hooks/lifecycle/done_gate.ts stop"]);
});

test("settings.json registers exactly one PreToolUse command on matcher Bash, publish_gate.ts", () => {
  const commands = hookCommands(settings(), "PreToolUse", "Bash");
  assert.deepEqual(commands, ["~/.claude/hooks/pre-bash/publish_gate.ts"]);
});

test("settings.json permissions.allow lets a session run done_gate.ts without a prompt", () => {
  const permissions = settings().permissions as { allow: string[] };
  assert.ok(permissions.allow.includes("Bash(~/.claude/hooks/lifecycle/done_gate.ts *)"));
});
