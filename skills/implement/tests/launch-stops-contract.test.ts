import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

const scripts = join(root, "skills", "implement", "scripts");
const sources = readdirSync(scripts)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => readFileSync(join(scripts, name), "utf8"));
const tables = {
  ja: read(".ja", "skills", "implement", "references", "launch-stops.md"),
  en: read("skills", "implement", "references", "launch-stops.md"),
};

const NOT_REASONS = [
  "rev-parse",
  "symbolic-ref",
  "ls-tree",
  "rev-list",
  "ls-remote",
  "diff-tree",
  "launch-holders",
  "stream-json",
  "check-ignore",
];
const UNHYPHENATED_REASONS = ["busy", "disagreement"];

const extractReasons = (): string[] => {
  const found = new Set<string>();
  for (const source of sources) {
    for (const [, value] of source.matchAll(/"([a-z][a-z-]*[a-z])"/g)) {
      if (value.includes("-") && !NOT_REASONS.includes(value)) found.add(value);
    }
  }
  for (const reason of UNHYPHENATED_REASONS) found.add(reason);
  return [...found];
};

const tableRows = (markdown: string): string[][] =>
  markdown
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|")[1] ?? "")
    .map((cell) => [...cell.matchAll(/`([^`]+)`/g)].map(([, name]) => name))
    .filter((names) => names.length > 0);

const sorted = (values: Iterable<string>) => [...values].sort();

for (const [language, markdown] of Object.entries(tables)) {
  test(`the ${language} table's first column names exactly the reasons the scripts under skills/implement/scripts can return`, () => {
    assert.deepEqual(sorted(tableRows(markdown).flat()), sorted(extractReasons()));
  });

  test(`the ${language} table names no reason twice`, () => {
    const names = tableRows(markdown).flat();
    const repeated = names.filter((name, index) => names.indexOf(name) !== index);
    assert.deepEqual(repeated, []);
  });

  test(`the ${language} launch-stops.md stays within the 100-line reference limit`, () => {
    const lines = markdown.endsWith("\n") ? markdown.slice(0, -1).split("\n") : markdown.split("\n");
    assert.ok(lines.length <= 100, `${lines.length} lines`);
  });
}

test("the ja and en tables list the same reasons in the same rows and the same order", () => {
  assert.deepEqual(tableRows(tables.en), tableRows(tables.ja));
});

test("the extraction reaches reasons written in each of the forms the scripts use", () => {
  const reasons = extractReasons();
  for (const known of [
    "uncommitted-start-inputs",
    "holder-write-failed",
    "media-unattached",
    "push-failed",
    "no-progress",
    "not-captured",
    "capture-media-ignored",
  ]) {
    assert.ok(reasons.includes(known), `the extraction misses ${known}`);
  }
});

test("each unhyphenated reason appears as a double-quoted literal in a script", () => {
  for (const reason of UNHYPHENATED_REASONS) {
    assert.ok(
      sources.some((source) => source.includes(`"${reason}"`)),
      `"${reason}" is in no script`,
    );
  }
});

test("the extraction finds 69 reasons, 67 hyphenated plus busy and disagreement", () => {
  const reasons = extractReasons();
  assert.equal(reasons.length, 69);
  assert.equal(reasons.filter((reason) => reason.includes("-")).length, 67);
});

test("every name on the not-a-reason list appears as a double-quoted literal in a script", () => {
  for (const name of NOT_REASONS) {
    assert.ok(
      sources.some((source) => source.includes(`"${name}"`)),
      `"${name}" is in no script`,
    );
  }
});
