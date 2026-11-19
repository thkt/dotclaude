import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { trackedFiles } from "../workflows/_lib/tests/_retirement.ts";
import { commentsIn } from "./_comments.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PERMITTED_LIST = "tests/permitted-comments.json";
const SCANNED_ROOTS = ["tests/"];
const SCANNED_EXTENSION = /\.(ts|js|sh)$/;
const PAIRED_EXTENSION = /\.(ts|js)$/;

type Permit = { path: string; comment: string };
type SourceFile = { path: string; source: string };
type MirrorPair = { en: SourceFile; ja: SourceFile };

const isScanned = (path: string): boolean =>
  SCANNED_ROOTS.some((scannedRoot) => path.startsWith(scannedRoot)) &&
  SCANNED_EXTENSION.test(path) &&
  !path.startsWith(".ja/") &&
  !path.split("/").slice(0, -1).includes("fixtures");

const unpermittedComments = (files: SourceFile[], permits: Permit[]): string[] =>
  files.flatMap(({ path, source }) =>
    commentsIn(path, source)
      .filter(({ text, exempt }) => !exempt && !permits.some((p) => p.path === path && p.comment === text))
      .map(({ text }) => `${path}: ${text}`),
  );

const stalePermits = (files: SourceFile[], permits: Permit[]): Permit[] =>
  permits.filter((permit) => {
    const file = files.find(({ path }) => path === permit.path);
    return !file || !commentsIn(file.path, file.source).some(({ text }) => text === permit.comment);
  });

const comparePermits = (a: Permit, b: Permit): number => {
  if (a.path !== b.path) return a.path < b.path ? -1 : 1;
  if (a.comment !== b.comment) return a.comment < b.comment ? -1 : 1;
  return 0;
};

const firstDisorder = (permits: Permit[]): number | null => {
  const index = permits.findIndex((permit, i) => i > 0 && comparePermits(permits[i - 1], permit) >= 0);
  return index === -1 ? null : index;
};

const countMismatches = (pairs: MirrorPair[]): string[] =>
  pairs.flatMap(({ en, ja }) => {
    const enCount = commentsIn(en.path, en.source).length;
    const jaCount = commentsIn(ja.path, ja.source).length;
    return enCount === jaCount ? [] : [`${en.path} (${enCount}) / ${ja.path} (${jaCount})`];
  });

const readSource = (path: string): SourceFile => ({ path, source: readFileSync(join(root, path), "utf8") });
const scannedFiles = (): SourceFile[] => trackedFiles(root).filter(isScanned).map(readSource);
const permittedList = (): Permit[] => JSON.parse(readFileSync(join(root, PERMITTED_LIST), "utf8"));
const texts = (path: string, source: string): string[] => commentsIn(path, source).map(({ text }) => text);
const unpermittedIn = (path: string, source: string): string[] => unpermittedComments([{ path, source }], []);

const WITH_COMMENT = ["const a = 1;", "// keeps the cache warm", "const b = 2;"].join("\n");
const WITHOUT_COMMENT = ["const a = 1;", "const b = 2;"].join("\n");

test("a .ts comment missing from the permitted list is reported, and the same source without it is not", () => {
  assert.deepEqual(unpermittedComments([{ path: "tests/a.ts", source: WITH_COMMENT }], []), [
    "tests/a.ts: keeps the cache warm",
  ]);
  assert.deepEqual(unpermittedComments([{ path: "tests/a.ts", source: WITHOUT_COMMENT }], []), []);
});

test("a comment the permitted list names for its path is not reported", () => {
  const permits = [{ path: "tests/a.ts", comment: "keeps the cache warm" }];
  assert.deepEqual(unpermittedComments([{ path: "tests/a.ts", source: WITH_COMMENT }], permits), []);
  assert.deepEqual(
    unpermittedComments([{ path: "tests/b.ts", source: WITH_COMMENT }], permits),
    ["tests/b.ts: keeps the cache warm"],
    "a permit names one path only",
  );
});

test("consecutive // lines count as one comment joined by single spaces, and a blank line splits them", () => {
  assert.deepEqual(texts("a.ts", ["// first line", "//   second line  ", "const a = 1;"].join("\n")), [
    "first line second line",
  ]);
  assert.deepEqual(texts("a.ts", ["// first", "//", "// third"].join("\n")), ["first third"]);
  assert.deepEqual(texts("a.ts", ["// first", "", "// second"].join("\n")), ["first", "second"]);
  assert.deepEqual(texts("a.ts", ["// first", "const a = 1;", "// second"].join("\n")), ["first", "second"]);
});

test("a block comment counts as one comment with its markers and leading asterisks removed", () => {
  assert.deepEqual(texts("a.ts", ["/**", " * one", " *", " * two", " */", "const a = 1;"].join("\n")), [
    "one two",
  ]);
  assert.deepEqual(texts("a.ts", "const a = /* inline */ 1;"), ["inline"]);
  assert.deepEqual(texts("a.ts", ["/* first */", "/* second */"].join("\n")), ["first", "second"]);
});

test("a comment after code on its line counts alone and does not join the comment lines below it", () => {
  assert.deepEqual(texts("a.ts", ["const a = 1; // trailing", "// below", "// and below"].join("\n")), [
    "trailing",
    "below and below",
  ]);
  assert.deepEqual(texts("a.ts", ["// above", "const a = 1; // trailing"].join("\n")), ["above", "trailing"]);
});

test("a // or /* inside a string, a template literal, or a regex literal is not a comment", () => {
  assert.deepEqual(texts("a.ts", "const url = \"http://example.com/*x\";"), []);
  assert.deepEqual(texts("a.ts", "const url = 'http://example.com/*x';"), []);
  assert.deepEqual(texts("a.ts", "const label = `a // b /* c`;"), []);
  assert.deepEqual(texts("a.ts", "const marker = /\\/\\/|\\/\\*/g;"), []);
});

test("a shebang, a reference directive, and biome, oxlint, and shellcheck directives pass without a permit", () => {
  assert.deepEqual(unpermittedIn("a.ts", ["#!/usr/bin/env node", "const a = 1;"].join("\n")), []);
  assert.deepEqual(unpermittedIn("a.sh", ["#!/bin/sh", "echo hi"].join("\n")), []);
  assert.deepEqual(unpermittedIn("a.ts", ["/// <reference types=\"node\" />", "const a = 1;"].join("\n")), []);
  assert.deepEqual(unpermittedIn("a.ts", ["// biome-ignore format: aligned table", "const a = 1;"].join("\n")), []);
  assert.deepEqual(unpermittedIn("a.ts", ["// oxlint-disable-next-line no-console", "console.log(1);"].join("\n")), []);
  assert.deepEqual(unpermittedIn("a.sh", ["# shellcheck disable=SC2086", "echo $x"].join("\n")), []);
});

test("a directive line does not join the comment lines next to it", () => {
  assert.deepEqual(
    unpermittedIn("a.ts", ["// above", "// oxlint-disable-next-line no-console", "// below", "console.log(1);"].join("\n")),
    ["a.ts: above", "a.ts: below"],
  );
  assert.deepEqual(unpermittedIn("a.sh", ["#!/bin/sh", "# below", "echo hi"].join("\n")), ["a.sh: below"]);
});

test("shapes resembling a form exception are reported", () => {
  assert.deepEqual(unpermittedIn("a.sh", ["echo hi", "#!/bin/sh"].join("\n")), ["a.sh: !/bin/sh"]);
  assert.deepEqual(unpermittedIn("a.ts", ["// biome-ignored format", "const a = 1;"].join("\n")), [
    "a.ts: biome-ignored format",
  ]);
  assert.deepEqual(unpermittedIn("a.ts", ["// see oxlint-disable", "const a = 1;"].join("\n")), [
    "a.ts: see oxlint-disable",
  ]);
  assert.deepEqual(unpermittedIn("a.ts", ["// shellcheck disable=SC2086", "const a = 1;"].join("\n")), [
    "a.ts: shellcheck disable=SC2086",
  ]);
});

test("a shell comment at the start of a line and after a command are each reported", () => {
  assert.deepEqual(texts("a.sh", ["# leading", "# continued", "echo \"hi\" # trailing", "# below"].join("\n")), [
    "leading continued",
    "trailing",
    "below",
  ]);
});

test("a # inside quotes, a heredoc body, $#, ${#name}, or a word is not a shell comment", () => {
  assert.deepEqual(texts("a.sh", "echo \"a # b\" 'c # d'"), []);
  assert.deepEqual(texts("a.sh", ["cat <<EOF", "# body", "EOF"].join("\n")), []);
  assert.deepEqual(texts("a.sh", ["cat <<-'END'", "\t# body", "\tEND", "# after"].join("\n")), ["after"]);
  assert.deepEqual(texts("a.sh", "echo $#"), []);
  assert.deepEqual(texts("a.sh", "echo ${#name}"), []);
  assert.deepEqual(texts("a.sh", "echo a#b"), []);
});

test("a permit whose comment is not in its file, or whose path is not scanned, is reported stale", () => {
  const files = [{ path: "tests/a.ts", source: ["// kept", "const a = 1;"].join("\n") }];
  const kept = { path: "tests/a.ts", comment: "kept" };
  const gone = { path: "tests/a.ts", comment: "gone" };
  const elsewhere = { path: "hooks/b.ts", comment: "kept" };
  assert.deepEqual(stalePermits(files, [kept]), []);
  assert.deepEqual(stalePermits(files, [kept, gone, elsewhere]), [gone, elsewhere]);
});

test("the permitted list is reported at its first entry out of path-then-comment order or repeated", () => {
  assert.equal(
    firstDisorder([
      { path: "a.ts", comment: "x" },
      { path: "a.ts", comment: "y" },
      { path: "b.ts", comment: "a" },
    ]),
    null,
  );
  assert.equal(firstDisorder([{ path: "b.ts", comment: "x" }, { path: "a.ts", comment: "x" }]), 1);
  assert.equal(firstDisorder([{ path: "a.ts", comment: "y" }, { path: "a.ts", comment: "x" }]), 1);
  assert.equal(
    firstDisorder([
      { path: "a.ts", comment: "x" },
      { path: "a.ts", comment: "y" },
      { path: "a.ts", comment: "y" },
    ]),
    2,
  );
});

test("an EN file and its .ja mirror must carry the same number of comments, form exceptions included", () => {
  const en = { path: "tests/a.ts", source: ["#!/usr/bin/env node", "// one", "const a = 1;"].join("\n") };
  const same = { path: ".ja/tests/a.ts", source: ["#!/usr/bin/env node", "// ichi", "const a = 1;"].join("\n") };
  const extra = { path: ".ja/tests/a.ts", source: ["#!/usr/bin/env node", "// ichi", "const a = 1;", "// ni"].join("\n") };
  assert.deepEqual(countMismatches([{ en, ja: same }]), []);
  assert.deepEqual(countMismatches([{ en, ja: extra }]), ["tests/a.ts (2) / .ja/tests/a.ts (3)"]);
});

test("only .ts, .js, and .sh files under a scanned root and outside fixtures/ are scanned", () => {
  assert.equal(isScanned("tests/a.test.ts"), true);
  assert.equal(isScanned("tests/a.sh"), true);
  assert.equal(isScanned("tests/a.md"), false);
  assert.equal(isScanned("tests/fixtures/a.ts"), false);
  assert.equal(isScanned(".ja/tests/a.ts"), false);
  assert.equal(isScanned("hooks/a.ts"), false);
});

test("every scanned root holds at least one tracked file to scan", () => {
  const files = trackedFiles(root).filter(isScanned);
  for (const scannedRoot of SCANNED_ROOTS) {
    assert.ok(files.some((path) => path.startsWith(scannedRoot)), `${scannedRoot} holds no file to scan`);
  }
});

test("no tracked file under a scanned root carries a comment outside the permitted list and the form exceptions", () => {
  const offenders = unpermittedComments(scannedFiles(), permittedList());
  assert.deepEqual(
    offenders,
    [],
    `Delete these comments, or get thkt's permission in a PR that adds them to ${PERMITTED_LIST}:\n${offenders.join("\n")}`,
  );
});

test("every permitted comment still occurs in its scanned file", () => {
  assert.deepEqual(stalePermits(scannedFiles(), permittedList()), [], `${PERMITTED_LIST} holds entries that no longer occur`);
});

test("the permitted list is sorted by path then comment with no entry repeated", () => {
  const permits = permittedList();
  const index = firstDisorder(permits);
  assert.equal(index, null, `${PERMITTED_LIST} breaks order at index ${index}: ${JSON.stringify(permits[index ?? 0])}`);
});

test("every scanned file with a .ja mirror carries as many comments as the mirror", () => {
  const pairs = scannedFiles()
    .filter(({ path }) => PAIRED_EXTENSION.test(path) && existsSync(join(root, ".ja", path)))
    .map((en) => ({ en, ja: readSource(join(".ja", en.path)) }));
  assert.deepEqual(countMismatches(pairs), []);
});
