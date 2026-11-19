#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { readStdin } from "../_lib/hook_payload.ts";
import { emit } from "../_lib/mirror_prose.ts";

function main(): number {
  emit(readStdin());
  return 0;
}

process.exit(main());
