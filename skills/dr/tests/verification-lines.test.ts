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
    childLine:
      "  - {確かめた。動かしたか読んだもの、その版と日付、分かったこと | 確かめていない。その理由 | 方針による。どの方針か}",
    prosAndConsGuide: "{選ばなかった option ごとに必須。選んだ option は任意。option ごとに以下を繰り返す}",
    notVerifiedWord: "`確かめていない。`",
  },
  {
    root: "skills/dr",
    childLine:
      "  - {Verified. What was run or read, its version and date, and what it showed | Not verified. Why | By policy. Which policy}",
    prosAndConsGuide:
      "{Required for each rejected option, optional for the chosen one. Repeat the following per option}",
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

for (const side of SIDES) {
  const template = readLines(`${side.root}/templates/madr-template.md`);

  test(`${side.root} template puts the verification child line right under each Decision Drivers bullet`, () => {
    for (const next of linesAfter(sectionLines(template, "## Decision Drivers"), "- ")) {
      assert.equal(next, side.childLine);
    }
  });

  test(`${side.root} template requires Pros and Cons for rejected options and puts the child line right under each Bad, because`, () => {
    const section = sectionLines(template, "## Pros and Cons of the Options");
    assert.ok(section.includes(side.prosAndConsGuide));
    for (const next of linesAfter(section, "- Bad, because")) {
      assert.equal(next, side.childLine);
    }
  });

  test(`${side.root} template puts no child line under the Consequences Bad, because`, () => {
    for (const next of linesAfter(sectionLines(template, "### Consequences"), "- Bad, because")) {
      assert.ok(!next.startsWith("  - "), next);
    }
  });

  test(`${side.root} SKILL.md Draft row names the not-verified opener, proposed status, and AskUserQuestion`, () => {
    const draftRow = readLines(`${side.root}/SKILL.md`).find((line) => line.startsWith("| 4    | Draft     |"));
    assert.ok(draftRow);
    for (const word of [side.notVerifiedWord, "`proposed`", "AskUserQuestion"]) {
      assert.ok(draftRow.includes(word), word);
    }
  });
}
