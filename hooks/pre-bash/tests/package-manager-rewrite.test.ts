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
// avoids the same way.
//
// T-299 compared the hook's output against the Python module's convert() through a python3
// spawn while both sides ran. That module retires in this same slice, so the comparison is
// frozen instead: FROZEN_CONVERSIONS holds what convert() answered for each command, read off
// the Python original at the branch point before it was deleted
// (docs/wiki/fixture-freeze-before-port.md). The values move only when the conversion itself is
// meant to move.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "package_manager_rewrite.ts");
// hooks/pre-bash/tests -> hooks/security, npm_install_guard.ts's own module (T-302:
// NI_INSTALLS / RUNNERS, the sets a rewritten install-shaped head must land in).
const NPM_INSTALL_GUARD = path.join(HERE, "..", "..", "security", "npm_install_guard.ts");

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

// What the retired Python rewriter's convert() answered for each command, captured from the
// module at this branch's base before U-008 deleted it.
const FROZEN_CONVERSIONS: Record<string, { command: string; rewritten: string }> = {
  npm: { command: "npm install", rewritten: "ni" },
  npx: { command: "npx create-vite my-app", rewritten: "nlx create-vite my-app" },
  pnpm: { command: "pnpm add zod", rewritten: "ni zod" },
  yarn: { command: "yarn remove zod", rewritten: "nun zod" },
  bun: { command: "bun run build", rewritten: "nr build" },
  bunx: { command: "bunx cowsay", rewritten: "nlx cowsay" },
};

test("T-299 each manager the table names converts to the head the python version emitted, compared as the whole rewritten string", () => {
  const env = { ...process.env, PATH: pathWithNiStub() };

  for (const [manager, frozen] of Object.entries(FROZEN_CONVERSIONS)) {
    assert.equal(
      convertedByHook(frozen.command, env),
      frozen.rewritten,
      `${manager}: package_manager_rewrite.ts must answer "${frozen.command}" the way the ` +
        `retired Python rewriter did`,
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

// package_manager_rewrite.ts and npm_install_guard.ts both carry a top-level
// `process.exit(main())` (DR-0114, no isMainModule guard) -- the same hazard T-299's PY_DRIVER
// comment and npm-install-guard.test.ts's header describe. A plain `import` of either hits it:
// ESM evaluates an imported module's top-level code, exit call included, before the importer's
// own code resumes, so the import itself would end this file's process before a single
// assertion ran. A subprocess does not dodge that (the same process.exit fires inside it too);
// what does is stubbing `process.exit` into a no-op before the dynamic import runs, so main()'s
// exit call falls through as a statement that does nothing, module evaluation completes, and
// the import resolves to the real exports. HEAD_DRIVER carries that stub, then enumerates every
// head convert() can emit for an install-shaped subcommand -- reading which manager names and
// which subcommands count as "install-shaped" off the two modules' own exports (MANAGERS from
// package_manager_rewrite.ts, INSTALLS/FETCH_AND_RUN from npm_install_guard.ts) instead of
// retyping either list here.
const HEAD_DRIVER = `
process.exit = () => {};
const [, pmrPath, nigPath] = process.argv;
const pmr = await import(pmrPath);
const nig = await import(nigPath);
const managers = [...pmr.MANAGERS].filter((m) => m !== "npx" && m !== "bunx");
const subcommands = [...nig.INSTALLS, ...nig.FETCH_AND_RUN];
const heads = new Set();
for (const manager of managers) {
  for (const subcommand of subcommands) {
    for (const parts of [[manager, subcommand], [manager, subcommand, "pkg"]]) {
      const result = pmr.convert(parts);
      if (result) heads.add(result.split(/\\s+/)[0]);
    }
  }
}
// npx / bunx never reach the subcommand table above -- convert() rewrites them from the
// manager name alone (T-299's "npx"/"bunx" rows).
for (const manager of ["npx", "bunx"]) {
  const result = pmr.convert([manager, "pkg"]);
  if (result) heads.add(result.split(/\\s+/)[0]);
}
process.stdout.write(JSON.stringify({
  heads: [...heads],
  NI_INSTALLS: [...nig.NI_INSTALLS],
  RUNNERS: [...nig.RUNNERS],
}));
`;

interface HeadEnumeration {
  heads: string[];
  NI_INSTALLS: string[];
  RUNNERS: string[];
}

function installShapedHeads(): HeadEnumeration {
  const pmrUrl = pathToFileURL(HOOK).href;
  const nigUrl = pathToFileURL(NPM_INSTALL_GUARD).href;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", HEAD_DRIVER, pmrUrl, nigUrl],
    { input: "", encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`node head-enumeration driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as HeadEnumeration;
}

test("T-302 every install-shaped head convert can emit is a member of NI_INSTALLS or RUNNERS, derived from both modules rather than restated", () => {
  const { heads, NI_INSTALLS, RUNNERS } = installShapedHeads();
  assert.ok(heads.length > 0, "the enumeration must produce at least one head to check");

  const allowed = new Set([...NI_INSTALLS, ...RUNNERS]);
  for (const head of heads) {
    assert.ok(
      allowed.has(head),
      `convert() emits install-shaped head "${head}", which npm_install_guard.ts's NI_INSTALLS/RUNNERS must cover`,
    );
  }
});
