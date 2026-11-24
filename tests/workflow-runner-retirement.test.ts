/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedFiles } from "./_retirement.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readTsconfigInclude(): string[] {
  const text = readFileSync(join(REPO_ROOT, "tsconfig.json"), "utf8");
  const block = text.slice(text.indexOf('"include"'));
  const list = block.slice(block.indexOf("["), block.indexOf("]") + 1);
  return JSON.parse(list);
}

function testYmlStep(name: string): string {
  const workflow = readFileSync(join(REPO_ROOT, ".github", "workflows", "test.yml"), "utf8");
  const header = `- name: ${name}`;
  const start = workflow.indexOf(header);
  assert.notEqual(start, -1, `the ${name} step is missing from test.yml`);
  const rest = workflow.slice(start + header.length);
  const end = rest.indexOf("- name:");
  return end === -1 ? rest : rest.slice(0, end);
}

test("no tracked file starts with workflows/ or .ja/workflows/, while tracked files start with skills/ and .ja/skills/", () => {
  const files = trackedFiles(REPO_ROOT);
  assert.ok(files.some((path) => path.startsWith("skills/")), "no tracked file starts with skills/");
  assert.ok(files.some((path) => path.startsWith(".ja/skills/")), "no tracked file starts with .ja/skills/");
  const leftovers = files.filter((path) => path.startsWith("workflows/") || path.startsWith(".ja/workflows/"));
  assert.deepEqual(leftovers, [], `tracked files remain under workflows/: ${leftovers.join(", ")}`);
});

test("tsconfig.json include holds skills/**/*.ts and no entry that starts with workflows/", () => {
  const include = readTsconfigInclude();
  assert.ok(include.includes("skills/**/*.ts"), `include lacks skills/**/*.ts: ${include.join(", ")}`);
  const leftovers = include.filter((entry) => entry.startsWith("workflows/"));
  assert.deepEqual(leftovers, [], `include still names workflows/: ${leftovers.join(", ")}`);
});

test("the Node tests step in test.yml holds the skills/**/tests/*.test.ts glob and no glob that starts with workflows/", () => {
  const globs = [...testYmlStep("Node tests").matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(globs.includes("skills/**/tests/*.test.ts"), `the step lacks skills/**/tests/*.test.ts: ${globs.join(", ")}`);
  const leftovers = globs.filter((glob) => glob.startsWith("workflows/"));
  assert.deepEqual(leftovers, [], `the step still runs globs under workflows/: ${leftovers.join(", ")}`);
});

test("the find in the Python tests step of test.yml searches agents, hooks and skills, in that order", () => {
  const match = testYmlStep("Python tests").match(/\bfind ((?:[\w.-]+ )+)-name/);
  assert.ok(match, "the Python tests step has no find command");
  assert.deepEqual(match[1].trim().split(" "), ["agents", "hooks", "skills"]);
});
