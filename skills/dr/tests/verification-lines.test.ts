/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const SIDES = [
  {
    root: ".ja/skills/dr",
    openerClause: { from: "子の行は", to: "のどれかで始める" },
    prosAndConsMarker: "必須",
    notVerifiedWord: "`確かめていない。`",
  },
  {
    root: "skills/dr",
    openerClause: { from: "opens with", to: "`. " },
    prosAndConsMarker: "Required",
    notVerifiedWord: "`Not verified.`",
  },
];

function readLines(path: string): string[] {
  return readFileSync(join(REPO_ROOT, path), "utf8").split("\n");
}

function sectionLines(lines: string[], heading: string): string[] {
  const start = lines.indexOf(heading);
  assert.notEqual(start, -1, `heading not found: ${heading}`);
  const depth = heading.indexOf(" ");
  const end = lines.findIndex((line, i) => i > start && /^#+ /.test(line) && line.indexOf(" ") <= depth);
  return lines.slice(start + 1, end === -1 ? lines.length : end);
}

function linesAfter(section: string[], prefix: string): string[] {
  const next = section.flatMap((line, i) => (line.startsWith(prefix) ? [section[i + 1] ?? ""] : []));
  assert.ok(next.length > 0, `no line starts with ${prefix}`);
  return next;
}

function draftRow(root: string): string {
  const row = readLines(`${root}/SKILL.md`).find((line) => line.startsWith("| 4    | Draft     |"));
  assert.ok(row, `${root}: SKILL.md has a Draft row`);
  return row;
}

function childLineOpeners(row: string, clause: { from: string; to: string }): string[] {
  const start = row.indexOf(clause.from);
  assert.notEqual(start, -1, `Draft row lacks ${clause.from}`);
  const end = row.indexOf(clause.to, start);
  assert.notEqual(end, -1, `Draft row lacks ${clause.to} after ${clause.from}`);
  return [...row.slice(start, end + 1).matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

function assertChildLine(next: string, openers: string[]): void {
  assert.ok(next.startsWith("  - {"), next);
  for (const opener of openers) {
    assert.ok(next.includes(opener), `${opener} missing from ${next}`);
  }
}

for (const side of SIDES) {
  const template = readLines(`${side.root}/templates/madr-template.md`);
  const openers = childLineOpeners(draftRow(side.root), side.openerClause);

  test(`${side.root} SKILL.md Draft row lists three child-line openers`, () => {
    assert.equal(openers.length, 3, openers.join(" / "));
  });

  test(`${side.root} template puts the verification child line right under each Decision Drivers bullet`, () => {
    for (const next of linesAfter(sectionLines(template, "## Decision Drivers"), "- ")) {
      assertChildLine(next, openers);
    }
  });

  test(`${side.root} template requires Pros and Cons for rejected options and puts the child line right under each Bad, because`, () => {
    const section = sectionLines(template, "## Pros and Cons of the Options");
    assert.ok(section.some((line) => line.startsWith("{") && line.includes(side.prosAndConsMarker)));
    for (const next of linesAfter(section, "- Bad, because")) {
      assertChildLine(next, openers);
    }
  });

  test(`${side.root} template puts no child line under the Consequences Bad, because`, () => {
    for (const next of linesAfter(sectionLines(template, "### Consequences"), "- Bad, because")) {
      assert.ok(!next.startsWith("  - "), next);
    }
  });

  test(`${side.root} SKILL.md Draft row names the not-verified opener, proposed status, and AskUserQuestion`, () => {
    const row = draftRow(side.root);
    for (const word of [side.notVerifiedWord, "`proposed`", "AskUserQuestion"]) {
      assert.ok(row.includes(word), word);
    }
  });
}
