#!/usr/bin/env node
/// <reference types="node" />
// Usage: revalidate.ts   (preconditions JSON on stdin)
//
// Deterministically re-verify a plan's preconditions against the working tree.
//
// stdin:  JSON array of {path, pattern?} -- existing code the issue's plan presupposes.
//         path is relative to the process cwd (the repo root). pattern is an optional
//         literal (fixed-string, not regex) substring expected to occur in that file.
// stdout: JSON {results: [{path, pattern, exists, matches}]}, one per input in order.
//           exists  = the path is present; with a pattern, it is a regular file
//           matches = with no pattern, equals exists; otherwise exists AND the literal
//                     pattern occurs in the file's bytes
// exit 0 on a completed run (read the verdict from JSON). exit 1 on usage / parse error
// -- fail-closed: a malformed payload is never silently treated as "all preconditions
// pass". The drift decision (any exists=false or matches=false) stays in build.js.
//
// TypeScript port of the Python precondition verifier it replaces. Contract: this CLI's own
// behavior, exercised end to end by workflows/build/tests/revalidate.test.ts against the
// frozen fixture workflows/build/tests/fixtures/revalidate-cases.json.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseJson } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

interface VerifyResult {
  path: string;
  pattern: string;
  exists: boolean;
  matches: boolean;
}

/** Mirrors verify_one's `path = str(mapping.get("path", ""))`: a key absent from the entry
 * falls back to "", a present string passes through, and a present null becomes the literal
 * "None" the way Python's str(None) reads. No fixture exercises the null case; the port keeps
 * it anyway to stay faithful to the source it replaces. */
function pathFrom(mapping: Record<string, unknown>): string {
  if (!("path" in mapping)) return "";
  const value = mapping.path;
  if (value === null) return "None";
  return typeof value === "string" ? value : String(value);
}

/** Mirrors verify_one's two-step pattern read: `raw_pattern = mapping.get("pattern", "")`
 * then `"" if raw_pattern is None else str(raw_pattern)`. Unlike path, an explicit null
 * pattern normalizes to "" rather than "None" (the none_pattern_normalized_to_empty_string
 * fixture case). */
function patternFrom(mapping: Record<string, unknown>): string {
  const value = "pattern" in mapping ? mapping.pattern : "";
  if (value === null || value === "") return "";
  return typeof value === "string" ? value : String(value);
}

function isRegularFile(target: string): boolean {
  try {
    return statSync(target).isFile();
  } catch {
    return false;
  }
}

/** One precondition entry's verdict against `root`. A non-object entry, or one whose file is
 * unreadable, resolves to exists/matches false (fail-closed) rather than throwing. */
export function verifyOne(root: string, entry: unknown): VerifyResult {
  const mapping: Record<string, unknown> =
    typeof entry === "object" && entry !== null && !Array.isArray(entry)
      ? (entry as Record<string, unknown>)
      : {};
  const path = pathFrom(mapping);
  const pattern = patternFrom(mapping);
  const target = join(root, path);
  // A pattern requires a regular file (a directory can never carry a literal match); with no
  // pattern, existing at all -- file or directory -- is enough.
  const exists = path !== "" && (pattern ? isRegularFile(target) : existsSync(target));
  let matches: boolean;
  if (!pattern) {
    matches = exists;
  } else if (!exists) {
    matches = false;
  } else {
    try {
      matches = readFileSync(target).includes(pattern);
    } catch {
      matches = false;
    }
  }
  return { path, pattern, exists, matches };
}

/** Every precondition's verdict against `root`, in order. */
export function run(root: string, preconditions: readonly unknown[]): VerifyResult[] {
  return preconditions.map((entry) => verifyOne(root, entry));
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const parsed = parseJson(raw);
  if ("error" in parsed) {
    process.stderr.write(`Error: preconditions is not valid JSON: ${parsed.error}\n`);
    return 1;
  }
  const loaded = parsed.value;
  if (!Array.isArray(loaded)) {
    process.stderr.write("Error: preconditions must be a JSON array of {path, pattern?}\n");
    return 1;
  }
  const results = run(process.cwd(), loaded);
  process.stdout.write(`${JSON.stringify({ results })}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
