/// <reference types="node" />
// Ports 3 of the retired npm_install_guard Python hook test's scenarios to npm_install_guard.ts's
// side (unit U-006). The REASONS prefixes are asserted as literals rather than read off
// npm_install_guard.ts itself: the module carries a top-level `process.exit(main())` (DR-0114,
// no isMainModule guard), so importing it in-process would end the test runner's own process
// the moment the import ran -- exactly the hazard that guard exists for, so only run() (which
// spawns the hook as a child process) ever touches this file.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { denyReason, run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "npm_install_guard.ts");

function makeDir(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

function writeNpmrc(directory: string, contents: string): void {
  writeFileSync(path.join(directory, ".npmrc"), contents, "utf8");
}

function runHook(command: string, home: string): string {
  return run(HOOK, { tool_name: "Bash", tool_input: { command } }, { ...process.env, HOME: home });
}

test("T-282 an install command under a directory whose npmrc omits ignore-scripts is denied with the reason for that manager", () => {
  const home = makeDir("npm-install-guard-home-unset-");
  const project = makeDir("npm-install-guard-project-unset-");

  const reason = denyReason(runHook(`cd ${project} && npm install`, home));

  assert.match(
    reason ?? "",
    /^npm-safe-install: ignore-scripts=true が有効でなく/,
    "an unconfigured install must be denied with REASONS.install",
  );
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
  assert.match(
    overriddenReason ?? "",
    /^npm-safe-install: --ignore-scripts=false \/ --no-ignore-scripts は/,
    "--no-ignore-scripts must be denied with REASONS.override even under a configured .npmrc",
  );
});

test("T-284 a runner subcommand that fetches and runs is denied while a plain script run is allowed", () => {
  const home = makeDir("npm-install-guard-home-unset-");

  const runnerReason = denyReason(runHook("npx create-vite my-app", home));
  assert.match(
    runnerReason ?? "",
    /^npm-safe-install: ignore-scripts=true が有効でなく/,
    "npx must be denied with REASONS.install",
  );

  const scriptReason = denyReason(runHook("npm run build", home));
  assert.equal(scriptReason, null, "a plain script run must not be denied");
});
