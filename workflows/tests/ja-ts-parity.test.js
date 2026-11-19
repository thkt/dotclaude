// An EN and .ja .ts pair must carry the same body once comments are removed. The comparison
// reads the body itself rather than a line or identifier count: two sets filtered the same way
// agree on their counts while their elements drift (rules/development/TESTING.md § Whether the test swings at nothing).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stripComments } from "../../tests/_comments.ts";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TEST_DIR, "..", "..");
const run = promisify(execFile);
const FIXTURES = join(TEST_DIR, "fixtures", "ja-ts-parity");

const read = (relative) => readFileSync(join(FIXTURES, relative), "utf8");

// Blank lines and surrounding whitespace move as a side effect of removing comments, so they
// stay out of the comparison.
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

// The fixtures above are the algorithm's positive and negative controls. Without this test the
// suite would still pass on the day workflows/_lib/claude-run.ts and its .ja mirror drift apart, since
// nothing else compares a pair the repository actually tracks.
test("every tracked EN and .ja .ts pair matches once comments are removed", async () => {
  // .ts only. MIRROR.md has the .ja side translate prompts and message strings, which are
  // string literals this comparison keeps, so every prompt-carrying .js mirror differs by
  // design: all 9 tracked .js pairs diverge, 210 of the 423 differing lines carrying Japanese.
  // The .ts helpers carry no translated literal, so their bodies do match.
  const { stdout } = await run("git", ["ls-files", ".ja/**/*.ts"], { cwd: ROOT });
  const jaFiles = stdout.split("\n").filter(Boolean);
  assert.ok(jaFiles.length > 0, "the repository tracks at least one .ja .ts file to compare");
  // An orphan is a mirror whose EN side was renamed or deleted. Reading it would throw ENOENT,
  // which reports as an error rather than as the drift it is.
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

// stripComments names these two hazards in its own comment and no fixture reproduced either.
// Replacing its string-literal branch with a plain /\/\/.*$/gm substitution passed every
// fixture that existed, because none carried a '//' inside a string.
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

// A negative control, not a positive one: a pair differing only in comments passes whether or
// not stripComments knows regex literals. Reading `\/` plus the closing delimiter as a line
// comment truncates both sides to `export const PROTOCOL = /https?:\`, which compares equal
// while the EN flag is `g` and the JA flag is `i`.
test("T-020 a regex literal holding an escaped slash keeps its flag and its trailing code", () => {
  const { en, ja } = fixturePair("regex-literal");
  assert.equal(tsBodiesMatch(en, ja), false);
  assert.equal(extractBody(en), String.raw`export const PROTOCOL = /https?:\/\//g;`);
  assert.equal(extractBody(ja), String.raw`export const PROTOCOL = /https?:\/\//i;`);
});

// Splitting the one while loop into per-token readers must not move stripComments's output by a
// single character. The golden input packs the four forms the split has to keep reading alike:
// an unterminated `/*` that runs to end of input, a `/` that opensRegexLiteral correctly reads as
// division rather than a literal, a `/` that opens a regex literal but is cut short by a newline,
// and quotes sitting inside a template literal.
test("T-021 stripComments over the golden input fixture yields exactly the recorded expected text", () => {
  const input = read("strip-golden.input.txt");
  const expected = read("strip-golden.expected.txt");
  assert.equal(stripComments(input), expected);
});
