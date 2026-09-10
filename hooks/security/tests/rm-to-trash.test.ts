/// <reference types="node" />
// Ports 3 of the retired rm_to_trash Python hook test's 12 scenarios to rm_to_trash.ts's side
// (unit U-005). VERBS and the REASONS prefixes are asserted as literals rather than read off
// rm_to_trash.ts itself: the module carries a top-level `process.exit(main())` (DR-0114, no
// isMainModule guard), so importing it in-process would end the test runner's own process the
// moment the import ran -- exactly the hazard that guard exists for, so only run() (which
// spawns the hook as a child process) ever touches this file.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { denyReason, run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "rm_to_trash.ts");

// rm_to_trash.ts's own VERBS.
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
  // An unterminated quote leaves no way to tell where the command position is; kind() catches
  // the lexer's error and falls to "verb" rather than clearing the line.
  const reason = denyReason(runHook('rm -rf "/tmp/x'));
  assert.match(
    reason ?? "",
    /^rm-to-trash: 削除は/,
    "an unparsable command must be denied with REASONS.verb",
  );
});
