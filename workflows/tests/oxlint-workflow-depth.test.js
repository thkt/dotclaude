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

// `max-depth` sits at "warn", so `--deny-warnings` is what turns a hit into a non-zero exit.
// The fixture's parent directory (workflows/, src/) is what the override's glob matches against.
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

test("T-007 a workflow script nesting four blocks under workflows/ exits non-zero under the repository's .oxlintrc.json with --deny-warnings", () => {
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

test("T-010 .oxlintrc.json keeps max-depth in the workflows override at a level other than off with a limit of at most 3", () => {
  const override = findWorkflowsOverride(oxlintConfig);
  assert.ok(override, "no override in .oxlintrc.json matches workflows/*.js");
  const rule = override.rules["max-depth"];
  assert.ok(rule, "the workflows/*.js override carries no max-depth rule");
  const [level, limit] = rule;
  assert.notEqual(level, "off");
  assert.ok(limit <= 3, `max-depth limit ${limit} exceeds 3`);
});
