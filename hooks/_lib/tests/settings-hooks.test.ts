/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { hookCommands } from "./_settings-hooks.ts";

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
