/// <reference types="node" />
// Ports 3 of hooks/security/tests/npm_install_guard_test.py's scenarios to
// npm_install_guard.ts's Red step (unit U-006; the Green step brings the rest). REASONS comes
// from npm_install_guard.py itself via a one-shot python3 spawn -- hook-payload-parity.test.ts's
// PY_DRIVER shape, also used by rm-to-trash.test.ts -- rather than importing npm_install_guard.ts
// in-process: its top-level `process.exit(main())` (no isMainModule guard, per DR-0114's
// convention) would end the test runner's own process the moment the import ran.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "npm_install_guard.ts");
const LIB_DIR = path.join(HERE, "..", "..", "_lib");
const SECURITY_DIR = path.join(HERE, "..");

interface Parity {
  REASONS: Record<string, string>;
}

const PY_DRIVER = `
import json
import sys

sys.path.insert(0, sys.argv[1])
sys.path.insert(0, sys.argv[2])
import npm_install_guard as nig

print(json.dumps({"REASONS": nig.REASONS}))
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
// hard-coding npm_install_guard.py's REASONS text.
const PARITY = loadParity();

function makeDir(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

function writeNpmrc(directory: string, contents: string): void {
  writeFileSync(path.join(directory, ".npmrc"), contents, "utf8");
}

function runHook(command: string, home: string): string {
  return run(HOOK, { tool_name: "Bash", tool_input: { command } }, { ...process.env, HOME: home });
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

test("T-282 an install command under a directory whose npmrc omits ignore-scripts is denied with the reason for that manager", () => {
  const home = makeDir("npm-install-guard-home-unset-");
  const project = makeDir("npm-install-guard-project-unset-");

  const reason = denyReason(runHook(`cd ${project} && npm install`, home));

  assert.equal(reason, PARITY.REASONS.install, "an unconfigured install must be denied with REASONS.install");
});

test("T-283 the same command under a directory whose npmrc sets ignore-scripts is allowed, and an override flag makes it denied again", () => {
  const home = makeDir("npm-install-guard-home-unset-");
  const project = makeDir("npm-install-guard-project-configured-");
  writeNpmrc(project, "ignore-scripts=true\n");

  const allowedReason = denyReason(runHook(`cd ${project} && npm install`, home));
  assert.equal(allowedReason, null, "a project .npmrc setting ignore-scripts=true must not be denied");

  const overriddenReason = denyReason(
    runHook(`cd ${project} && npm install --no-ignore-scripts`, home),
  );
  assert.equal(
    overriddenReason,
    PARITY.REASONS.override,
    "--no-ignore-scripts must be denied with REASONS.override even under a configured .npmrc",
  );
});

test("T-284 a runner subcommand that fetches and runs is denied while a plain script run is allowed", () => {
  const home = makeDir("npm-install-guard-home-unset-");

  const runnerReason = denyReason(runHook("npx create-vite my-app", home));
  assert.equal(runnerReason, PARITY.REASONS.install, "npx must be denied with REASONS.install");

  const scriptReason = denyReason(runHook("npm run build", home));
  assert.equal(scriptReason, null, "a plain script run must not be denied");
});
