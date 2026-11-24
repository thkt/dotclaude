/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_READING_CUES = [
  "select the relevant decision records",
  "related decision records",
  "Reassessment Triggers and judge",
  "Whoever proposes removing or merging existing structure reads",
  "関連する決定記録を選ぶ",
  "関連する判断記録",
  "Reassessment Triggers を読み",
  "既存構造の削除や統合を提案する側が",
];

function asksToReadDecisionRecords(content: string): boolean {
  return RETIRED_READING_CUES.some((cue) => content.includes(cue));
}

test("the predicate flags a line carrying each retired decision-record reading cue and misses the same line without it", () => {
  for (const cue of RETIRED_READING_CUES) {
    assertDetectsAndMisses(asksToReadDecisionRecords, cue);
  }
});

test("no tracked file outside docs/decisions/ and docs/research/ asks to read decision records at task entry, and the scan reaches the rules and skills that once did", () => {
  const files = trackedFiles(REPO_ROOT);
  assert.ok(files.includes("rules/conventions/DOCUMENTS.md"));
  assert.ok(files.includes("skills/scoping/SKILL.md"));

  const offenders = offendersAmong(
    files,
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    asksToReadDecisionRecords,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still asking to read decision records at task entry: ${offenders.join(", ")}`,
  );
});

test("git tracks no file under docs/decisions/ while it still tracks files under docs/", () => {
  const files = trackedFiles(REPO_ROOT);
  assert.ok(files.some((path) => path.startsWith("docs/")));
  const records = files.filter((path) => path.startsWith("docs/decisions/"));
  assert.deepEqual(records, [], `tracked files under docs/decisions/: ${records.join(", ")}`);
});

function linksToDecisions(content: string): boolean {
  return /\]\([^)]*decisions\//.test(content);
}

test("no tracked Markdown file outside docs/research/ links to a decisions/ path, and the predicate flags a DR link while missing the bare DR number", () => {
  assert.equal(linksToDecisions("[DR-0001](decisions/0001-x.md)"), true);
  assert.equal(linksToDecisions("DR-0001"), false);

  const markdown = trackedFiles(REPO_ROOT).filter((path) => path.endsWith(".md"));
  const offenders = offendersAmong(
    markdown,
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    linksToDecisions,
  );
  assert.deepEqual(offenders, [], `files still linking to decisions/: ${offenders.join(", ")}`);
});
