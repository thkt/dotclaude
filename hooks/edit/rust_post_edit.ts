#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { readStdin } from "../_lib/hook_payload.ts";
import { clippyOutput, fmt, target } from "../_lib/rust_target.ts";

function main(): number {
  const found = target(readStdin());
  if (found === null) return 0;
  const [root, file] = found;
  fmt(root);
  const output = clippyOutput("PostToolUse", root, file);
  if (output) process.stdout.write(`${output}\n`);
  return 0;
}

process.exit(main());
