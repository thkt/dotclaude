/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "mirror_prose_guard.ts");

function writeFixture(relative: string, content: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "mirror-prose-guard-tests-"));
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

function runHook(filePath: string): string {
  return run(HOOK, { tool_name: "Write", tool_input: { file_path: filePath } });
}

test("an edit that leaves English prose in a .ja file is reported with the MIRROR.md message and the file path", () => {
  const filePath = writeFixture(
    ".ja/hooks/sample.ts",
    "// why-not: Convert the payload and persist it.\n",
  );

  const stdout = runHook(filePath);

  assert.match(
    stdout,
    /mirror_prose_guard: \.ja\/ は canonical で prose は日本語 \(MIRROR\.md\)。/,
    `an English-only .ja file must be reported through the guard hook, got: ${stdout}`,
  );
  assert.ok(
    stdout.includes(filePath),
    "the report must name the file that lost its Japanese",
  );
});

test("an edit whose mirror is present produces no output", () => {
  const filePath = writeFixture(
    ".ja/hooks/mixed.ts",
    "// why-not: Convert the payload and persist it.\n// why-not: 変換する\n",
  );

  assert.equal(
    runHook(filePath),
    "",
    "a .ja file that still carries a Japanese character must stay silent",
  );
});

test("a payload naming a path no file sits at produces no output", () => {
  const missing = path.join(mkdtempSync(path.join(tmpdir(), "mirror-prose-guard-missing-")), ".ja", "gone.ts");

  assert.equal(
    runHook(missing),
    "",
    "a file_path that resolves to nothing must leave the guard silent, not crash it",
  );
});
