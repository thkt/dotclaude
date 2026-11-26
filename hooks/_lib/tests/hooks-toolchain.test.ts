/// <reference types="node" />
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../shebang_scope.ts";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const TSC_BIN = path.join(ROOT, "node_modules", ".bin", "tsc");
const TSCONFIG = path.join(ROOT, "tsconfig.json");
const OXLINT_BIN = path.join(ROOT, "node_modules", ".bin", "oxlint");

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

let typeCheckedFiles: string[] | undefined;
function listTypeCheckedFiles(): string[] {
  if (typeCheckedFiles) return typeCheckedFiles;
  assert.ok(
    existsSync(TSC_BIN),
    `${TSC_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  const output = execFileSync(TSC_BIN, ["-p", TSCONFIG, "--listFilesOnly"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  typeCheckedFiles = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix)
    .filter((file) => !file.includes("/node_modules/"));
  return typeCheckedFiles;
}

let oxlintFiles: string[] | undefined;
function listOxlintFiles(): string[] {
  if (oxlintFiles) return oxlintFiles;
  assert.ok(
    existsSync(OXLINT_BIN),
    `${OXLINT_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  const output = execFileSync(OXLINT_BIN, ["--debug=files", "."], {
    cwd: ROOT,
    encoding: "utf8",
  });
  oxlintFiles = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix);
  return oxlintFiles;
}

test("the package.json test script that CI runs carries ./hooks", () => {
  const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as { scripts: { test: string } };
  assert.ok(packageJson.scripts.test.split(" ").includes("./hooks"));
});

let hooksTsFiles: string[] | undefined;
function listHooksTsFiles(): string[] {
  hooksTsFiles ??= trackedEntries("hooks/*.ts")
    .map(([, absolutePath]) => toPosix(path.relative(ROOT, absolutePath)))
    .sort();
  return hooksTsFiles;
}

test("neither .oxlintrc.json's ignorePatterns nor tsconfig.json's exclude drops hooks/", () => {
  assert.ok(listHooksTsFiles().length > 0, "the derived hooks/*.ts set is empty");
  const oxlintSet = listOxlintFiles();
  const tscSet = listTypeCheckedFiles();
  for (const file of listHooksTsFiles()) {
    assert.ok(
      oxlintSet.some((entry) => entry.endsWith(file)),
      `oxlint's ignorePatterns dropped ${file}`,
    );
    assert.ok(
      tscSet.some((entry) => entry.endsWith(file)),
      `tsconfig's exclude (or a missing include) dropped ${file}`,
    );
  }
});
