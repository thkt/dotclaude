// Whether any tracked file silences the two nesting checks with a suppression comment. Biome's
// suppression comment comes in a bare form (the `lint:` keyword alone, silencing every rule), a
// rule-qualified form (`lint/<group>/<rule>:`), and the file-wide `-all` and range `-start`
// variants; oxlint accepts the eslint-style disable comments naming `max-depth`. A scan for the
// rule-qualified form alone would pass the bare one, which is the one an agent reaches for first.
// The forms are spelled out only inside the fixtures below, in halves, for the reason given there.
//
// The fixtures follow docs/wiki/absence-test-positive-control-fixture.md: a positive control per
// form, and a copy of the first one with its comment removed. T-014 reads every tracked file,
// this one included, so each fixture's comment is assembled from two string halves at the point
// of use rather than written whole: the halves are still literals, independent of the patterns
// the scan searches with, and this file itself stays free of a suppression the scan would flag.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..", "..");

// Both patterns as the plan's Rules state them.
const BIOME_SUPPRESSION = /biome-ignore(-all|-start)?\s+lint(\/[\w/]+)?\s*:/;
const OXLINT_SUPPRESSION = /(oxlint|eslint)-disable(-next-line|-line)?\b[^\n]*max-depth/;

// The first suppression comment found in `source`, or null. The scan reads content, not paths,
// so a fixture handed in as a string and a tracked file read from disk go through the same check.
function suppressionIn(source) {
  const match = BIOME_SUPPRESSION.exec(source) || OXLINT_SUPPRESSION.exec(source);
  return match ? match[0] : null;
}

// T-011's positive control: the bare `lint:` form, which names no rule and silences them all.
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

// T-013's three further forms, each the same comment shape with a different keyword.
const OTHER_FORMS = [
  ["// biome-", "ignore-all lint/complexity/noExcessiveCognitiveComplexity: whole file\n"].join(""),
  ["// biome-", "ignore-start lint: range\n"].join(""),
  ["// oxlint-", "disable-next-line max-depth\n"].join(""),
];

test('a file carrying the bare "biome-ignore lint:" comment is reported by the suppression scan', () => {
  assert.ok(suppressionIn(BARE_FORM + NESTED_FUNCTION));
});

test("the same file with the comment removed is not reported", () => {
  assert.equal(suppressionIn(NESTED_FUNCTION), null);
});

test("the biome-ignore-all, biome-ignore-start, and oxlint-disable-next-line max-depth forms are each reported", () => {
  for (const form of OTHER_FORMS) {
    assert.ok(suppressionIn(form + NESTED_FUNCTION), `not reported: ${form.trim()}`);
  }
});

test("no tracked file carries any suppression form the scan names", () => {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  assert.ok(files.length > 0, "git ls-files returned no tracked file");
  const hits = files
    .map((file) => ({ file, match: suppressionIn(readFileSync(path.join(ROOT, file), "utf8")) }))
    .filter((entry) => entry.match !== null);
  assert.deepEqual(hits, []);
});
