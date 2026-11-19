import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readMeta } from "../run-workflow.ts";
import { runWorkflow } from "../run-workflow.ts";

const here = dirname(fileURLToPath(import.meta.url));

const workflowTrees = (name) => [
  { label: `${name}/en`, path: join(here, "..", "..", `${name}.js`) },
  { label: `${name}/ja`, path: join(here, "..", "..", "..", ".ja", "workflows", `${name}.js`) },
];

const NAMED_WORKFLOWS = ["implement"];

const WORKFLOW_TREE_DIRS = [
  { label: "en", dir: join(here, "..", "..") },
  { label: "ja", dir: join(here, "..", "..", "..", ".ja", "workflows") },
];

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

test("every workflow script under either tree is in the list whose meta prose is checked for the identifier args", () => {
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
