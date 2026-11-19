/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hookCommands } from "./_settings-hooks.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function settings(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(REPO_ROOT, "settings.json"), "utf8"));
}

test("T-001 hookCommands returns the command string of every group under the named event", () => {
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

test("T-002 hookCommands with a matcher returns only the groups whose matcher equals it", () => {
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

test("T-003 hookCommands returns an empty list when the event or its groups are not arrays, and the commands once one group is an array", () => {
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

test("T-567 settings.json registers exactly one Stop command, done_gate.ts stop, and the script it names is tracked with the exec bit", () => {
  const commands = hookCommands(settings(), "Stop");
  assert.deepEqual(commands, ["~/.claude/hooks/lifecycle/done_gate.ts stop"]);

  const script = commands[0].split(" ")[0].replace("~/.claude/", "");
  const staged = spawnSync("git", ["ls-files", "-s", "--", script], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  assert.equal(staged.status, 0, staged.stderr);
  assert.match(staged.stdout, /^100755 /, `${script} is not tracked with the exec bit: ${staged.stdout}`);
});

test("T-580 settings.json registers exactly one PreToolUse command on matcher Bash, publish_gate.ts, and the script it names is tracked with the exec bit", () => {
  const commands = hookCommands(settings(), "PreToolUse", "Bash");
  assert.deepEqual(commands, ["~/.claude/hooks/pre-bash/publish_gate.ts"]);

  const script = commands[0].replace("~/.claude/", "");
  const staged = spawnSync("git", ["ls-files", "-s", "--", script], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  assert.equal(staged.status, 0, staged.stderr);
  assert.match(staged.stdout, /^100755 /, `${script} is not tracked with the exec bit: ${staged.stdout}`);
});

test("T-568 settings.json permissions.allow lets a session run done_gate.ts without a prompt", () => {
  const permissions = settings().permissions as { allow: string[] };
  assert.ok(permissions.allow.includes("Bash(~/.claude/hooks/lifecycle/done_gate.ts *)"));
});
