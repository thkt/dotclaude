/// <reference types="node" />
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { denyReason, run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "rm_to_trash.ts");

const VERBS = ["rm", "rmdir", "unlink", "shred"];

function runHook(command: string): string {
  return run(HOOK, { tool_name: "Bash", tool_input: { command } });
}

test("T-279 each verb the table names is denied with the reason string that verb maps to", () => {
  for (const verb of VERBS) {
    const reason = denyReason(runHook(`${verb} /tmp/x`));
    assert.match(
      reason ?? "",
      /^rm-to-trash: 削除は/,
      `${verb} must be denied with REASONS.verb`,
    );
  }
});

test("T-280 find with -delete is denied and find without it is allowed", () => {
  const deniedReason = denyReason(runHook('find . -name "*.tmp" -delete'));
  assert.match(
    deniedReason ?? "",
    /^rm-to-trash: find -delete は/,
    "find -delete must be denied with REASONS.find",
  );

  const allowedReason = denyReason(runHook('find . -name "*.tmp"'));
  assert.equal(allowedReason, null, "find without -delete must not be denied");
});

test("T-281 a command whose lexing raises is denied rather than allowed through", () => {
  const reason = denyReason(runHook('rm -rf "/tmp/x'));
  assert.match(
    reason ?? "",
    /^rm-to-trash: 削除は/,
    "an unparsable command must be denied with REASONS.verb",
  );
});

const DENIED = [
  "cd /tmp\nrm -rf x",
  "sudo rm -rf /tmp/x",
  "env rm /tmp/x",
  "time rm -rf /tmp/x",
  "/bin/rm -rf /tmp/x",
  'find . -name "*.tmp" -exec rm {} \\;',
  "find . -print0 | xargs -0 rm",
  "git clean -fd",
  "git -C /tmp clean -fd",
  "FOO=1 rm -rf /tmp/x",
  "FOO=1 BAR=2 rm -rf /tmp/x",
];

const ALLOWED = [
  "sed -i '' 's|rm -rf x|y|g' f",
  "git commit -m 'remove rm calls from the test'",
  "echo 'rm -rf danger' > note.txt",
  "git clean -n",
  "git clean -nd",
  "git clean --dry-run",
  'find . -name "*.tmp"',
  "git status",
];

test("a deletion reached through a wrapper, an indirection or an environment prefix is denied", () => {
  for (const command of DENIED) {
    assert.ok(denyReason(runHook(command)), `${JSON.stringify(command)} must be denied`);
  }
});

test("a deletion word that names no deletion, and a listing form, stay allowed", () => {
  for (const command of ALLOWED) {
    assert.equal(denyReason(runHook(command)), null, `${JSON.stringify(command)} must be allowed`);
  }
});
