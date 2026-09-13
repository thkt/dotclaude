// Whether the repository's own `biome.json` both catches an over-complex function and leaves
// a workflow script's top-level `return` alone, read by running biome rather than by
// reimplementing its cognitive-complexity count or its parser's module/script decision here.
//
// The fixtures are written into a temp directory rather than committed, for the same reason
// oxlint-runtime-discipline.test.js gives: a tracked file carrying the violation would keep the
// repository's own `npx biome lint` step red forever, and `files.includes` in the copied
// config decides what gets linted at all, so the fixture's path under the temp workspace has to
// mirror the real directory names (`workflows/`, `src/`) the config's globs match against. The
// config is copied from disk so the threshold and the includes list live in one place.
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

// T-001's positive control: 5 nested `if`s (cognitive complexity 1+2+3+4+5 = 15, one point per
// nesting level) plus one more `if` at nesting level 0 (+1, no nesting bonus) = 16. Calibrated
// against the real `biome` binary (`Excessive complexity of 16 detected (max: 15)`), not
// computed from the rule's description alone.
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

// T-002: COMPLEXITY_16 with only the flat trailing `if (f)` removed, per
// docs/wiki/absence-test-positive-control-fixture.md's copy-minus-clue step. The remaining 5
// nested `if`s alone score 15, calibrated the same way (no diagnostic emitted for this fixture
// where COMPLEXITY_16 emits one).
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

// T-003/T-004's shared script: a bare top-level `return` guarding an early exit, the same shape
// `workflows/adrift.js` itself uses at its own top level (that file is run as a script body by
// the harness, not parsed as a standalone module). Placed under `workflows/` it must stay free
// of a parse diagnostic; placed under `src/` (standing in for anywhere the harness does not run
// a file as a script body) the identical source is expected to surface one, which is what proves
// T-003's silence is a workflows-specific accommodation rather than the fixture being harmless
// everywhere.
const TOP_LEVEL_RETURN_SCRIPT = `if (typeof shouldSkip === "undefined") {
  return;
}
console.log("done");
`;

// biome exits non-zero both when a configured rule fires and when a real parse error occurs, so
// most fixtures here are told apart by exit code alone, mirroring
// oxlint-runtime-discipline.test.js's lint(). T-003/T-004 need one more distinction biome's exit
// code cannot make on its own: it also exits 1 for "No files were processed" (a path the
// config's `files.includes` does not match), which is a different failure than a parse error but
// has the identical exit code. `--reporter=github` prints a `title=parse` annotation line only
// for an actual parse error, so lint() caches each fixture's stdout alongside its exit code and
// T-003/T-004 read that instead of the exit code. This return-shape difference from
// oxlint-runtime-discipline.test.js's lint() is the deviation named in the plan.
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

test("a function with cognitive complexity 16 exits non-zero under the repository's biome.json with --error-on-warnings", () => {
  const { exitCode } = lint("complexity-16", "workflows/complexity-16.ts", COMPLEXITY_16);
  assert.notEqual(exitCode, 0);
});

test("the same function flattened to complexity 15 exits zero", () => {
  const { exitCode } = lint("complexity-15", "workflows/complexity-15.ts", COMPLEXITY_15);
  assert.equal(exitCode, 0);
});

test("a script with a top-level return placed under workflows/ yields no parse diagnostic", () => {
  const { output } = lint(
    "top-level-return-workflows",
    "workflows/top-level-return.js",
    TOP_LEVEL_RETURN_SCRIPT,
  );
  assert.ok(!output.includes("title=parse"), `expected no parse diagnostic, got: ${output}`);
});

test("the same script placed under src/ yields a parse diagnostic", () => {
  const { output } = lint(
    "top-level-return-src",
    "src/top-level-return.js",
    TOP_LEVEL_RETURN_SCRIPT,
  );
  assert.ok(output.includes("title=parse"), `expected a parse diagnostic, got: ${output}`);
});

// T-005/T-006 read biome.json directly via JSON.parse instead of going through lint(): the
// contract (docs/wiki/count-comparison-masks-filtered-set-drift.md) calls for comparing
// files.includes as the set of five literal entries with assert.deepEqual rather than a count,
// so there is no lint run whose output would answer that; a static read of the config is the
// direct check for a rule's level, its threshold, and the absence of an `overrides` key too.
const biomeConfig = JSON.parse(readFileSync(BIOME_JSON, "utf8"));

// The five entries the config is expected to lint, held here as a literal list so this test's
// own copy cannot drift toward whatever files.includes currently contains.
const PLANNED_FILES_INCLUDES = [
  "hooks/**/*.ts",
  "skills/**/*.ts",
  "workflows/**/*.ts",
  "tests/**/*.ts",
  "agents/**/*.ts",
];

test("biome.json keeps noExcessiveCognitiveComplexity at a level other than off with maxAllowedComplexity at most 15", () => {
  const rule = biomeConfig.linter.rules.complexity.noExcessiveCognitiveComplexity;
  assert.notEqual(rule.level, "off");
  assert.ok(
    rule.options.maxAllowedComplexity <= 15,
    `maxAllowedComplexity ${rule.options.maxAllowedComplexity} exceeds 15`,
  );
});

test("biome.json's files.includes equals the five planned entries exactly and the file carries no overrides key", () => {
  assert.deepEqual(biomeConfig.files.includes, PLANNED_FILES_INCLUDES);
  assert.ok(!Object.hasOwn(biomeConfig, "overrides"), "biome.json carries an overrides key");
});
