import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("bunfig.toml keeps bun's packages inside node_modules, so textlint's loader finds the rule packages from an install in a new worktree", async () => {
  const lines = (await readFile(join(root, "bunfig.toml"), "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  assert.deepEqual(lines, ["[install]", "globalStore = false"]);
});
