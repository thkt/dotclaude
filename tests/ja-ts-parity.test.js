import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stripComments } from "./_comments.ts";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TEST_DIR, "..");
const run = promisify(execFile);
const FIXTURES = join(TEST_DIR, "fixtures", "ja-ts-parity");

const read = (relative) => readFileSync(join(FIXTURES, relative), "utf8");

function extractBody(source) {
  return stripComments(source)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function tsBodiesMatch(enSource, jaSource) {
  return extractBody(enSource) === extractBody(jaSource);
}

function fixturePair(scenario) {
  return {
    en: read(join(scenario, "sample.ts")),
    ja: read(join(scenario, ".ja", "sample.ts")),
  };
}

test("T-003 an EN and .ja .ts pair differing only in comments is judged identical", () => {
  const { en, ja } = fixturePair("comment-only");
  assert.equal(tsBodiesMatch(en, ja), true);
});

test("T-004 a pair whose identifier differs is judged divergent", () => {
  const { en, ja } = fixturePair("identifier-diff");
  assert.equal(tsBodiesMatch(en, ja), false);
});

test("T-005 a pair with one extra statement on the EN side is judged divergent", () => {
  const { en, ja } = fixturePair("extra-statement");
  assert.equal(tsBodiesMatch(en, ja), false);
});

test("every tracked .ja .ts file has its EN counterpart and matches it once comments are removed", async () => {
  const { stdout } = await run("git", ["ls-files", ".ja/**/*.ts"], { cwd: ROOT });
  const jaFiles = stdout.split("\n").filter(Boolean);
  assert.ok(jaFiles.length > 0, "the repository tracks at least one .ja .ts file to compare");
  const orphans = jaFiles.filter(
    (jaPath) => !existsSync(join(ROOT, jaPath.replace(/^\.ja\//, ""))),
  );
  assert.deepEqual(orphans, [], "these .ja mirrors have no EN counterpart");
  const diverged = jaFiles.filter((jaPath) => {
    const enPath = jaPath.replace(/^\.ja\//, "");
    return !tsBodiesMatch(
      readFileSync(join(ROOT, enPath), "utf8"),
      readFileSync(join(ROOT, jaPath), "utf8"),
    );
  });
  assert.deepEqual(diverged, [], "these .ja mirrors differ from their EN side outside comments");
});

test("T-018 a // inside a string literal survives comment removal", () => {
  const { en, ja } = fixturePair("url-in-string");
  assert.equal(tsBodiesMatch(en, ja), true);
  assert.match(extractBody(en), /http:\/\/example\.com\/v1/, "the URL is still in the body");
});

test("T-019 a comment-shaped literal inside a template interpolation survives", () => {
  const { en, ja } = fixturePair("comment-in-template");
  assert.equal(tsBodiesMatch(en, ja), true);
  assert.match(extractBody(en), /not a comment/, "the interpolated literal is still in the body");
});

test("T-020 a regex literal holding an escaped slash keeps its flag and its trailing code", () => {
  const { en, ja } = fixturePair("regex-literal");
  assert.equal(tsBodiesMatch(en, ja), false);
  assert.equal(extractBody(en), String.raw`export const PROTOCOL = /https?:\/\//g;`);
  assert.equal(extractBody(ja), String.raw`export const PROTOCOL = /https?:\/\//i;`);
});

test("T-021 stripComments over the golden input fixture yields exactly the recorded expected text", () => {
  const input = read("strip-golden.input.txt");
  const expected = read("strip-golden.expected.txt");
  assert.equal(stripComments(input), expected);
});
