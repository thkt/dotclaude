#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PostToolUse hook: warn when a file under .ja/ carries prose with no Japanese in it. The .ts
// side of hooks/edit/mirror_prose_guard.py (DR-0112's TypeScript migration, unit U-003): every
// check lives in mirror_prose.ts (unit U-001/U-002), so this entry point only wires stdin into
// it, the way hooks/lifecycle/recall_index.ts wires stdin into hook_payload.ts's parse.
//
// Warns, never blocks: a file whose comments are legitimately all identifiers or proper nouns
// has no Japanese to find, and that is not a defect.
import { readFileSync } from "node:fs";
import { emit } from "../_lib/mirror_prose.ts";

/** A closed stdin (no pipe, a TTY with nothing typed) can make a synchronous fd-0 read throw
 * rather than return "" -- read it as empty rather than let that throw exit the hook non-zero
 * (recall_index.ts's readStdin). */
function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main(): number {
  emit(readStdin());
  return 0;
}

process.exit(main());
