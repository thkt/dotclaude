/// <reference types="node" />
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
const NPM_INSTALL_GUARD = path.join(HERE, "..", "..", "security", "npm_install_guard.ts");

interface Decision {
  hookSpecificOutput?: {
    updatedInput?: { command?: string };
  };
}

function convertedByHook(command: string, env: NodeJS.ProcessEnv): string {
  const stdout = run(HOOK, { tool_name: "Bash", tool_input: { command } }, env);
  if (!stdout.trim()) return "";
  return (JSON.parse(stdout) as Decision).hookSpecificOutput?.updatedInput?.command ?? "";
}

function pathWithNiStub(): string {
  const scratch = mkdtempSync(path.join(tmpdir(), "package-manager-rewrite-tests-"));
  const stubBin = path.join(scratch, "bin");
  mkdirSync(stubBin);
  const ni = path.join(stubBin, "ni");
  writeFileSync(ni, "#!/bin/sh\nexit 0\n");
  chmodSync(ni, 0o755);
  return `${stubBin}${path.delimiter}${process.env.PATH ?? ""}`;
}

function pathWithoutNi(): string {
  return mkdtempSync(path.join(tmpdir(), "package-manager-rewrite-tests-empty-"));
}

const FROZEN_CONVERSIONS: Record<string, { command: string; rewritten: string }> = {
  npm: { command: "npm install", rewritten: "ni" },
  npx: { command: "npx create-vite my-app", rewritten: "nlx create-vite my-app" },
  pnpm: { command: "pnpm add zod", rewritten: "ni zod" },
  yarn: { command: "yarn remove zod", rewritten: "nun zod" },
  bun: { command: "bun run build", rewritten: "nr build" },
  bunx: { command: "bunx cowsay", rewritten: "nlx cowsay" },
};

test("each manager the table names converts to its ni-family head, compared as the whole rewritten string", () => {
  const env = { ...process.env, PATH: pathWithNiStub() };

  for (const [manager, frozen] of Object.entries(FROZEN_CONVERSIONS)) {
    assert.equal(
      convertedByHook(frozen.command, env),
      frozen.rewritten,
      `${manager}: package_manager_rewrite.ts must rewrite "${frozen.command}" to "${frozen.rewritten}"`,
    );
  }
});

test("a command whose head is not a manager passes through unchanged", () => {
  const env = { ...process.env, PATH: pathWithNiStub() };

  const stdout = run(HOOK, { tool_name: "Bash", tool_input: { command: "git status" } }, env);

  assert.equal(stdout, "", "a non-manager command must pass through unchanged");
});

test("a manager that is not installed leaves the command unchanged rather than rewriting it", () => {
  const env = { ...process.env, PATH: pathWithoutNi() };

  const stdout = run(HOOK, { tool_name: "Bash", tool_input: { command: "npm install" } }, env);

  assert.equal(stdout, "", "npm install must pass through unchanged when ni is not installed");
});

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
// manager name alone (the "npx"/"bunx" rows).
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

test("every install-shaped head convert can emit is a member of NI_INSTALLS or RUNNERS, derived from both modules rather than restated", () => {
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
