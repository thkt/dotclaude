/// <reference types="node" />
// Unit U-004: hooks/edit/textlint_fix.ts (docs/decisions/0112-adopt-typescript-for-helper-
// scripts.md), composing hooks/_lib/hook_payload.ts's editedFile, hooks/_lib/japanese.ts's
// hasJapanese, and hooks/_lib/textlint.ts's fix, the way its retired Python predecessor
// composed the same pieces -- this test drives that composition through a stub `bun` on PATH,
// the way hooks/_lib/tests/textlint.test.ts's installStubBun and hooks/edit/tests/rust-
// edit.test.ts's CARGO_CALLS log both already do for this codebase's runner-resolution hooks:
// the stub records the path it was asked to fix, so the assertion reads whether textlint was
// reached at all, not what it did to the file.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "textlint_fix.ts");

// Mirrors the retired textlint_fix hook tests' REDUNDANT_MD / ENGLISH_MD fixtures: enough
// Japanese characters to clear japanese.ts's DEFAULT_THRESHOLD of 50, and an English-only
// counterpart that stays under it.
const JAPANESE_MD =
  "# テスト\n\nこの機能はユーザーが設定を変更することができます。また、管理者が権限を付与する事にしました。これにより、運用の効率化が期待されています。今後も継続して改善を重ねていく予定です。\n";
const ENGLISH_MD =
  "# English Document\n\nThis is a test document written entirely in English. It should not trigger textlint processing because it does not contain enough Japanese characters.\n";

/** Writes an executable `bun` stub under root/bin that answers `bun x textlint --fix <path>
 * --config <config>` (the argv hooks/_lib/textlint.ts's fix() builds) by appending the fixed
 * path to $TEXTLINT_CALLS. Mirrors hooks/_lib/tests/textlint.test.ts's installStubBun. */
function installStubBun(root: string): string {
  const binDir = path.join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const stub = path.join(binDir, "bun");
  writeFileSync(
    stub,
    [
      "#!/bin/sh",
      '[ "$1" = "x" ] && [ "$2" = "textlint" ] && [ "$3" = "--fix" ] || exit 0',
      'echo "$4" >> "$TEXTLINT_CALLS"',
      "exit 0",
    ].join("\n") + "\n",
  );
  chmodSync(stub, 0o755);
  return binDir;
}

interface Fixture {
  binDir: string;
  callsFile: string;
  env: NodeJS.ProcessEnv;
}

function fixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), "textlint-fix-tests-"));
  const binDir = installStubBun(root);
  const callsFile = path.join(root, "calls");
  writeFileSync(callsFile, "");
  return {
    binDir,
    callsFile,
    env: {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      TEXTLINT_CALLS: callsFile,
    },
  };
}

function runHook(f: Fixture, tool: string, filePath: string): void {
  const payload = { tool_name: tool, tool_input: { file_path: filePath } };
  run(HOOK, payload, f.env);
}

function callsFor(f: Fixture, filePath: string): boolean {
  return readFileSync(f.callsFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .includes(filePath);
}

test("T-383 an edited Japanese markdown file reaches textlint and an english one does not", () => {
  const f = fixture();
  const root = path.dirname(f.callsFile);

  const japanesePath = path.join(root, "japanese.md");
  writeFileSync(japanesePath, JAPANESE_MD);
  runHook(f, "Write", japanesePath);
  assert.ok(
    callsFor(f, japanesePath),
    "a Write to a Japanese .md file must reach textlint's --fix runner",
  );

  const englishPath = path.join(root, "english.md");
  writeFileSync(englishPath, ENGLISH_MD);
  runHook(f, "Write", englishPath);
  assert.ok(
    !callsFor(f, englishPath),
    "a Write to an English-only .md file must not reach textlint",
  );
});
