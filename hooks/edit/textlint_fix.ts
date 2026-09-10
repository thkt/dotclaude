#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PostToolUse hook: auto-fix a Japanese .md file with textlint. TypeScript port of
// hooks/edit/textlint_fix.py (unit U-004, docs/decisions/0112-adopt-typescript-for-helper-
// scripts.md): composes hooks/_lib/hook_payload.ts's editedFile, hooks/_lib/japanese.ts's
// hasJapanese, and hooks/_lib/textlint.ts's fix the way the python original composes their
// same-named modules.
//
// settings.json narrows this to .md paths with an `if` condition. The suffix check below
// repeats it so the hook still holds when called directly, as the tests do.
import { readFileSync, statSync } from "node:fs";
import { editedFile } from "../_lib/hook_payload.ts";
import { hasJapanese } from "../_lib/japanese.ts";
import { fix } from "../_lib/textlint.ts";

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function main(): number {
  const path = editedFile(readFileSync(0, "utf8"));
  if (path === null || !path.endsWith(".md")) return 0;
  if (!isFile(path)) return 0;

  if (hasJapanese(readFileSync(path, "utf8"))) {
    fix(path);
  }
  return 0;
}

process.exit(main());
