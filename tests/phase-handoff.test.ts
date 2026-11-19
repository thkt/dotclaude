import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, ".ja", "skills");

const CONTROL_ONLY = new Map<string, string>();

const phaseSections = (doc: string) => {
  const parts = doc.split(/^## (Phase \d+[^\n]*)$/m);
  const out = new Map();
  for (let i = 1; i < parts.length; i += 2) {
    out.set(Number(parts[i].match(/Phase (\d+)/)![1]), parts[i + 1]);
  }
  return out;
};

const key = (name: string, from: number, to: number) => `${name} ${from}->${to}`;

const crossReferences = async () => {
  const names = (await readdir(skillsDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name);
  const refs = [];
  for (const name of names) {
    let doc;
    try {
      doc = await readFile(join(skillsDir, name, "SKILL.md"), "utf8");
    } catch {
      continue;
    }
    for (const [from, body] of phaseSections(doc)) {
      for (const m of body.matchAll(/Phase (\d+)/g)) {
        const to = Number(m[1]);
        if (to !== from) refs.push({ name, from, to });
      }
    }
  }
  return { refs, pairs: new Set(refs.map((r) => key(r.name, r.from, r.to))) };
};

test("a Phase in a canonical .ja skill that hands something forward is named back by the Phase that receives it", async () => {
  const { refs, pairs } = await crossReferences();
  const unanswered = [
    ...new Set(
      refs
        .filter((r) => r.to > r.from && !pairs.has(key(r.name, r.to, r.from)))
        .map((r) => key(r.name, r.from, r.to))
        .filter((k) => !CONTROL_ONLY.has(k)),
    ),
  ].sort();
  assert.deepEqual(
    unanswered,
    [],
    `a forward reference with no landing point. Write the source into the receiving Phase, or add it to CONTROL_ONLY with the reason:\n${unanswered.join("\n")}`,
  );
});

test("every CONTROL_ONLY entry still names a forward reference that exists", async () => {
  const { pairs } = await crossReferences();
  const stale = [...CONTROL_ONLY.keys()].filter((k) => !pairs.has(k)).sort();
  assert.deepEqual(
    stale,
    [],
    `CONTROL_ONLY holds entries that no longer occur:\n${stale.join("\n")}`,
  );
});
