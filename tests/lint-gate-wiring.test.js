import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const BIOME_BIN = path.join(ROOT, "node_modules", ".bin", "biome");
const OXLINT_BIN = path.join(ROOT, "node_modules", ".bin", "oxlint");

function runFromRoot(bin, args) {
  assert.ok(
    existsSync(bin),
    `${bin} is missing: run the repository's install step (bun install) before this suite`,
  );
  try {
    execFileSync(bin, args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return 0;
  } catch (error) {
    return typeof error.status === "number" ? error.status : 1;
  }
}

test("biome lint run bare from the repository root exits zero", () => {
  assert.equal(runFromRoot(BIOME_BIN, ["lint"]), 0);
});

test("oxlint run bare from the repository root exits zero", () => {
  assert.equal(runFromRoot(OXLINT_BIN, []), 0);
});

test("no tracked .js or .ts file is hidden from Biome by .gitignore", () => {
  const ignoredTracked = execFileSync("git", ["ls-files", "-z", "-i", "-c", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter((file) => /\.(js|mjs|cjs|jsx|ts|mts|cts|tsx)$/.test(file));
  assert.deepEqual(ignoredTracked, []);
});
