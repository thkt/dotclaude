import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const OXLINT_BIN = path.join(ROOT, "node_modules", ".bin", "oxlint");
const OXLINTRC = path.join(ROOT, ".oxlintrc.json");

const BUN_GLOBAL = `export function readConfig() {
  return Bun.file("config.json");
}
`;

const BUN_GLOBAL_REMOVED = `const config = { file: (name) => name };

export function readConfig() {
  return config.file("config.json");
}
`;

const BUN_SPECIFIER = `import { file } from "bun:test";

export function useFile() {
  return file;
}
`;

const BUN_OBFUSCATED = `export function readEnv() {
  const a = globalThis.Bun.env;
  const b = globalThis["Bun"].file("x");
  const sqlite = require("bun:sqlite");
  return { a, b, sqlite };
}
`;

let workspace;
const cache = new Map();

function lint(name, source) {
  if (cache.has(name)) return cache.get(name);
  assert.ok(
    existsSync(OXLINT_BIN),
    `${OXLINT_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  if (!workspace) {
    workspace = mkdtempSync(path.join(tmpdir(), "oxlint-runtime-"));
    copyFileSync(OXLINTRC, path.join(workspace, ".oxlintrc.json"));
  }
  const file = `${name}.ts`;
  writeFileSync(path.join(workspace, file), source, "utf8");
  let exitCode = 0;
  try {
    execFileSync(OXLINT_BIN, ["-c", ".oxlintrc.json", file], { cwd: workspace, encoding: "utf8" });
  } catch (error) {
    exitCode = typeof error.status === "number" ? error.status : 1;
  }
  cache.set(name, exitCode);
  return exitCode;
}

test.after(() => {
  if (workspace) rmSync(workspace, { recursive: true, force: true });
});

test("a .ts calling Bun.file() exits non-zero under the repository's oxlint config", () => {
  assert.notEqual(lint("bun-global", BUN_GLOBAL), 0);
});

test("the same source with its Bun reference removed exits zero", () => {
  assert.equal(lint("bun-global-removed", BUN_GLOBAL_REMOVED), 0);
});

test('a .ts importing from "bun:test" exits non-zero under the repository\'s oxlint config', () => {
  assert.notEqual(lint("bun-specifier", BUN_SPECIFIER), 0);
});

test('a .ts reaching Bun through globalThis or require("bun:sqlite") exits zero', () => {
  assert.equal(lint("bun-obfuscated", BUN_OBFUSCATED), 0);
});
