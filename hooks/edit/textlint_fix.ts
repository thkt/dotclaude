#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { readFileSync, statSync } from "node:fs";
import { editedFile, readStdin } from "../_lib/hook_payload.ts";
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
  const path = editedFile(readStdin());
  if (path === null || !path.endsWith(".md")) return 0;
  if (!isFile(path)) return 0;

  if (hasJapanese(readFileSync(path, "utf8"))) {
    fix(path);
  }
  return 0;
}

process.exit(main());
