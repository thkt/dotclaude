// Whether the repository's `biome.json` flags an over-complex function and leaves a workflow
// script's top-level `return` alone, read by running biome rather than by reimplementing its
// complexity count or its parser's module/script decision. Fixtures live in a temp directory
// (a tracked violation would keep the CI biome step red forever) under the real directory
// names the config's `files.includes` globs match. The config is copied from disk.
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
const ROOT = path.resolve(TEST_DIR, "..", "..");
const BIOME_BIN = path.join(ROOT, "node_modules", ".bin", "biome");
const BIOME_JSON = path.join(ROOT, "biome.json");

// T-001's positive control: 5 nested `if`s (1+2+3+4+5 = 15) plus one flat `if` = 16, as the
// real biome binary reports it (`Excessive complexity of 16 detected (max: 15)`).
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

// T-002: COMPLEXITY_16 minus the flat `if (f)`, per the copy-minus-clue step of
// docs/wiki/absence-test-positive-control-fixture.md. Scores 15, no diagnostic.
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

// T-003/T-004's shared script: a bare top-level `return`, the shape workflows/adrift.js uses
// (the harness runs it as a function body). Under `workflows/` biome must skip it; under `src/`
// the same source must raise a parse diagnostic, which proves the skip is path-specific.
const TOP_LEVEL_RETURN_SCRIPT = `if (typeof shouldSkip === "undefined") {
  return;
}
console.log("done");
`;

// Exit code tells most fixtures apart, as in oxlint-runtime-discipline.test.js. Biome also
// exits 1 for "No files were processed" (a path `files.includes` excludes), the same code as a
// parse error, so lint() keeps the `--reporter=github` stdout too: only a real parse error
// prints a `title=parse` line, and T-003/T-004 read that.
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
      ["lint", "--vcs-enabled=false", "--error-on-warnings", "--reporter=github", relativePath],
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

test("T-001 a function with cognitive complexity 16 exits non-zero under the repository's biome.json with --error-on-warnings", () => {
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

// T-005/T-006 read biome.json itself: the rule's level, its threshold, the exact
// `files.includes` (compared as a list, not a count, per
// docs/wiki/count-comparison-masks-filtered-set-drift.md), and the absence of `overrides`.
const biomeConfig = JSON.parse(readFileSync(BIOME_JSON, "utf8"));

// Held as a literal so this copy cannot drift toward whatever files.includes contains.
const PLANNED_FILES_INCLUDES = [
  "**",
  "!workflows/*.js",
  "!.ja/workflows/*.js",
  "!plugins/**",
  "!skills/*/test/cases/**",
];

// Every way a biome.json edit can stop the rule from reaching the tracked tree, as a list of
// names so the positive controls below can say which hole a mutation opened. Each entry was
// confirmed against biome 2.5.12 to skip files or silence the rule: `linter.enabled: false`
// lints nothing, `linter.includes` excludes paths just as `files.includes` does, an `overrides`
// entry can turn the linter off per path, and `level: "info"` reports as a notice that
// `--error-on-warnings` never fails on.
function biomeHoles(config) {
  const holes = [];
  const rule = config.linter?.rules?.complexity?.noExcessiveCognitiveComplexity;
  if (config.linter?.enabled === false) holes.push("linter.enabled is false");
  if (Object.hasOwn(config.linter ?? {}, "includes")) holes.push("linter.includes is set");
  if (!rule || !["warn", "error"].includes(rule.level))
    holes.push("rule level is not warn or error");
  if (!(rule?.options?.maxAllowedComplexity <= 15)) holes.push("maxAllowedComplexity exceeds 15");
  if (Object.hasOwn(config, "overrides")) holes.push("overrides is set");
  return holes;
}

test("T-005 biome.json keeps noExcessiveCognitiveComplexity at warn or error with maxAllowedComplexity at most 15", () => {
  const rule = biomeConfig.linter.rules.complexity.noExcessiveCognitiveComplexity;
  assert.ok(["warn", "error"].includes(rule.level), `level is ${rule.level}`);
  assert.ok(
    rule.options.maxAllowedComplexity <= 15,
    `maxAllowedComplexity ${rule.options.maxAllowedComplexity} exceeds 15`,
  );
});

test("T-006 biome.json's files.includes equals the five planned entries exactly and the file carries no overrides key", () => {
  assert.deepEqual(biomeConfig.files.includes, PLANNED_FILES_INCLUDES);
  assert.ok(!Object.hasOwn(biomeConfig, "overrides"), "biome.json carries an overrides key");
});

test("T-019 biome.json opens none of the holes the config check names", () => {
  assert.deepEqual(biomeHoles(biomeConfig), []);
});

// T-020's positive controls: one mutation per hole, applied to a copy of the committed config.
// A mutation the check does not name would leave this list short of the holes it claims to cover.
const BIOME_MUTATIONS = [
  ["linter.enabled is false", (c) => (c.linter.enabled = false)],
  ["linter.includes is set", (c) => (c.linter.includes = ["**", "!hooks/**"])],
  [
    "rule level is not warn or error",
    (c) => (c.linter.rules.complexity.noExcessiveCognitiveComplexity.level = "info"),
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
