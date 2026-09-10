#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PostToolUse hook: report rumdl violations after editing a .md file. TypeScript port of
// hooks/edit/rumdl_check.py (unit U-005, docs/decisions/0112-adopt-typescript-for-helper-
// scripts.md): composes hooks/_lib/hook_payload.ts's editedFile and notify around a
// `rumdl check <path>` subprocess, the way the python original composes their same-named
// module.
//
// Unlike textlint_fix.ts, this hook only reports; it never calls `rumdl fmt`, so a fix stays a
// decision the human or the agent makes on purpose.
//
// subprocess.run raises FileNotFoundError when rumdl is missing, which rumdl_check.py catches
// and turns into exit 0. spawnSync never throws for that case -- it returns
// `{ error, status: null }` instead, the same status:null-reads-as-nothing-to-report shape
// hooks/_lib/rust_target.ts already established for a missing cargo. This hook reads
// status === null the same way.
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { editedFile, notify } from "../_lib/hook_payload.ts";

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

  const result = spawnSync("rumdl", ["check", path], { encoding: "utf8" });
  if (result.status === null) return 0;

  // Not `if (output)`: rumdl prints "Success: No issues found in 1 file" on a clean file too,
  // and forwarding that would put a line on every .md edit. The exit code is the only signal
  // that separates the two.
  const output = (result.stdout ?? "").trim();
  if (result.status !== 0 && output) notify(output);
  return 0;
}

process.exit(main());
