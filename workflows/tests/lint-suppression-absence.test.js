import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..", "..");

const BIOME_SUPPRESSION = /(\/\/|\/\*)\s*biome-ignore(-all|-start)?\s+lint(\/[\w/]+)?\s*:/;
const OXLINT_SUPPRESSION =
  /(\/\/|\/\*)\s*(oxlint|eslint)-disable(-next-line|-line)?\b[^\n]*max-depth/;

function suppressionIn(source) {
  const match = BIOME_SUPPRESSION.exec(source) || OXLINT_SUPPRESSION.exec(source);
  return match ? match[0] : null;
}

const BARE_FORM = ["// biome-", "ignore lint: measured by hand\n"].join("");
const NESTED_FUNCTION = `export const nested = (a, b, c, d) => {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          return 1;
        }
      }
    }
  }
  return 0;
};
`;

const OTHER_FORMS = [
  ["// biome-", "ignore-all lint/complexity/noExcessiveCognitiveComplexity: whole file\n"].join(""),
  ["// biome-", "ignore-start lint: range\n"].join(""),
  ["// oxlint-", "disable-next-line max-depth\n"].join(""),
];

test('T-011 a file carrying the bare "biome-ignore lint:" comment is reported by the suppression scan', () => {
  assert.ok(suppressionIn(BARE_FORM + NESTED_FUNCTION));
});

test("T-012 the same file with the comment removed is not reported", () => {
  assert.equal(suppressionIn(NESTED_FUNCTION), null);
});

test("T-013 the biome-ignore-all, biome-ignore-start, and oxlint-disable-next-line max-depth forms are each reported", () => {
  for (const form of OTHER_FORMS) {
    assert.ok(suppressionIn(form + NESTED_FUNCTION), `not reported: ${form.trim()}`);
  }
});

test("T-014 no tracked file carries any suppression form the scan names", () => {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  assert.ok(files.length > 0, "git ls-files returned no tracked file");
  const hits = files
    .map((file) => ({ file, match: suppressionIn(readFileSync(path.join(ROOT, file), "utf8")) }))
    .filter((entry) => entry.match !== null);
  assert.deepEqual(hits, []);
});
