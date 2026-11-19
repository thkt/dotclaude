import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const decisions = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "decisions");

test("no two decision records share a number", async () => {
  const seen = new Map();
  const collisions = [];
  for (const entry of await readdir(decisions)) {
    const number = entry.match(/^(\d{4})-.+\.md$/)?.[1];
    if (!number) continue;
    if (seen.has(number)) collisions.push(`${number}: ${seen.get(number)} / ${entry}`);
    seen.set(number, entry);
  }
  assert.ok(seen.size >= 50, `the decision records are readable (${seen.size})`);
  assert.deepEqual(collisions, [], "every number belongs to one file");
});

test("no record's first heading claims a number its filename does not carry", async () => {
  const mismatched = [];
  for (const entry of await readdir(decisions)) {
    const number = entry.match(/^(\d{4})-.+\.md$/)?.[1];
    if (!number) continue;
    const body = await readFile(join(decisions, entry), "utf8");
    const title = body.split("\n").find((line) => line.startsWith("# "));
    const claimed = title?.match(/\b(?:A?DR)-(\d{4})\b/)?.[1];
    if (claimed && claimed !== number) mismatched.push(`${entry} says ${claimed}`);
  }
  assert.deepEqual(mismatched, [], "every title agrees with its filename");
});
