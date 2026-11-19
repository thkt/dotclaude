import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);

// Do not add full-width punctuation: quoted data a test matches against keeps its original language.
const JAPANESE = /[぀-ゟ゠-ヿ一-龯]/;

const trackedTests = async () => {
  const { stdout } = await run("git", ["ls-files", "*.test.js", "*.test.ts"], { cwd: root });
  return stdout.split("\n").filter((p) => p.trim() && !p.startsWith(".ja/"));
};

const REGISTRATION = /^\s*(?:test|it|describe)(?:\.\w+)?\(\s*(["'`])((?:[^\\]|\\.)*?)\1/gm;
export const testNames = (source: string) => [...source.matchAll(REGISTRATION)].map((m) => m[2]);

test("no test on the English side is named in Japanese", async () => {
  const offenders = [];
  for (const path of await trackedTests()) {
    const source = await readFile(join(root, path), "utf8");
    for (const name of testNames(source)) {
      if (JAPANESE.test(name)) offenders.push(`${path} :: ${name}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `MIRROR.md keeps test names English outside .ja/. Rename these:\n${offenders.join("\n")}`,
  );
});

test("testNames reads every registration form, not just a double-quoted test()", () => {
  const source = [
    'test("double quoted", () => {});',
    "test('single quoted', () => {});",
    'test.skip("skipped", () => {});',
    "test.only('only', () => {});",
    "test.todo(`todo`, () => {});",
    "it('it form', () => {});",
    'describe("describe form", () => {});',
    '  test("indented", () => {});',
  ].join("\n");
  assert.deepEqual(testNames(source).sort(), [
    "describe form",
    "double quoted",
    "indented",
    "it form",
    "only",
    "single quoted",
    "skipped",
    "todo",
  ]);
});
