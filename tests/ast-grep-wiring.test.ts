import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("settings.json grants Bash(ast-grep *)", async () => {
  const settings = JSON.parse(await readFile(join(root, "settings.json"), "utf8"));
  const allow = settings.permissions.allow;

  assert.ok(allow.includes("Bash(ast-grep *)"), "permissions.allow lists Bash(ast-grep *)");
});

test("rules/development/TOOLS.md carries no paths frontmatter on either side, so it loads in every session", async () => {
  for (const prefix of ["", ".ja"]) {
    const rel = join(prefix, "rules", "development", "TOOLS.md");
    const doc = await readFile(join(root, rel), "utf8");
    assert.ok(!/^paths:/m.test(doc), `${rel} declares no paths: key, so nothing gates its load`);
  }
});
