#!/usr/bin/env node
/// <reference types="node" />
// Usage: verify-tests.ts   (test-presence checks JSON on stdin)
//
// Deterministically verify that each plan test statement (T-NNN name) occurs in one of its
// unit's files. code.js instructs the implementation to use the scenario name verbatim as the
// test name, so a fixed-string search is a presence check for "this planned test was actually
// written".
//
// stdin:  JSON array of {files, names} -- one entry per plan unit. files are repo-root-relative
//         paths (the unit's own files, tests included); names are the unit's T-NNN statements.
// stdout: JSON {results: [{name, found}]}, names flattened in input order.
//           found = some listed file is a regular readable file containing the name literally
//                   (not regex), ignoring whitespace differences
// exit 0 on a completed run (read the verdict from JSON). exit 1 on usage / parse error --
// fail-closed: a malformed payload is never silently treated as "all statements present". The
// surfacing decision (found=false -> PR) stays in build.js.
//
// TypeScript port of the Python test-presence verifier it replaces. Contract: this CLI's own
// behavior, exercised end to end by workflows/build/tests/verify-tests.test.ts against the
// frozen fixture workflows/build/tests/fixtures/verify-tests-cases.json.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseJson } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

interface VerifyTestsResult {
  name: string;
  found: boolean;
}

// textlint spaces the issue body's markdown between half- and full-width characters ("0件"
// becomes "0 件") but leaves a test file's string literal alone. The plan is read from the
// issue body, so matching without dropping whitespace reports an existing test as found=false.
// \s covers the full-width space (U+3000) too, matching Python's re.compile(r"\s+").
const WHITESPACE = /\s+/g;

/** Mirrors the Python verifier's `squeeze`: collapses every run of whitespace (the full-width
 * space included) so a name and a file's contents compare ignoring whitespace differences. */
export function squeeze(text: string): string {
  return text.replace(WHITESPACE, "");
}

/** Mirrors the Python verifier's `read_text`: the file's text, or "" when it is missing or
 * unreadable (fail-closed). */
export function readText(root: string, path: string): string {
  const target = join(root, path);
  try {
    if (!existsSync(target) || !statSync(target).isFile()) return "";
    return readFileSync(target, "utf8");
  } catch {
    return "";
  }
}

/** Mirrors the Python verifier's `_strings`: a non-array value contributes no strings, and
 * within an array, only truthy items convert (`str(item) for item in value if item`) --
 * `Boolean(item)` mirrors Python truthiness for the JSON scalar/array/object shapes `names`
 * and `files` entries can carry. */
function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter((item) => Boolean(item)).map((item) => String(item));
}

/** Mirrors the Python verifier's `run`: for each {files, names} entry, flatten names in input
 * order and mark each found when some listed file's squeezed contents contain the squeezed
 * name. A non-object entry is skipped, matching `if not isinstance(entry, dict): continue`. A
 * whitespace-only name squeezes to "", which every file's squeezed contents would trivially
 * contain, so it is forced to found=false instead. */
export function run(root: string, checks: readonly unknown[]): VerifyTestsResult[] {
  const results: VerifyTestsResult[] = [];
  for (const entry of checks) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const mapping = entry as Record<string, unknown>;
    const files = strings(mapping.files);
    const names = strings(mapping.names);
    const contents = files.map((file) => squeeze(readText(root, file)));
    for (const name of names) {
      const needle = squeeze(name);
      results.push({
        name,
        found: needle !== "" && contents.some((content) => content.includes(needle)),
      });
    }
  }
  return results;
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const parsed = parseJson(raw);
  if ("error" in parsed) {
    process.stderr.write(`Error: checks is not valid JSON: ${parsed.error}\n`);
    return 1;
  }
  const loaded = parsed.value;
  if (!Array.isArray(loaded)) {
    process.stderr.write("Error: checks must be a JSON array of {files, names}\n");
    return 1;
  }
  const results = run(process.cwd(), loaded);
  process.stdout.write(`${JSON.stringify({ results })}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
