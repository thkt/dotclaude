// Whether the repository's own `.oxlintrc.json` limits nesting depth for `workflows/*.js`
// scripts, read by running oxlint rather than by reimplementing its rule matching here.
//
// The fixtures are written into a temp directory rather than committed, for the same reason
// oxlint-runtime-discipline.test.js gives: CI runs `npx oxlint` bare at the repository root, so
// a tracked file carrying the violation would keep that step red forever. The config is copied
// from disk so the rule text lives in one place.
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
const OXLINT_BIN = path.join(ROOT, "node_modules", ".bin", "oxlint");
const OXLINTRC = path.join(ROOT, ".oxlintrc.json");

// T-007's positive control: 4 nested `if`s. Written as an arrow function assigned to `const`
// (not a `function` declaration) so the workflows/*.js override's existing `func-style:
// ["error", "expression"]` rule stays silent and depth is the only thing this fixture violates.
// Calibrated against the real `oxlint` binary under the planned `max-depth: ["warn", 3]`
// override (`Blocks are nested too deeply (4). Maximum allowed is 3.`), not computed from the
// rule's description alone.
const FOUR_NESTED_BLOCKS = `export const nested = (a, b, c, d) => {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          return 1;
        }
      }
    }
  }
  return 0;
};
`;

// T-008: FOUR_NESTED_BLOCKS with its innermost `if` removed, per
// docs/wiki/absence-test-positive-control-fixture.md's copy-minus-clue step. The remaining 3
// nested `if`s score depth 3, calibrated the same way (no diagnostic emitted for this fixture
// where FOUR_NESTED_BLOCKS emits one).
const THREE_NESTED_BLOCKS = `export const nested = (a, b, c) => {
  if (a) {
    if (b) {
      if (c) {
        return 1;
      }
    }
  }
  return 0;
};
`;

// oxlint exits non-zero only when a configured rule fires on the given file, so each fixture's
// exit code is what this suite reads. The `max-depth` rule is planned at "warn", so
// `--deny-warnings` is what turns that warning into a non-zero exit; without it every fixture
// here would exit 0 regardless of nesting. One directory serves every case, and each fixture is
// linted once, mirroring oxlint-runtime-discipline.test.js's lint(). The fixture's parent
// directory (workflows/, src/) is created inside the workspace before the write, mirroring
// biome-cognitive-complexity-discipline.test.js's lint().
let workspace;
const cache = new Map();

function lint(name, relativePath, source) {
  if (cache.has(name)) return cache.get(name);
  assert.ok(
    existsSync(OXLINT_BIN),
    `${OXLINT_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  if (!workspace) {
    workspace = mkdtempSync(path.join(tmpdir(), "oxlint-workflow-depth-"));
    copyFileSync(OXLINTRC, path.join(workspace, ".oxlintrc.json"));
  }
  const filePath = path.join(workspace, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, source, "utf8");
  let exitCode = 0;
  try {
    execFileSync(OXLINT_BIN, ["-c", ".oxlintrc.json", "--deny-warnings", relativePath], {
      cwd: workspace,
      encoding: "utf8",
    });
  } catch (error) {
    exitCode = typeof error.status === "number" ? error.status : 1;
  }
  cache.set(name, exitCode);
  return exitCode;
}

test.after(() => {
  if (workspace) rmSync(workspace, { recursive: true, force: true });
});

test("a workflow script nesting four blocks under workflows/ exits non-zero under the repository's .oxlintrc.json with --deny-warnings", () => {
  assert.notEqual(lint("four-nested-workflows", "workflows/four-nested.js", FOUR_NESTED_BLOCKS), 0);
});

test("the same script with three nested blocks exits zero", () => {
  assert.equal(lint("three-nested-workflows", "workflows/three-nested.js", THREE_NESTED_BLOCKS), 0);
});

test("the four-block script placed outside workflows/ exits zero", () => {
  assert.equal(lint("four-nested-src", "src/four-nested.js", FOUR_NESTED_BLOCKS), 0);
});

// T-010 reads .oxlintrc.json directly via JSON.parse instead of going through lint(), mirroring
// biome-cognitive-complexity-discipline.test.js's direct config read: a static read of the
// config is the direct check for a rule's level and its threshold.
const oxlintConfig = JSON.parse(readFileSync(OXLINTRC, "utf8"));

function findWorkflowsOverride(config) {
  return config.overrides.find((override) => override.files.includes("workflows/*.js"));
}

test(".oxlintrc.json keeps max-depth in the workflows override at a level other than off with a limit of at most 3", () => {
  const override = findWorkflowsOverride(oxlintConfig);
  assert.ok(override, "no override in .oxlintrc.json matches workflows/*.js");
  const rule = override.rules["max-depth"];
  assert.ok(rule, "the workflows/*.js override carries no max-depth rule");
  const [level, limit] = rule;
  assert.notEqual(level, "off");
  assert.ok(limit <= 3, `max-depth limit ${limit} exceeds 3`);
});
