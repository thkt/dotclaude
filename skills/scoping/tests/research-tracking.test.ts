/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");

function checkIgnore(path: string): number | null {
  return spawnSync("git", ["-C", REPO_ROOT, "check-ignore", path], { encoding: "utf8" }).status;
}

test("git check-ignore exits nonzero for a markdown file under .claude/workspace/research", () => {
  const target = ".claude/workspace/research/sample.md";
  assert.equal(checkIgnore(target), 1, `${target} is still git-ignored`);
});

test("a non-markdown file under .claude/workspace/research stays ignored", () => {
  const target = ".claude/workspace/research/scratch.json";
  assert.equal(checkIgnore(target), 0, `${target} is not git-ignored`);
});

test("git check-ignore exits nonzero for a markdown file directly under docs/research", () => {
  const target = "docs/research/sample.md";
  assert.equal(checkIgnore(target), 1, `${target} is git-ignored`);
});

test("git check-ignore keeps ignoring a non-markdown file under docs/research", () => {
  const target = "docs/research/scratch.json";
  assert.equal(checkIgnore(target), 0, `${target} is not git-ignored`);
});

test("git check-ignore keeps ignoring a markdown file in a subdirectory of docs/research", () => {
  const target = "docs/research/sub/notes.md";
  assert.equal(checkIgnore(target), 0, `${target} is not git-ignored`);
});

test("git check-ignore keeps ignoring a file under .claude/workspace/planning", () => {
  const target = ".claude/workspace/planning/sample.md";
  assert.equal(checkIgnore(target), 0, `${target} is no longer git-ignored`);
});
