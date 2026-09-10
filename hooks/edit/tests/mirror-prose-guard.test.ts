/// <reference types="node" />
// Ports two of hooks/edit/tests/mirror_prose_guard_test.py's scenarios --
// test_english_only_source_warns and test_one_japanese_character_passes -- to the .ts guard's
// entry point (unit U-003, DR-0112 migration). The check itself is mirror_prose.ts's `check`,
// already covered end to end by hooks/_lib/tests/mirror-prose.test.ts's T-366; this file
// confirms only that the compiled hook wires stdin into it and prints the same wording the
// Python guard does, the way hooks/lifecycle/tests/recall-index.test.ts confirms recall_index.ts's
// wiring rather than re-deriving hook_payload.ts's own contract.
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

test("T-372 an edit that leaves the mirror behind is reported with the python version's text", () => {
  const filePath = writeFixture(
    ".ja/hooks/sample.ts",
    "// Convert the payload and persist it.\n",
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

test("T-373 an edit whose mirror is present produces no output", () => {
  const filePath = writeFixture(
    ".ja/hooks/mixed.ts",
    "// Convert the payload and persist it.\n// 変換する\n",
  );

  assert.equal(
    runHook(filePath),
    "",
    "a .ja file that still carries a Japanese character must stay silent",
  );
});
