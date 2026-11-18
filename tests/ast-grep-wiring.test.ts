// The ast-grep introduction is reachable only while two pieces stay wired: settings.json grants
// Bash(ast-grep *), and rules/development/TOOLS.md loads in every session to send a search by
// shape to the command. Each piece can break on its own with nothing reported at run time, so
// each has its own test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("settings.json grants ast-grep in the space form every other entry in permissions.allow uses", async () => {
  const settings = JSON.parse(await readFile(join(root, "settings.json"), "utf8"));
  const allow = settings.permissions.allow;

  assert.ok(allow.includes("Bash(ast-grep *)"), "permissions.allow lists Bash(ast-grep *)");

  // The tail of permissions.allow (agent-browser, agy, bfs, cargo, ...) is kept alphabetical.
  // ast-grep sorts between the existing, currently-adjacent agy and bfs entries.
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
