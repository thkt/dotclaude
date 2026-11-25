/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedFiles } from "./_tracked-files.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");

const TEST_FILE_NAME = /[A-Za-z0-9_.-]+\.test\.(?:js|ts)\b/g;
const SCANNED_DOC = /^(?:\.ja\/)?(?:README\.md|docs\/[^/]+\.md)$/;

function testFileNamesIn(content: string): string[] {
  return content.match(TEST_FILE_NAME) ?? [];
}

test("the extractor takes phase-handoff.test.js and rust-edit.test.ts out of a line naming them and nothing out of a line naming no test file", () => {
  assert.deepEqual(
    testFileNamesIn("see `phase-handoff.test.js` and `hooks/edit/tests/rust-edit.test.ts` for details"),
    ["phase-handoff.test.js", "rust-edit.test.ts"],
  );
  assert.deepEqual(testFileNamesIn("`tests/` binds conventions in code, run with `node --test`"), []);
});

test("every test file named by README.md, .ja/README.md, and the Markdown directly under docs/ and .ja/docs/ is the basename of a tracked file, and the scan reaches docs/SPEC.md and docs/HOOKS.md", () => {
  const files = trackedFiles(REPO_ROOT);
  const docs = files.filter((path) => SCANNED_DOC.test(path));
  assert.ok(docs.includes("docs/SPEC.md"));
  assert.ok(docs.includes("docs/HOOKS.md"));

  const trackedBasenames = new Set(files.map((path) => basename(path)));
  const missing = docs.flatMap((doc) =>
    testFileNamesIn(readFileSync(join(REPO_ROOT, doc), "utf8"))
      .filter((name) => !trackedBasenames.has(name))
      .map((name) => `${doc}: ${name}`),
  );
  assert.deepEqual(missing, [], `documents naming a test file that no tracked file carries: ${missing.join(", ")}`);
});
