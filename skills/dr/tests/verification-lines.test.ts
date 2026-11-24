/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const JA_CHILD_LINE =
  "  - {確かめた。動かしたか読んだもの、その版と日付、分かったこと | 確かめていない。その理由 | 方針による。どの方針か}";
const EN_CHILD_LINE =
  "  - {Verified. What was run or read, its version and date, and what it showed | Not verified. Why | By policy. Which policy}";

const JA_PROS_AND_CONS_GUIDE =
  "{選ばなかった option ごとに必須。選んだ option は任意。option ごとに以下を繰り返す}";
const EN_PROS_AND_CONS_GUIDE =
  "{Required for each rejected option, optional for the chosen one. Repeat the following per option}";

const JA_DRAFT_SENTENCE =
  "選ばなかった option の `Bad, because` と、`Decision Drivers` の各行の下に、子の行を 1 つ書く。子の行は `確かめた。`、`確かめていない。`、`方針による。` のどれかで始める。確かめる道具は `/dr` を呼んだ session が動かし、`/dr` はその結果を書く。選ばなかった option の子の行に `確かめていない。` が 1 つでもあれば、`status` を `proposed` にし、その行を AskUserQuestion で示す。答えの選択肢は、確かめて書き直すことと、`proposed` のまま進めることの 2 つである";
const EN_DRAFT_SENTENCE =
  "Under each rejected option's `Bad, because` line and each `Decision Drivers` line, write one child line that opens with `Verified.`, `Not verified.`, or `By policy.`. The session that called `/dr` runs any check, and `/dr` writes its result. When a rejected option's child line opens with `Not verified.`, set `status` to `proposed` and show those lines through AskUserQuestion. The two answers it offers are to verify and rewrite, and to go on with `status` left at `proposed`";

const JA_FORMAT_SENTENCE = "。選ばなかった option があれば、その option の節は必須";
const EN_FORMAT_SENTENCE = ". Required for each rejected option";

const SIDES = [
  {
    root: ".ja/skills/dr",
    childLine: JA_CHILD_LINE,
    prosAndConsGuide: JA_PROS_AND_CONS_GUIDE,
    draftSentence: JA_DRAFT_SENTENCE,
    formatSentence: JA_FORMAT_SENTENCE,
  },
  {
    root: "skills/dr",
    childLine: EN_CHILD_LINE,
    prosAndConsGuide: EN_PROS_AND_CONS_GUIDE,
    draftSentence: EN_DRAFT_SENTENCE,
    formatSentence: EN_FORMAT_SENTENCE,
  },
];

function readLines(path: string): string[] {
  return readFileSync(join(REPO_ROOT, path), "utf8").split("\n");
}

function sectionLines(lines: string[], heading: string): string[] {
  const start = lines.indexOf(heading);
  assert.notEqual(start, -1, `heading not found: ${heading}`);
  const level = heading.split(" ")[0];
  const end = lines.findIndex(
    (line, index) => index > start && /^#+ /.test(line) && line.split(" ")[0].length <= level.length,
  );
  return lines.slice(start + 1, end === -1 ? lines.length : end);
}

function linesAfter(section: string[], predicate: (line: string) => boolean): string[] {
  const indexes = section.flatMap((line, index) => (predicate(line) ? [index] : []));
  assert.ok(indexes.length > 0, "no line in the section matched");
  return indexes.map((index) => section[index + 1] ?? "");
}

const templatePath = (root: string) => `${root}/templates/madr-template.md`;
const isTopLevelBullet = (line: string) => line.startsWith("- ");
const isBadBecause = (line: string) => line.startsWith("- Bad, because");

for (const side of SIDES) {
  test(`T-641 in ${templatePath(side.root)}, the line right after each Decision Drivers bullet is the verification child line`, () => {
    const section = sectionLines(readLines(templatePath(side.root)), "## Decision Drivers");
    for (const next of linesAfter(section, isTopLevelBullet)) {
      assert.equal(next, side.childLine);
    }
  });

  test(`T-642 in ${templatePath(side.root)}, the Pros and Cons guide line requires rejected options and the line right after its Bad, because line is the verification child line`, () => {
    const section = sectionLines(readLines(templatePath(side.root)), "## Pros and Cons of the Options");
    assert.ok(section.includes(side.prosAndConsGuide), `guide line missing: ${side.prosAndConsGuide}`);
    for (const next of linesAfter(section, isBadBecause)) {
      assert.equal(next, side.childLine);
    }
  });

  test(`T-643 in ${templatePath(side.root)}, the line right after the Consequences Bad, because line is not a child line`, () => {
    const section = sectionLines(readLines(templatePath(side.root)), "### Consequences");
    for (const next of linesAfter(section, isBadBecause)) {
      assert.ok(!next.startsWith("  - "), `unexpected child line under Consequences: ${next}`);
    }
  });

  test(`T-644 in ${side.root}/SKILL.md, the Draft row of the process table carries the verification-line sentence`, () => {
    const draftRow = readLines(`${side.root}/SKILL.md`).find((line) => line.startsWith("| 4    | Draft     |"));
    assert.ok(draftRow, "Draft row not found");
    assert.ok(draftRow.includes(side.draftSentence), `Draft row lacks: ${side.draftSentence}`);
  });

  test(`T-645 in ${side.root}/references/madr-format.md, the Pros and Cons of the Options row states that rejected options require the section`, () => {
    const row = readLines(`${side.root}/references/madr-format.md`).find((line) =>
      line.startsWith("| Pros and Cons of the Options |"),
    );
    assert.ok(row, "Pros and Cons of the Options row not found");
    assert.ok(row.includes(side.formatSentence), `row lacks: ${side.formatSentence}`);
  });
}
