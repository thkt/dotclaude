import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";

const ADAPTER = resolve(import.meta.dirname, "../harness/scripts/capture/capture.ts");
const runAdapter = (argv: string[]) => spawnSync("bun", argv, { encoding: "utf8" });

test("the vendored capture adapter loads its imports and rejects a missing argument with exit 1", () => {
  const run = runAdapter([ADAPTER]);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Usage: bun scripts\/capture\/capture\.ts SPEC CONFIG ABSOLUTE_OUTPUT/);
});

test("the vendored capture adapter rejects a relative output path", () => {
  const run = runAdapter([ADAPTER, "spec", "config", "out"]);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Usage:/);
});
