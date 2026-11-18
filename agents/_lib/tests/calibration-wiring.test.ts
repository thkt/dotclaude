import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sides = {
  ja: {
    cal: join(root, ".ja", "agents", "_lib", "calibration"),
    rev: join(root, ".ja", "agents", "reviewers"),
  },
  en: {
    cal: join(root, "agents", "_lib", "calibration"),
    rev: join(root, "agents", "reviewers"),
  },
};

const mdFiles = (dir: string) =>
  readdirSync(dir)
    .filter((f: string) => f.endsWith(".md"))
    .sort();

// Takes the section symbol and the owning reviewer from each file's H1 of the form
// "# CHX (reviewer-resilience)". The filename carries the same symbol.
const sectionsOf = (calDir: string) => {
  const out = new Map();
  for (const file of mdFiles(calDir)) {
    const m = readFileSync(join(calDir, file), "utf8").match(
      /^# ([A-Z0-9]+) \((reviewer-[a-z-]+)\)$/m,
    );
    assert.ok(m, `${file} opens with a section heading`);
    assert.equal(file, `${m[1]}.md`, `${file} is named after its symbol`);
    out.set(m[1], m[2]);
  }
  return out;
};

// The section symbol a reviewer definition references. A reviewer with no Calibration section is
// null.
const refsOf = (revDir: string) => {
  const out = new Map();
  for (const file of mdFiles(revDir)) {
    const doc = readFileSync(join(revDir, file), "utf8");
    const m = doc.match(/calibration\/([A-Z0-9]+)\.md/);
    out.set(file.replace(/\.md$/, ""), m ? m[1] : null);
  }
  return out;
};

// A reviewer whose target disappeared runs silently without calibration. Nothing shows at run
// time, so the two sides are matched here.
test("every section a reviewer references exists", () => {
  for (const [lang, { cal, rev }] of Object.entries(sides)) {
    const sections = sectionsOf(cal);
    for (const [reviewer, ref] of refsOf(rev)) {
      if (ref === null || sections.has(ref)) continue;
      // Absence is allowed only when the reviewer itself defines the uncalibrated behavior.
      const doc = readFileSync(join(rev, `${reviewer}.md`), "utf8");
      assert.match(
        doc,
        /pending_calibration/,
        `${lang}: ${reviewer} references a missing ${ref} and names no fallback`,
      );
    }
  }
});

// A section stays unread when the reviewer side carries no Calibration section. CHX sat in that
// state.
test("every section has a reader", () => {
  for (const [lang, { cal, rev }] of Object.entries(sides)) {
    const used = new Set([...refsOf(rev).values()].filter(Boolean));
    for (const [symbol, owner] of sectionsOf(cal)) {
      assert.ok(used.has(symbol), `${lang}: no reviewer reads ${symbol} (${owner})`);
    }
  }
});

// A heading inside an example that escapes its code fence floats as a top-level heading. The DOC
// section broke this way and the section itself stopped being detectable.
test("every top-level heading is a section heading", () => {
  for (const [lang, { cal }] of Object.entries(sides)) {
    for (const file of mdFiles(cal)) {
      const doc = readFileSync(join(cal, file), "utf8").replace(/^```[a-z]*\n.*?^```/gms, "");
      const strays = [...doc.matchAll(/^# (.+)$/gm)]
        .map((m) => m[1])
        .filter((h) => !/^[A-Z0-9]+ \(reviewer-[a-z-]+\)$/.test(h));
      assert.deepEqual(
        strays,
        [],
        `${lang}: ${file}: something other than a section heading floats`,
      );
    }
  }
});

// Code examples are not translated. Diverging content between ja and en would show different code
// while claiming to give the same calibration.
test("the code examples match between ja and en", () => {
  const blocks = (p: string) => readFileSync(p, "utf8").match(/^```[a-z]*\n[\s\S]*?^```/gm) || [];
  assert.deepEqual(mdFiles(sides.ja.cal), mdFiles(sides.en.cal), "both sides hold the same files");
  for (const file of mdFiles(sides.en.cal)) {
    const ja = blocks(join(sides.ja.cal, file));
    const en = blocks(join(sides.en.cal, file));
    assert.equal(ja.length, en.length, `${file}: the code block counts match`);
    ja.forEach((block: string, i: number) => assert.equal(block, en[i], `${file}: code block ${i + 1} matches`));
  }
});
