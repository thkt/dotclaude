/// <reference types="node" />
// agents/_lib/finding-schema.md:13 is the canonical severity enum (docs/wiki/supply-list-single-source.md
// "一覧は実行側の名前付き定数として一箇所に持つ" applied to a copied enum rather than a copied file
// list). Each reviewer definition under agents/reviewers/ used to restate the same enum values in
// its own Output table instead of pointing back at that one line, so a value dropped from one copy
// (reviewer-accessibility.md and reviewer-security.md already lack "low") went unnoticed. These
// tests hold every reviewer definition to a reference-only Severity row instead of a restatement.
//
// The reviewer file list itself is read from agents/reviewers/ at run time (readdirSync), not
// hand-copied as a count or a name list, for the same reason: a reviewer added later must be
// picked up by the scan rather than silently skipped by a stale literal.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const REVIEWERS_DIR = join(REPO_ROOT, "agents", "reviewers");
const SCHEMA_PATH = join(REPO_ROOT, "agents", "_lib", "finding-schema.md");
const SCHEMA_SEVERITY_LINE = 13;

const SEVERITY_WORDS = ["critical", "high", "medium", "low"];

/** Every reviewer definition file, derived from the directory rather than a hand-copied list
 * (docs/wiki/supply-list-single-source.md). */
function reviewerFiles(): string[] {
  return readdirSync(REVIEWERS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => join(REVIEWERS_DIR, name));
}

/** The markdown table row whose first cell names the severity field ("Severity" or
 * "findings[].severity"), or undefined when the file carries none. */
function severityRowLine(content: string): string | undefined {
  return content.split("\n").find((line) => {
    if (!line.trim().startsWith("|")) return false;
    const firstCell = line.split("|")[1]?.trim() ?? "";
    return /severity/i.test(firstCell);
  });
}

/** True when `row` names 2 or more of the canonical severity words, i.e. it restates the enum
 * instead of only pointing at its canonical definition. */
function restatesSeverityValues(row: string): boolean {
  const hits = SEVERITY_WORDS.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(row));
  return hits.length >= 2;
}

/** True when `row` points back at the canonical schema file by path instead of (or in addition
 * to) listing values. */
function referencesCanonicalSchema(row: string): boolean {
  return row.includes("finding-schema.md");
}

test("no reviewer definition restates the severity values, and the same predicate flags a fixture definition that does", () => {
  for (const path of reviewerFiles()) {
    const label = relative(REPO_ROOT, path);
    const row = severityRowLine(readFileSync(path, "utf8"));
    assert.ok(row, `[${label}] no Output-table row names the severity field`);
    assert.equal(
      restatesSeverityValues(row),
      false,
      `[${label}] severity row restates the enum values instead of pointing at ` +
        `agents/_lib/finding-schema.md:${SCHEMA_SEVERITY_LINE}: ${row.trim()}`,
    );
  }

  // Positive control (docs/wiki/absence-test-positive-control-fixture.md): the same predicate
  // must flag a fixture row that still lists the values, so a predicate that always returns
  // false cannot pass the assertions above unnoticed.
  const fixtureRow = "| Severity     | critical / high / medium / low |";
  assert.equal(
    restatesSeverityValues(fixtureRow),
    true,
    "positive control: a severity row literally listing the enum values is detected",
  );
});

test("finding-schema.md carries the enum and every reviewer definition points at it by path", () => {
  const schemaLines = readFileSync(SCHEMA_PATH, "utf8").split("\n");
  const canonicalLine = schemaLines[SCHEMA_SEVERITY_LINE - 1] ?? "";
  assert.match(
    canonicalLine,
    /severity/i,
    `agents/_lib/finding-schema.md:${SCHEMA_SEVERITY_LINE} does not name the severity field`,
  );
  for (const word of SEVERITY_WORDS) {
    assert.match(
      canonicalLine,
      new RegExp(`\\b${word}\\b`, "i"),
      `agents/_lib/finding-schema.md:${SCHEMA_SEVERITY_LINE} does not carry "${word}"`,
    );
  }

  for (const path of reviewerFiles()) {
    const label = relative(REPO_ROOT, path);
    const row = severityRowLine(readFileSync(path, "utf8"));
    assert.ok(row, `[${label}] no Output-table row names the severity field`);
    assert.ok(
      referencesCanonicalSchema(row),
      `[${label}] severity row does not reference finding-schema.md by path: ${row.trim()}`,
    );
  }
});
