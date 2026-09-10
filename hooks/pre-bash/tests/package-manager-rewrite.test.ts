/// <reference types="node" />
// Ports hooks/pre-bash/tests/package_manager_rewrite_test.py's 18 observations to
// package_manager_rewrite.ts's side (unit U-004), folded into the plan's three scenarios the
// way hooks/lifecycle/tests/recall-index.test.ts folds five Python scenarios into four and
// hooks/pre-bash/tests/client-identifier-gate.test.ts folds nine into three.
//
// Every scenario spawns the hook (run(), from _hook-harness.ts) rather than importing
// package_manager_rewrite.ts in-process: the module carries a top-level `process.exit(main())`
// (DR-0114, no isMainModule guard), so an in-process import would run main() and exit the test
// runner's own process the moment the import ran -- the same hazard client-identifier-gate.test.ts
// avoids the same way, and the reason T-299 diffs the hook's own output against the Python
// module's convert() (a plain function call is safe there: package_manager_rewrite.py keeps
// the `if __name__ == "__main__":` guard the .ts side deliberately drops) rather than importing
// convert from package_manager_rewrite.ts directly.
//
// T-299 reaches the Python side with one python3 spawn per command (hook-payload-parity.test.ts:
// 41's PY_DRIVER shape) rather than hardcoding the expected strings here a second time -- the
// conversion table stays single-sourced in the .py file while both sides move over.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "package_manager_rewrite.ts");
// hooks/pre-bash/tests -> hooks/pre-bash, the one level package_manager_rewrite.py itself sits
// under, importable by module name once that directory is on sys.path.
const HOOKS_PRE_BASH_DIR = path.join(HERE, "..");

// A one-shot driver rather than a CLI: package_manager_rewrite.py has no __main__ export of
// convert, so this is the smallest way to call it from outside the process. It mirrors the one
// function package_manager_rewrite.ts exposes.
const PY_DRIVER = `
import json
import sys

sys.path.insert(0, sys.argv[1])
import package_manager_rewrite as pmr

spec = json.loads(sys.stdin.read())
result = pmr.convert(spec["parts"])
print(json.dumps({"result": result}))
`;

function pythonConvert(parts: readonly string[]): string {
  const result = spawnSync("python3", ["-c", PY_DRIVER, HOOKS_PRE_BASH_DIR], {
    input: JSON.stringify({ parts }),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return (JSON.parse(result.stdout) as { result: string }).result;
}

interface Decision {
  hookSpecificOutput?: {
    updatedInput?: { command?: string };
  };
}

/** The rewritten command the ts hook emits for `command`, empty for one left unchanged --
 * mirrors package_manager_rewrite_test.py's own `converted` helper. */
function convertedByHook(command: string, env: NodeJS.ProcessEnv): string {
  const stdout = run(HOOK, { tool_name: "Bash", tool_input: { command } }, env);
  if (!stdout.trim()) return "";
  return (JSON.parse(stdout) as Decision).hookSpecificOutput?.updatedInput?.command ?? "";
}

/** A scratch PATH carrying a stub `ni` executable, the same stub shape
 * package_manager_rewrite_test.py's setUpClass installs. */
function pathWithNiStub(): string {
  const scratch = mkdtempSync(path.join(tmpdir(), "package-manager-rewrite-tests-"));
  const stubBin = path.join(scratch, "bin");
  mkdirSync(stubBin);
  const ni = path.join(stubBin, "ni");
  writeFileSync(ni, "#!/bin/sh\nexit 0\n");
  chmodSync(ni, 0o755);
  return `${stubBin}${path.delimiter}${process.env.PATH ?? ""}`;
}

/** A scratch PATH with nothing on it -- no `ni` anywhere, and none of the host's own PATH
 * leaks in to accidentally resolve one. */
function pathWithoutNi(): string {
  return mkdtempSync(path.join(tmpdir(), "package-manager-rewrite-tests-empty-"));
}

test("T-299 each manager the table names converts to the head the python version emitted, compared as the whole rewritten string", () => {
  const env = { ...process.env, PATH: pathWithNiStub() };
  const commands: Record<string, string> = {
    npm: "npm install",
    npx: "npx create-vite my-app",
    pnpm: "pnpm add zod",
    yarn: "yarn remove zod",
    bun: "bun run build",
    bunx: "bunx cowsay",
  };

  for (const [manager, command] of Object.entries(commands)) {
    const tsResult = convertedByHook(command, env);
    const pyResult = pythonConvert(command.split(/\s+/));
    assert.equal(
      tsResult,
      pyResult,
      `${manager}: package_manager_rewrite.ts and package_manager_rewrite.py must agree on "${command}"`,
    );
  }
});

test("T-300 a command whose head is not a manager passes through unchanged", () => {
  const env = { ...process.env, PATH: pathWithNiStub() };

  const stdout = run(HOOK, { tool_name: "Bash", tool_input: { command: "git status" } }, env);

  assert.equal(stdout, "", "a non-manager command must pass through unchanged");
});

test("T-301 a manager that is not installed leaves the command unchanged rather than rewriting it", () => {
  const env = { ...process.env, PATH: pathWithoutNi() };

  const stdout = run(HOOK, { tool_name: "Bash", tool_input: { command: "npm install" } }, env);

  assert.equal(stdout, "", "npm install must pass through unchanged when ni is not installed");
});
