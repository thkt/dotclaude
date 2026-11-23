import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWorkflow } from "../run-workflow.ts";

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
