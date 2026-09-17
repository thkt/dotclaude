// Whether the repository's `.oxlintrc.json` limits nesting depth for `workflows/*.js`, read by
// running oxlint rather than by reimplementing its rule matching. Fixtures live in a temp
// directory (a tracked violation would keep the CI oxlint step red forever); the config is
// copied from disk.
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

// T-007's positive control: 4 nested `if`s in an arrow function assigned to `const`, so the
// override's `func-style: ["error", "expression"]` stays silent and depth is the only violation.
// The real binary reports `Blocks are nested too deeply (4). Maximum allowed is 3.`
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

// T-008: FOUR_NESTED_BLOCKS minus the innermost `if`, per the copy-minus-clue step of
// docs/wiki/absence-test-positive-control-fixture.md. Depth 3, no diagnostic.
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

// `max-depth` sits at "error" in the workflows override, so a hit exits non-zero on its own;
// no `--deny-warnings` flag is needed. The fixture's parent directory (workflows/, src/) is what
// the override's glob matches against.
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
    execFileSync(OXLINT_BIN, ["-c", ".oxlintrc.json", relativePath], {
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

test("T-007 a workflow script nesting four blocks under workflows/ exits non-zero under the repository's .oxlintrc.json", () => {
  assert.notEqual(lint("four-nested-workflows", "workflows/four-nested.js", FOUR_NESTED_BLOCKS), 0);
});

test("T-008 the same script with three nested blocks exits zero", () => {
  assert.equal(lint("three-nested-workflows", "workflows/three-nested.js", THREE_NESTED_BLOCKS), 0);
});

test("T-009 the four-block script placed outside workflows/ exits zero", () => {
  assert.equal(lint("four-nested-src", "src/four-nested.js", FOUR_NESTED_BLOCKS), 0);
});

// T-010 reads .oxlintrc.json itself for the rule's level and limit.
const oxlintConfig = JSON.parse(readFileSync(OXLINTRC, "utf8"));

function findWorkflowsOverride(config) {
  return config.overrides.find((override) => override.files.includes("workflows/*.js"));
}

test("T-010 .oxlintrc.json keeps max-depth in the workflows override at error with a limit of at most 3", () => {
  const override = findWorkflowsOverride(oxlintConfig);
  assert.ok(override, "no override in .oxlintrc.json matches workflows/*.js");
  const rule = override.rules["max-depth"];
  assert.ok(rule, "the workflows/*.js override carries no max-depth rule");
  const [level, limit] = rule;
  assert.equal(level, "error", `level is ${level}`);
  assert.ok(limit <= 3, `max-depth limit ${limit} exceeds 3`);
});

// The paths the override must keep naming, and the ignore list as committed. `ignorePatterns`
// wins over an override, so an entry added there drops the workflow scripts out of every rule
// without touching the override T-010 reads; the list is compared as content, not as a count.
const WORKFLOW_SCRIPT_GLOBS = ["workflows/*.js", ".ja/workflows/*.js"];
const PLANNED_IGNORE_PATTERNS = ["plugins/**", "node_modules/**", "skills/*/test/cases/**"];

function oxlintHoles(config) {
  const holes = [];
  if (!(config.ignorePatterns ?? []).every((p) => PLANNED_IGNORE_PATTERNS.includes(p))) {
    holes.push("ignorePatterns carries an entry beyond the planned three");
  }
  const override = findWorkflowsOverride(config);
  if (!override || !WORKFLOW_SCRIPT_GLOBS.every((g) => override.files.includes(g))) {
    holes.push("the workflows override no longer names both workflow script globs");
  }
  return holes;
}

test("T-021 .oxlintrc.json's ignorePatterns and workflows override keep the workflow scripts inside max-depth's reach", () => {
  assert.deepEqual(oxlintHoles(oxlintConfig), []);
});

// T-022's positive controls, one per hole, applied to a copy of the committed config.
const OXLINT_MUTATIONS = [
  [
    "ignorePatterns carries an entry beyond the planned three",
    (c) => c.ignorePatterns.push("workflows/**"),
  ],
  [
    "the workflows override no longer names both workflow script globs",
    (c) => (findWorkflowsOverride(c).files = ["workflows/*.js"]),
  ],
];

test("T-022 each .oxlintrc.json mutation that pulls the workflow scripts out of reach is named by the config check", () => {
  for (const [hole, mutate] of OXLINT_MUTATIONS) {
    const copy = structuredClone(oxlintConfig);
    mutate(copy);
    assert.deepEqual(oxlintHoles(copy), [hole]);
  }
});
