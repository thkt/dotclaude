/// <reference types="node" />
// Ports 3 of hooks/security/tests/rm_to_trash_test.py's 12 scenarios to rm_to_trash.ts's Red
// step (unit U-005; the Green step brings the rest). VERBS and REASONS come from
// rm_to_trash.py itself via a one-shot python3 spawn -- hook-payload-parity.test.ts:41's
// PY_DRIVER shape -- rather than importing rm_to_trash.ts in-process: its top-level
// `process.exit(main())` (no isMainModule guard, per DR-0114's convention) would end the test
// runner's own process the moment the import ran.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "rm_to_trash.ts");
const LIB_DIR = path.join(HERE, "..", "..", "_lib");
const SECURITY_DIR = path.join(HERE, "..");

interface Parity {
  VERBS: string[];
  REASONS: Record<string, string>;
}

const PY_DRIVER = `
import json
import sys

sys.path.insert(0, sys.argv[1])
sys.path.insert(0, sys.argv[2])
import rm_to_trash as rt

print(json.dumps({"VERBS": sorted(rt.VERBS), "REASONS": rt.REASONS}))
`;

function loadParity(): Parity {
  const result = spawnSync("python3", ["-c", PY_DRIVER, LIB_DIR, SECURITY_DIR], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as Parity;
}

// One spawn for the whole file: every scenario below reads off this same table instead of
// hard-coding rm_to_trash.py's VERBS or REASONS text.
const PARITY = loadParity();

function runHook(command: string): string {
  return run(HOOK, { tool_name: "Bash", tool_input: { command } });
}

/** The denial reason a hook run wrote, or null for a run that denied nothing. */
function denyReason(output: string): string | null {
  if (!output) {
    return null;
  }
  const parsed = JSON.parse(output) as {
    hookSpecificOutput?: { permissionDecisionReason?: string };
  };
  return parsed.hookSpecificOutput?.permissionDecisionReason ?? null;
}

test("T-279 each verb the table names is denied with the reason string that verb maps to", () => {
  for (const verb of PARITY.VERBS) {
    const reason = denyReason(runHook(`${verb} /tmp/x`));
    assert.equal(reason, PARITY.REASONS.verb, `${verb} must be denied with REASONS.verb`);
  }
});

test("T-280 find with -delete is denied and find without it is allowed", () => {
  const deniedReason = denyReason(runHook('find . -name "*.tmp" -delete'));
  assert.equal(deniedReason, PARITY.REASONS.find, "find -delete must be denied with REASONS.find");

  const allowedReason = denyReason(runHook('find . -name "*.tmp"'));
  assert.equal(allowedReason, null, "find without -delete must not be denied");
});

test("T-281 a command whose lexing raises is denied rather than allowed through", () => {
  // An unterminated quote leaves no way to tell where the command position is; kind() catches
  // the lexer's error and falls to "verb" rather than clearing the line.
  const reason = denyReason(runHook('rm -rf "/tmp/x'));
  assert.equal(
    reason,
    PARITY.REASONS.verb,
    "an unparsable command must be denied with REASONS.verb",
  );
});
