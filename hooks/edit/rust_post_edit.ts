#!/opt/homebrew/bin/bun
/// <reference types="node" />
// Rust: cargo fmt after editing .rs files, then clippy -- the pre-edit run cannot see what the
// edit itself broke (unit U-003, docs/decisions/0112-adopt-typescript-for-helper-scripts.md):
// composes hooks/_lib/rust_target.ts's target/fmt/clippyOutput, the same shared module
// rust_pre_edit.ts composes.
import { readFileSync } from "node:fs";
import { clippyOutput, fmt, target } from "../_lib/rust_target.ts";

function main(): number {
  const found = target(readFileSync(0, "utf8"));
  if (found === null) return 0;
  const [root, file] = found;
  fmt(root);
  const output = clippyOutput("PostToolUse", root, file);
  if (output) process.stdout.write(`${output}\n`);
  return 0;
}

process.exit(main());
