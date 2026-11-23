import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const BIOME_BIN = path.join(ROOT, "node_modules", ".bin", "biome");
const BIOME_JSON = path.join(ROOT, "biome.json");

const COMPLEXITY_16 = `export function nested(a, b, c, d, e, f) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          if (e) {
            return 1;
          }
        }
      }
    }
  }
  if (f) {
    return 2;
  }
  return 0;
}
`;

const COMPLEXITY_15 = `export function nested(a, b, c, d, e) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          if (e) {
            return 1;
          }
        }
      }
    }
  }
  return 0;
}
`;

const TOP_LEVEL_RETURN_SCRIPT = `if (typeof shouldSkip === "undefined") {
  return;
}
console.log("done");
`;

let workspace;
const cache = new Map();

function lint(name, relativePath, source) {
  if (cache.has(name)) return cache.get(name);
  assert.ok(
    existsSync(BIOME_BIN),
    `${BIOME_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  if (!workspace) {
    workspace = mkdtempSync(path.join(tmpdir(), "biome-cognitive-complexity-"));
    copyFileSync(BIOME_JSON, path.join(workspace, "biome.json"));
  }
  const filePath = path.join(workspace, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, source, "utf8");
  let exitCode = 0;
  let output = "";
  try {
    output = execFileSync(
      BIOME_BIN,
      ["lint", "--vcs-enabled=false", "--reporter=github", relativePath],
      { cwd: workspace, encoding: "utf8" },
    );
  } catch (error) {
    exitCode = typeof error.status === "number" ? error.status : 1;
    output = typeof error.stdout === "string" ? error.stdout : "";
  }
  const result = { exitCode, output };
  cache.set(name, result);
  return result;
}

test.after(() => {
  if (workspace) rmSync(workspace, { recursive: true, force: true });
});

test("T-001 a function with cognitive complexity 16 exits non-zero under the repository's biome.json", () => {
  const { exitCode } = lint("complexity-16", "workflows/complexity-16.ts", COMPLEXITY_16);
  assert.notEqual(exitCode, 0);
});

test("T-002 the same function flattened to complexity 15 exits zero", () => {
  const { exitCode } = lint("complexity-15", "workflows/complexity-15.ts", COMPLEXITY_15);
  assert.equal(exitCode, 0);
});

test("T-003 a script with a top-level return placed under workflows/ yields no parse diagnostic", () => {
  const { output } = lint(
    "top-level-return-workflows",
    "workflows/top-level-return.js",
    TOP_LEVEL_RETURN_SCRIPT,
  );
  assert.ok(!output.includes("title=parse"), `expected no parse diagnostic, got: ${output}`);
});

test("T-004 the same script placed under src/ yields a parse diagnostic", () => {
  const { output } = lint(
    "top-level-return-src",
    "src/top-level-return.js",
    TOP_LEVEL_RETURN_SCRIPT,
  );
  assert.ok(output.includes("title=parse"), `expected a parse diagnostic, got: ${output}`);
});

const biomeConfig = JSON.parse(readFileSync(BIOME_JSON, "utf8"));

const PLANNED_FILES_INCLUDES = [
  "**",
  "!workflows/*.js",
  "!.ja/workflows/*.js",
  "!plugins/**",
  "!bridge-spawn",
  "!seed-admin",
];

function biomeHoles(config) {
  const holes = [];
  const rule = config.linter?.rules?.complexity?.noExcessiveCognitiveComplexity;
  if (config.linter?.enabled === false) holes.push("linter.enabled is false");
  if (Object.hasOwn(config.linter ?? {}, "includes")) holes.push("linter.includes is set");
  if (!rule || rule.level !== "error") holes.push("rule level is not error");
  if (!(rule?.options?.maxAllowedComplexity <= 15)) holes.push("maxAllowedComplexity exceeds 15");
  if (Object.hasOwn(config, "overrides")) holes.push("overrides is set");
  return holes;
}

test("T-005 biome.json keeps noExcessiveCognitiveComplexity at error with maxAllowedComplexity at most 15", () => {
  const rule = biomeConfig.linter.rules.complexity.noExcessiveCognitiveComplexity;
  assert.equal(rule.level, "error", `level is ${rule.level}`);
  assert.ok(
    rule.options.maxAllowedComplexity <= 15,
    `maxAllowedComplexity ${rule.options.maxAllowedComplexity} exceeds 15`,
  );
});

test("T-006 biome.json's files.includes equals the six planned entries exactly and the file carries no overrides key", () => {
  assert.deepEqual(biomeConfig.files.includes, PLANNED_FILES_INCLUDES);
  assert.ok(!Object.hasOwn(biomeConfig, "overrides"), "biome.json carries an overrides key");
});

test("T-019 biome.json opens none of the holes the config check names", () => {
  assert.deepEqual(biomeHoles(biomeConfig), []);
});

const BIOME_MUTATIONS = [
  ["linter.enabled is false", (c) => (c.linter.enabled = false)],
  ["linter.includes is set", (c) => (c.linter.includes = ["**", "!hooks/**"])],
  [
    "rule level is not error",
    (c) => (c.linter.rules.complexity.noExcessiveCognitiveComplexity.level = "warn"),
  ],
  [
    "maxAllowedComplexity exceeds 15",
    (c) =>
      (c.linter.rules.complexity.noExcessiveCognitiveComplexity.options.maxAllowedComplexity = 16),
  ],
  [
    "overrides is set",
    (c) => (c.overrides = [{ includes: ["hooks/**"], linter: { enabled: false } }]),
  ],
];

test("T-020 each biome.json mutation that hides files or silences the rule is named by the config check", () => {
  for (const [hole, mutate] of BIOME_MUTATIONS) {
    const copy = structuredClone(biomeConfig);
    mutate(copy);
    assert.deepEqual(biomeHoles(copy), [hole]);
  }
});
