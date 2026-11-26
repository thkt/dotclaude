import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const TSC_BIN = path.join(ROOT, "node_modules", ".bin", "tsc");
const TSCONFIG = path.join(ROOT, "tsconfig.json");
const TESTS_FIXTURE = "tests/fixtures/tsconfig-scope-fixture.ts";

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

let cached;
function listTypeCheckedFiles() {
  if (cached) return cached;
  assert.ok(
    existsSync(TSC_BIN),
    `${TSC_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  const output = execFileSync(TSC_BIN, ["-p", TSCONFIG, "--listFilesOnly"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  cached = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix)
    .filter((file) => !file.includes("/node_modules/"));
  return cached;
}

test("the type-check set contains every tracked .ts under the tests directory whose path has no directory that starts with a dot, compared as a set of names against git ls-files", () => {
  const checkedNames = new Set(
    listTypeCheckedFiles().map((file) => toPosix(path.relative(ROOT, file))),
  );
  const tracked = execFileSync("git", ["ls-files", "tests/*.ts"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((name) => !name.split("/").some((segment) => segment.startsWith(".")));
  assert.ok(
    tracked.includes(TESTS_FIXTURE),
    `${TESTS_FIXTURE} is not tracked by git, so this test proves nothing`,
  );
  for (const name of tracked) {
    assert.ok(checkedNames.has(name), `${name} is tracked but missing from the type-check set`);
  }
});

test("the package.json test script that CI runs carries ./tests", () => {
  const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.ok(packageJson.scripts.test.split(" ").includes("./tests"));
});
