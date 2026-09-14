// An EN and .ja .ts pair must carry the same body once comments are removed. The comparison
// reads the body itself rather than a line or identifier count: two sets filtered the same way
// agree on their counts while their elements drift (docs/wiki/count-comparison-masks-filtered-set-drift.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TEST_DIR, "..", "..");
const run = promisify(execFile);
const FIXTURES = join(TEST_DIR, "fixtures", "ja-ts-parity");

const read = (relative) => readFileSync(join(FIXTURES, relative), "utf8");

// A `/` opens a regex literal only where a value may start. After an identifier, a digit, or a
// closing `)` `]` `}` it is the division operator, and consuming `a / b / c` as a literal would
// swallow the code between the two slashes.
const CLOSES_A_VALUE = /[\w$)\]}]/;

// The scan reads what stripComments has emitted, so a comment sitting between the previous token
// and the `/` is already gone. No `.ts` in the compared set puts a regex after a keyword
// (`return /re/`, `typeof /re/`), where the last character is a letter and this reads division,
// so the keyword list that case would need is left out.
function opensRegexLiteral(emitted) {
  for (let k = emitted.length - 1; k >= 0; k--) {
    const ch = emitted[k];
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") continue;
    return !CLOSES_A_VALUE.test(ch);
  }
  return true;
}

// The index right after a `//`…newline run. Nothing from it survives into the output.
function skipLineComment(source, i, n) {
  while (i < n && source[i] !== "\n") i++;
  return i;
}

// The index right after a `/*`…`*/` run. Nothing from it survives into the output.
function skipBlockComment(source, i, n) {
  i += 2;
  while (i < n && source.slice(i, i + 2) !== "*/") i++;
  return i + 2;
}

// `/https?:\/\//g` ends in an escaped slash followed by the delimiter. Emitting the opening
// `/` and reading on character by character would meet that pair as `//` and drop the flag
// and the rest of the line, so the literal is consumed here in one piece. Inside a `[...]`
// class a `/` does not close the literal.
function consumeRegexLiteral(source, i, n) {
  let text = "/";
  i++;
  let inCharClass = false;
  while (i < n && source[i] !== "\n") {
    const c = source[i];
    if (c === "\\") {
      text += c + (source[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (c === "[") inCharClass = true;
    else if (c === "]") inCharClass = false;
    else if (c === "/" && !inCharClass) break;
    text += c;
    i++;
  }
  // A newline or the end of input means the `/` was not a literal after all. Leave both
  // untouched for the caller rather than consuming them as part of one.
  if (source[i] === "/") {
    const flags = consumeRegexFlags(source, i + 1, n);
    text += "/" + flags.text;
    i = flags.next;
  }
  return { text, next: i };
}

// The flag letters right after a regex literal's closing `/`, e.g. `g` in `/re/g`.
function consumeRegexFlags(source, i, n) {
  let text = "";
  while (i < n && /[a-z]/i.test(source[i])) {
    text += source[i];
    i++;
  }
  return { text, next: i };
}

function consumeStringLiteral(source, i, n) {
  const quote = source[i];
  let text = quote;
  i++;
  while (i < n && source[i] !== quote) {
    if (source[i] === "\\") {
      text += source[i] + (source[i + 1] ?? "");
      i += 2;
      continue;
    }
    text += source[i];
    i++;
  }
  text += source[i] ?? "";
  i++;
  return { text, next: i };
}

// A // or /* inside a string, a template literal, or a regex literal is not a comment. A plain
// regex substitution would eat `http://example.com` out of the body, and two files differing only
// there would then compare equal.
function stripComments(source) {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      i = skipLineComment(source, i, n);
      continue;
    }
    if (two === "/*") {
      i = skipBlockComment(source, i, n);
      continue;
    }
    if (source[i] === "/" && opensRegexLiteral(out)) {
      const { text, next } = consumeRegexLiteral(source, i, n);
      out += text;
      i = next;
      continue;
    }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const { text, next } = consumeStringLiteral(source, i, n);
      out += text;
      i = next;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

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
// suite would still pass on the day workflows/_lib/gate.ts and its .ja mirror drift apart, since
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
