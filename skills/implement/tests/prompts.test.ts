/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  captureFailedPrompt,
  commitMessageOf,
  continuePrompt,
  independentOpening,
  promptFor,
  repairPrompt,
  rereadPrompt,
  resumePrompt,
  reviewPrompt,
  selfOpening,
} from "../scripts/prompts.ts";

const ISSUE = 7;
const BASE = "b".repeat(40);
const ONTO = "c".repeat(40);
const GATE = "/gate/done_gate.ts";
const TEXT = { title: "[Feature] Add it's flag", body: "Body." };
const COMMIT = { onto: ONTO, message: commitMessageOf(ISSUE, TEXT.title) };

const changingPrompts: [string, string][] = [
  ["implement", promptFor(ISSUE, "o/r", TEXT, COMMIT, GATE)],
  ["resume", resumePrompt(ISSUE, "o/r", TEXT, BASE, COMMIT, GATE)],
  ["repair", repairPrompt(ISSUE, BASE, "{}", COMMIT, GATE)],
  ["reread", rereadPrompt(ISSUE, "o/r", TEXT, BASE, COMMIT, GATE)],
  ["continue", continuePrompt(ISSUE, "o/r", BASE, COMMIT, GATE)],
  [
    "capture",
    captureFailedPrompt({ issue: ISSUE, repository: "o/r", base: BASE, commit: COMMIT, doneGate: GATE, how: "with exit code 1", logTail: "", command: "[]" }),
  ],
];

test("the commit message is the Issue title followed by the Issue number", () => {
  assert.equal(commitMessageOf(12, "Title"), "Title (#12)");
});

for (const [name, prompt] of changingPrompts) {
  test(`the ${name} prompt has the session commit with the Issue title when HEAD is the commit to build on, and amend otherwise`, () => {
    assert.ok(prompt.includes("`git add -A`"), prompt);
    assert.ok(prompt.includes(`\`git commit -m '[Feature] Add it'\\''s flag (#${ISSUE})'\` when \`git rev-parse HEAD\` prints \`${ONTO}\``), prompt);
    assert.ok(prompt.includes("`git commit --amend --no-edit` otherwise"), prompt);
    assert.ok(prompt.includes("do not use `git -C`"), prompt);
    assert.ok(prompt.includes("When a hook stops the commit, read its output, fix the cause, and run the commit again."), prompt);
  });

  test(`the ${name} prompt still forbids push and pull requests and no longer forbids the commit`, () => {
    assert.ok(prompt.includes("Do not push or open a pull request."), prompt);
    assert.ok(!prompt.includes("Do not commit"), prompt);
  });

  test(`the ${name} prompt places the commit before the done_gate check`, () => {
    assert.ok(prompt.indexOf("git commit -m") < prompt.indexOf(`\`${GATE} check\``), prompt);
  });
}

test("the self-review and independent-review prompts forbid the commit and carry no commit command", () => {
  for (const opening of [selfOpening(ISSUE, BASE), independentOpening(ISSUE, "o/r", TEXT, BASE)]) {
    const prompt = reviewPrompt(opening, [], [], []);
    assert.ok(prompt.includes("Do not commit."), prompt);
    assert.ok(!prompt.includes("git commit"), prompt);
  }
});
