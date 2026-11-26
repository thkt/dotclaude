import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const read = (relativePath: string): string => readFileSync(join(ROOT, relativePath), "utf8");

test("the CI runs the package.json test script, and docs/SPEC.md names that script", () => {
  assert.match(read(".github/workflows/test.yml"), /^\s*run: bun run test$/m);
  const packageJson = JSON.parse(read("package.json")) as { scripts?: { test?: string } };
  assert.ok(packageJson.scripts?.test?.startsWith("bun test "), "package.json scripts.test does not start with `bun test `");
  assert.ok(read("docs/SPEC.md").includes("`bun run test`"), "docs/SPEC.md does not name `bun run test`");
});
