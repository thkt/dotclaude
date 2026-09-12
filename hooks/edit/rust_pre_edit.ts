#!/opt/homebrew/bin/bun
/// <reference types="node" />
// Rust: cargo clippy before editing .rs files, injected as additionalContext (unit U-003,
// docs/decisions/0112-adopt-typescript-for-helper-scripts.md): composes hooks/_lib/
// rust_target.ts's target/clippyOutput, the same shared module rust_post_edit.ts composes, so
// both hooks land as one unit here.
import { readStdin } from "../_lib/hook_payload.ts";
import { clippyOutput, target } from "../_lib/rust_target.ts";

function main(): number {
  const found = target(readStdin());
  if (found === null) return 0;
  const output = clippyOutput("PreToolUse", ...found);
  if (output) process.stdout.write(`${output}\n`);
  return 0;
}

process.exit(main());
