// description and whenToUse are prose for whoever decides whether to invoke the workflow, not a
// place to teach the args shape (rules/conventions/WORKFLOWS.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readMeta } from "../run-workflow.ts";
// T-045's own point: this file is `.js`, and the specifier below ends in `.ts`. Node's type
// stripping resolves it the same way it resolves gate.test.ts's `.ts`-to-`.ts` imports; nothing
// in the script evaluation form (rules/conventions/WORKFLOWS.md) constrains module resolution,
// only the vm boundary a workflow script runs inside.
import { runWorkflow } from "../run-workflow.ts";

const here = dirname(fileURLToPath(import.meta.url));

// One entry per <name>.js, in both the English source under workflows/ and its .ja/ mirror.
const workflowTrees = (name) => [
  { label: `${name}/en`, path: join(here, "..", "..", `${name}.js`) },
  { label: `${name}/ja`, path: join(here, "..", "..", "..", ".ja", "workflows", `${name}.js`) },
];

// Each name gets its own test, so a failure names the workflow rather than a file position
// inside a sweep.
const NAMED_WORKFLOWS = ["implement"];

const WORKFLOW_TREE_DIRS = [
  { label: "en", dir: join(here, "..", "..") },
  { label: "ja", dir: join(here, "..", "..", "..", ".ja", "workflows") },
];

// Both fields, not whenToUse alone: rules/conventions/WORKFLOWS.md states the ban over
// description too, and a rule enforced on one field lets the other drift.
const META_PROSE_FIELDS = ["description", "whenToUse"];

for (const name of NAMED_WORKFLOWS) {
  test(`${name}'s meta prose in neither tree contains the identifier args`, () => {
    for (const { label, path } of workflowTrees(name)) {
      const meta = readMeta(path);
      for (const field of META_PROSE_FIELDS) {
        assert.doesNotMatch(
          meta[field],
          /\bargs\b/,
          `[${label}] ${field} names the identifier "args" instead of describing the target in prose`,
        );
      }
    }
  });
}

// Holds the list itself to the tree rather than re-asserting the property: a workflow added
// later fails here until it is named, instead of slipping past unchecked.
test("no meta prose under either tree contains the identifier args", () => {
  for (const { label, dir } of WORKFLOW_TREE_DIRS) {
    const scripts = readdirSync(dir)
      .filter((name) => name.endsWith(".js"))
      .map((name) => name.replace(/\.js$/, ""))
      .sort();
    assert.deepEqual(
      scripts,
      [...NAMED_WORKFLOWS].sort(),
      `[${label}] every workflow carries a named meta-prose test; this tree holds one that does not`,
    );
  }
});

// A .js test resolving a .ts specifier is what every importer under workflows/**/tests relies
// on, and no .ts test can observe it, so it is pinned here.
test("T-045 a .js test importing runWorkflow from run-workflow.ts evaluates a workflow script and returns its result", async () => {
  const dir = mkdtempSync(join(tmpdir(), "meta-contract-ts-import-"));
  const scriptPath = join(dir, "script.js");
  writeFileSync(scriptPath, "return { via: 'run-workflow.ts' };");
  try {
    const { result } = await runWorkflow(scriptPath, {});
    assert.deepEqual(result, { via: "run-workflow.ts" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
