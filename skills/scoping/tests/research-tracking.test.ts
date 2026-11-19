/// <reference types="node" />
// Pins the .gitignore rules DR-0119 sets for research reports: a report written directly under
// docs/research/ (or a legacy research root) is tracked, while a non-Markdown file there and a
// file in a subdirectory stay ignored, and .claude/workspace/planning/ stays ignored. /scoping's
// find-prior-research.ts reads only the *.md files of those roots, so a tracked non-Markdown file
// would be published without ever being searched.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");

/** git check-ignore's exit code for a repository-relative path: 0 when ignored, 1 when not.
 * check-ignore needs no file on disk, so the CI checkout's missing directories do not matter. */
function checkIgnore(path: string): number | null {
  return spawnSync("git", ["-C", REPO_ROOT, "check-ignore", path], { encoding: "utf8" }).status;
}

test("T-001 git check-ignore exits nonzero for a markdown file under .claude/workspace/research", () => {
  const target = ".claude/workspace/research/sample.md";
  assert.equal(checkIgnore(target), 1, `${target} is still git-ignored`);
});

test("a non-markdown file under .claude/workspace/research stays ignored", () => {
  const target = ".claude/workspace/research/scratch.json";
  assert.equal(checkIgnore(target), 0, `${target} is not git-ignored`);
});

test("T-535 git check-ignore exits nonzero for a markdown file directly under docs/research", () => {
  const target = "docs/research/sample.md";
  assert.equal(checkIgnore(target), 1, `${target} is git-ignored`);
});

test("T-536 git check-ignore keeps ignoring a non-markdown file under docs/research", () => {
  const target = "docs/research/scratch.json";
  assert.equal(checkIgnore(target), 0, `${target} is not git-ignored`);
});

test("T-537 git check-ignore keeps ignoring a markdown file in a subdirectory of docs/research", () => {
  // A report's working notes live beside it in a subdirectory and stay unpublished.
  const target = "docs/research/sub/notes.md";
  assert.equal(checkIgnore(target), 0, `${target} is not git-ignored`);
});

test("T-002 git check-ignore keeps ignoring a file under .claude/workspace/planning", () => {
  const target = ".claude/workspace/planning/sample.md";
  assert.equal(checkIgnore(target), 0, `${target} is no longer git-ignored`);
});
