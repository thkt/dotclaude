#!/opt/homebrew/bin/bun
/// <reference types="node" />
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
