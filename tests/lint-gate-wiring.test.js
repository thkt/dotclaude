import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const BIOME_BIN = path.join(ROOT, "node_modules", ".bin", "biome");
const OXLINT_BIN = path.join(ROOT, "node_modules", ".bin", "oxlint");
const TEST_YML = path.join(ROOT, ".github", "workflows", "test.yml");

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

test("T-015 test.yml runs biome lint with --reporter=github in a step after an oxlint step that passes --format=github", () => {
  const source = readFileSync(TEST_YML, "utf8");
  const oxlint = source.search(/^\s+run: npx oxlint --format=github\s*$/m);
  const biome = source.search(/^\s+run: npx biome lint --reporter=github\s*$/m);
  assert.notEqual(oxlint, -1, "test.yml carries no `run: npx oxlint --format=github` step");
  assert.notEqual(biome, -1, "test.yml carries no `run: npx biome lint --reporter=github` step");
  assert.ok(biome > oxlint, "the biome step comes before the oxlint step");
});

test("T-016 biome lint run bare from the repository root exits zero", () => {
  assert.equal(runFromRoot(BIOME_BIN, ["lint"]), 0);
});

test("T-017 oxlint run bare from the repository root exits zero", () => {
  assert.equal(runFromRoot(OXLINT_BIN, []), 0);
});

test("T-018 no tracked .js or .ts file is hidden from Biome by .gitignore", () => {
  const ignoredTracked = execFileSync("git", ["ls-files", "-z", "-i", "-c", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter((file) => /\.(js|mjs|cjs|jsx|ts|mts|cts|tsx)$/.test(file));
  assert.deepEqual(ignoredTracked, []);
});

const BIOME_JSON = path.join(ROOT, "biome.json");
const OXLINTRC = path.join(ROOT, ".oxlintrc.json");

function nestingRuleLevels() {
  const biomeConfig = JSON.parse(readFileSync(BIOME_JSON, "utf8"));
  const oxlintConfig = JSON.parse(readFileSync(OXLINTRC, "utf8"));
  const override = oxlintConfig.overrides.find((entry) => entry.files.includes("workflows/*.js"));
  assert.ok(override, "no override in .oxlintrc.json matches workflows/*.js");
  return {
    biome: biomeConfig.linter.rules.complexity.noExcessiveCognitiveComplexity.level,
    oxlint: override.rules["max-depth"][0],
  };
}

test("T-024 biome.json and .oxlintrc.json both hold their nesting rule at error", () => {
  assert.deepEqual(nestingRuleLevels(), { biome: "error", oxlint: "error" });
});
