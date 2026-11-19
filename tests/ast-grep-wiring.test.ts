import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("settings.json grants ast-grep in the space form every other entry in permissions.allow uses, sorted between agy and bfs", async () => {
  const settings = JSON.parse(await readFile(join(root, "settings.json"), "utf8"));
  const allow = settings.permissions.allow;

  assert.ok(allow.includes("Bash(ast-grep *)"), "permissions.allow lists Bash(ast-grep *)");

  const spaceForm = /^Bash\(([\w-]+) \*\)$/;
  const names: string[] = [];
  for (const entry of allow as string[]) {
    const m = spaceForm.exec(entry);
    if (m) names.push(m[1]);
  }
  const i = names.indexOf("ast-grep");
  assert.ok(i > 0, `ast-grep is present among the space-form Bash entries: ${names.join(", ")}`);
  assert.equal(names[i - 1], "agy", "ast-grep sorts right after agy");
  assert.equal(names[i + 1], "bfs", "ast-grep sorts right before bfs");
});

test("rules/development/TOOLS.md carries no paths frontmatter on either side, so it loads in every session", async () => {
  for (const prefix of ["", ".ja"]) {
    const rel = join(prefix, "rules", "development", "TOOLS.md");
    const doc = await readFile(join(root, rel), "utf8");
    assert.ok(!/^paths:/m.test(doc), `${rel} declares no paths: key, so nothing gates its load`);
  }
});
