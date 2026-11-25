import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const templates = {
  ja: join(root, ".ja", "skills", "outcome", "templates", "outcome.md"),
  en: join(root, "skills", "outcome", "templates", "outcome.md"),
};
const skills = {
  ja: join(root, ".ja", "skills", "outcome", "SKILL.md"),
  en: join(root, "skills", "outcome", "SKILL.md"),
};
const rules = {
  ja: join(root, ".ja", "rules", "core", "OUTCOME.md"),
  en: join(root, "rules", "core", "OUTCOME.md"),
};

const HEADINGS = [
  /^## Outcome state$/m,
  /^### Behavior$/m,
  /^### Indicators$/m,
  /^## Non-goals$/m,
  /^## Constraints$/m,
];

test("the template headings stay English and match across both languages", () => {
  for (const [lang, path] of Object.entries(templates)) {
    assert.ok(existsSync(path), `${path} exists`);
    const doc = readFileSync(path, "utf8");
    for (const heading of HEADINGS) {
      assert.match(doc, heading, `${lang}: the template carries ${heading}`);
    }
  }
});

const indicatorList = { ja: "Time/Error rate/Value", en: "Time / Error rate / Value" };

test("the Indicators categories match between the template and the rules", () => {
  for (const [lang, path] of Object.entries(rules)) {
    const doc = readFileSync(path, "utf8");
    assert.ok(
      doc.includes(indicatorList[lang]),
      `${lang}: the rules list Time, Error rate, and Value`,
    );
  }
  for (const [lang, path] of Object.entries(templates)) {
    const doc = readFileSync(path, "utf8");
    assert.match(doc, /^\| Time {2,}\|/m, `${lang}: the Time row`);
    assert.match(doc, /^\| Error rate \|/m, `${lang}: the Error rate row`);
    assert.match(doc, /^\| Value {2,}\|/m, `${lang}: the Value row`);
  }
});

test("the emptiness word is TBD across the template and SKILL.md", () => {
  for (const [lang, path] of Object.entries(templates)) {
    const doc = readFileSync(path, "utf8");
    assert.match(doc, /TBD/, `${lang}: the template instructs how to write TBD`);
  }
  const branchRow = {
    ja: /Behavior が空、または TBD のみ\s*\|/,
    en: /Behavior blank, or TBD only\s*\|/,
  };
  for (const [lang, path] of Object.entries(skills)) {
    const doc = readFileSync(path, "utf8");
    assert.match(doc, branchRow[lang], `${lang}: the branch table row routes TBD to generate`);
  }
});

test("SKILL.md branches on validate-outcome.ts and runs it through the validation too", () => {
  for (const [lang, path] of Object.entries(skills)) {
    const doc = readFileSync(path, "utf8");
    assert.match(
      doc,
      /\$\{CLAUDE_SKILL_DIR\}\/scripts\/validate-outcome\.ts \.claude\/OUTCOME\.md/,
      `${lang}: the branch runs the script`,
    );
    assert.match(doc, /^\| absent \|/m, `${lang}: the state absent row`);
    assert.match(doc, /^\| empty {2}\|/m, `${lang}: the state empty row`);
    assert.match(doc, /^\| ok {5}\|/m, `${lang}: the state ok row`);
    assert.match(
      doc,
      /Bash\(\$\{CLAUDE_SKILL_DIR\}\/scripts\/\*\)/,
      `${lang}: allowed-tools grants running the script`,
    );
    assert.doesNotMatch(doc.split("---")[1], /\$HOME|~\//, `${lang}: no hardcoded home path`);
    const validateSteps = doc.match(/validate-outcome\.ts/g) || [];
    assert.ok(
      validateSteps.length >= 3,
      `${lang}: the script runs in all three places: branch, generate, update (actual ${validateSteps.length})`,
    );
  }
});

test("the generate steps name Indicators and the script's placeholder_left", () => {
  for (const [lang, path] of Object.entries(skills)) {
    const doc = readFileSync(path, "utf8");
    const start = doc.search(/^## (Generate|生成)$/m);
    assert.ok(start >= 0, `${lang}: a generate section exists`);
    const rest = doc.slice(start + 1);
    const generate = rest.slice(0, rest.search(/^## /m));
    assert.match(generate, /Indicators/, `${lang}: the generate steps name Indicators`);
    assert.match(generate, /placeholder_left/, `${lang}: the generate steps name the script's placeholder_left`);
  }
});

test("the update flow can add what generate dropped, and reads the indicator warning", () => {
  for (const [lang, path] of Object.entries(skills)) {
    const doc = readFileSync(path, "utf8");
    const update = doc.slice(doc.search(/^## (Update|更新)$/m));
    assert.ok(update, `${lang}: an update section exists`);
    const prose = lang === "ja" ? /冒頭文/ : /opening prose/;
    assert.match(update, prose, `${lang}: the update flow names the opening prose`);
    assert.match(update, /Indicators/, `${lang}: the update flow names Indicators`);
    assert.match(update, /missing_indicator/, `${lang}: a step reads the indicator warning`);
  }
});
