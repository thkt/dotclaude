// Whether the two nesting checks reach CI and the whole tracked tree: test.yml invokes both
// linters with GitHub annotation output, each runs clean from the repository root under the
// committed config, and `.gitignore` hides no lintable tracked file (`vcs.useIgnoreFile` makes
// biome skip whatever git ignores). test.yml is read as text: package.json carries no YAML
// parser, and both commands are literal `run:` lines.
//
// #710 raised both nesting rules to error, so T-016 and T-017 now carry all the checks
// T-019 to T-023 used to verify with --deny-warnings / --error-on-warnings flags.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..", "..");
const BIOME_BIN = path.join(ROOT, "node_modules", ".bin", "biome");
const OXLINT_BIN = path.join(ROOT, "node_modules", ".bin", "oxlint");
const TEST_YML = path.join(ROOT, ".github", "workflows", "test.yml");

// Exit code of `bin args` run from the repository root. Both linters exit 0 when all findings
// pass their configured level (now error after #710), so a non-zero here means a config error,
// a parse error, or an error-level finding.
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

// T-024 reads both config files directly: #710 raised both nesting rules to "error", so the
// bare runs T-016/T-017 already assert now carry what T-019 to T-023's `--deny-warnings` /
// `--error-on-warnings` flags used to add on top. This is the one place that pins both configs'
// level in the same assertion, across the biome/oxlint split DR-0118 chose.
test("T-024 biome.json and .oxlintrc.json both hold their nesting rule at error", () => {
  const biomeConfig = JSON.parse(readFileSync(BIOME_JSON, "utf8"));
  const biomeLevel = biomeConfig.linter.rules.complexity.noExcessiveCognitiveComplexity.level;
  assert.equal(
    biomeLevel,
    "error",
    `biome.json's noExcessiveCognitiveComplexity level is ${biomeLevel}`,
  );

  const oxlintConfig = JSON.parse(readFileSync(OXLINTRC, "utf8"));
  const override = oxlintConfig.overrides.find((entry) => entry.files.includes("workflows/*.js"));
  assert.ok(override, "no override in .oxlintrc.json matches workflows/*.js");
  const [oxlintLevel] = override.rules["max-depth"];
  assert.equal(oxlintLevel, "error", `.oxlintrc.json's max-depth level is ${oxlintLevel}`);
});
