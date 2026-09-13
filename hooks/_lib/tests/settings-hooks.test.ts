/// <reference types="node" />
// Guards hooks/_lib/tests/_settings-hooks.ts's hookCommands(), the shared helper unit U-006 gives
// the six settings.json hook-command-scanning test files (mirror-prose-retirement.test.ts,
// recall-index-retirement.test.ts, security-hooks-retirement.test.ts,
// hooks-python-retirement.test.ts, pre-bash-hooks-retirement.test.ts,
// pre-bash-skill-hooks-retirement.test.ts) to import instead of each re-deriving its own
// eventCommands / preToolUseBashCommands / sessionStartCommands / mirrorProseGuardCommands.
// hookCommands is hooks-python-retirement.test.ts's own eventCommands with an optional matcher
// argument added, so a caller that needs only one matcher's groups (the PreToolUse "Bash"
// filter every pre-bash/security retirement test hand-rolled) passes it instead of filtering the
// full per-event list itself.
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

test("T-003 hookCommands returns an empty list when the event or its groups are not arrays", () => {
  assert.deepEqual(hookCommands({}, "PreToolUse"), []);
  assert.deepEqual(hookCommands({ hooks: {} }, "PreToolUse"), []);
  assert.deepEqual(hookCommands({ hooks: { PreToolUse: "not-an-array" } }, "PreToolUse"), []);
  assert.deepEqual(
    hookCommands({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: "nope" }] } }, "PreToolUse"),
    [],
  );

  // Contrast case: the same shape with one real group must come back non-empty, so a stub that
  // always answers [] fails this test instead of passing it by coincidence.
  const withOneRealGroup = {
    hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "a.ts" }] }] },
  };
  assert.deepEqual(hookCommands(withOneRealGroup, "PreToolUse"), ["a.ts"]);
});
