#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PostToolUse hook: warn when a file under .ja/ carries prose with no Japanese in it. Ported
// from hooks/edit's original Python mirror_prose_guard hook (DR-0112's TypeScript migration,
// unit U-003; the Python hook retired once this file took over, unit U-004): every check lives
// in mirror_prose.ts (unit U-001/U-002), so this entry point only wires stdin into it, the way
// hooks/lifecycle/recall_index.ts wires stdin into hook_payload.ts's parse.
//
// Warns, never blocks: a file whose comments are legitimately all identifiers or proper nouns
// has no Japanese to find, and that is not a defect.
import { readStdin } from "../_lib/hook_payload.ts";
import { emit } from "../_lib/mirror_prose.ts";

function main(): number {
  emit(readStdin());
  return 0;
}

process.exit(main());
