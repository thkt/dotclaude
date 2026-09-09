// SKILLS.md § H1 settles the two forms. Nothing enforced them, and the use-context-* /
// use-workflow-* skills drifted to free-form titles while use-cli-* held (#79 #80 #81 #83 #84
// #86 #89).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ja", "en"];
const at = (lang: string, ...parts: string[]) =>
  join(root, ...(lang === "ja" ? [".ja"] : []), ...parts);

// user-invocable defaults to true, so only an explicit false makes a skill a wrapper.
const isWrapper = (doc: string) => /^user-invocable:\s*false\s*$/m.test(doc);
const h1Of = (doc: string) => (doc.match(/^# (.+)$/m) || [])[1] || "";

const skillDocs = async (lang: string) => {
  const dir = at(lang, "skills");
  const names = (await readdir(dir, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name);
  const out: { name: string; doc: string }[] = [];
  for (const name of names) {
    try {
      out.push({ name, doc: await readFile(join(dir, name, "SKILL.md"), "utf8") });
    } catch {
      // A directory with no SKILL.md is not a skill; the naming rules do not reach it.
    }
  }
  return out;
};

const offendersWhere = async (
  select: (doc: string) => boolean,
  holds: (h1: string, name: string) => boolean,
) => {
  const out: string[] = [];
  for (const lang of LANGS) {
    for (const { name, doc } of await skillDocs(lang)) {
      if (!select(doc)) continue;
      const h1 = h1Of(doc);
      if (!holds(h1, name)) out.push(`${lang}: ${name} -> "${h1}"`);
    }
  }
  return out;
};

test("a wrapper skill's H1 is its own name", async () => {
  const offenders = await offendersWhere(isWrapper, (h1: string, name: string) => h1 === name);
  assert.deepEqual(offenders, [], `a wrapper's H1 is its bare name:\n${offenders.join("\n")}`);
});

test("a user-invocable skill's H1 opens with its slash command", async () => {
  const offenders = await offendersWhere(
    (doc: string) => !isWrapper(doc),
    (h1: string, name: string) => h1.startsWith(`/${name}`),
  );
  assert.deepEqual(
    offenders,
    [],
    `a user-invocable skill's H1 opens with a slash and its name:\n${offenders.join("\n")}`,
  );
});
