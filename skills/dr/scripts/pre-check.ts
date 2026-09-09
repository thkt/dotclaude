#!/usr/bin/env node
/// <reference types="node" />
// Usage: pre-check.ts "DR Title"
//
// stdout: JSON (indent 2) with the keys OUTPUT_KEYS declares, in that order --
// status, number, filename, slug, date, dr_dir, similar_drs.
// stderr: validation failures, exit 1.
//
// TypeScript port of the retired Python pre-check, in the header/entry shape
// skills/_lib/harness_hash.ts and skills/dr/scripts/dr_common.ts already use: a plain shebang +
// reference-types + Usage header, named exports for the pieces a test can drive directly, and
// the CLI's own process.exit(main()) guarded by workflows/_lib/entry-point.ts's isMainModule so
// importing this module for its exports never runs the CLI as a side effect.
//
// Contract: the retired Python pre-check's similarity, first_heading, and main; OUTPUT_KEYS
// mirrors its json.dumps key order and is imported by skills/dr/tests/script-contract.test.js.
// Exercised by skills/dr/tests/pre-check.test.ts.
import { accessSync, constants, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fail, guardSkillDir, resolveDrDir, type GitTopLevelResult } from "./dr_common.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

/** The stdout object's key order, and the retired Python pre-check's json.dumps key order it
 * mirrors. The source of truth OUTPUT_KEYS-importing tests (this unit's T-200, and
 * script-contract.test.js) check the CLI's stdout against. */
export const OUTPUT_KEYS = [
  "status",
  "number",
  "filename",
  "slug",
  "date",
  "dr_dir",
  "similar_drs",
] as const;

export interface SimilarDr {
  file: string;
  similarity: string;
  title: string;
}

/** Python's `f"{score:.2f}"`: round-half-even to 2 decimal places, formatted as a fixed
 * 2-decimal string. Built from integer hundredths (not `toFixed` on the rounded float) so a
 * value like 62/100 that has no exact binary representation cannot re-round on the way out,
 * the same reasoning skills/_lib/review_score.ts's round3 documents for round(x, 3). */
export function formatScore(score: number): string {
  const scaled = score * 100;
  const floor = Math.floor(scaled);
  const remainder = scaled - floor;
  let hundredths: number;
  if (remainder > 0.5) hundredths = floor + 1;
  else if (remainder < 0.5) hundredths = floor;
  else hundredths = floor % 2 === 0 ? floor : floor + 1;
  const sign = hundredths < 0 ? "-" : "";
  const abs = Math.abs(hundredths);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** The retired Python pre-check's similarity(): the overlap between title_a and title_b's word
 * sets, divided by title_a's own word COUNT (not the intersection or union size) -- a repeated
 * word in title_a inflates the denominator the same way Python's `len(words_a)` does, so a long
 * existing title (title_b) alone can never dilute the score. */
export function similarity(titleA: string, titleB: string): number {
  const wordsA = splitWords(titleA.toLowerCase());
  if (wordsA.length === 0) return 0.0;
  const setA = new Set(wordsA);
  const setB = new Set(splitWords(titleB.toLowerCase()));
  let overlap = 0;
  for (const word of setA) {
    if (setB.has(word)) overlap += 1;
  }
  return overlap / wordsA.length;
}

/** Python's `str.split()` with no argument: splits on runs of whitespace, dropping empty
 * strings from leading/trailing/repeated whitespace instead of `String.split(" ")`'s single
 * space and empty-string artifacts. */
function splitWords(text: string): string[] {
  const trimmed = text.trim();
  return trimmed === "" ? [] : trimmed.split(/\s+/);
}

/** The retired Python pre-check's first_heading(): the first `# `-prefixed line's text, or ""
 * when the file carries no top-level heading. */
export function firstHeading(path: string): string {
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    if (line.startsWith("# ")) return line.slice(2);
  }
  return "";
}

/** The retired Python pre-check's `sorted(dr_dir.rglob("*.md"))`: every *.md file under drDir,
 * at any depth, as full paths -- sorted by the caller, on the same path-string ordering
 * `rglob`'s Path results carry when sorted. */
function markdownFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...markdownFilesUnder(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push(full);
    }
  }
  return found;
}

/** `git rev-parse --show-toplevel`, read only when resolveDrDir needs it (DR_DIR unset and no
 * CLI argument) -- pre-check.ts takes no dr_dir argument of its own, mirroring the retired
 * Python pre-check's `resolve_dr_dir()` call with no argument. */
function gitTopLevel(): GitTopLevelResult {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout ?? "", error: result.error };
}

// Python's main() takes no argv of its own (title comes from sys.argv[1]), so this main(argv)
// keeps the same process.argv.slice(2) convention harness_hash.ts's main() uses.
export function main(argv: string[]): number {
  const title = argv[0] ?? "";
  const drDir = resolveDrDir(
    process.env,
    undefined,
    process.env.DR_DIR ? { status: 0, stdout: "" } : gitTopLevel(),
  );
  if (drDir === null) {
    fail(
      "Error: not inside a git repository. Decision Records require" +
        " <git-root>/docs/decisions/. Set DR_DIR env var to override.",
    );
  }
  const threshold = parseFloat(process.env.DUPLICATE_THRESHOLD ?? "0.7");

  if (!(title.length >= 5 && title.length <= 64)) {
    fail(`Error: title length ${title.length} chars (required 5-64)`);
  }
  if (/[/:*?"<>|]/.test(title)) {
    fail('Error: forbidden characters in title (/:*?"<>|)');
  }
  guardSkillDir(
    drDir,
    "Set DR_DIR env var or run from a project root where docs/decisions/ is the archive.",
  );

  mkdirSync(drDir, { recursive: true });
  try {
    accessSync(drDir, constants.W_OK);
  } catch {
    fail(`Error: no write permission: ${drDir}`);
  }

  let maxNumber = 0;
  for (const entry of readdirSync(drDir)) {
    const match = /^(\d{4})-/.exec(entry);
    if (match) maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
  }
  const nextNumber = String(maxNumber + 1).padStart(4, "0");

  const slug = title
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  const similarDrs: SimilarDr[] = [];
  for (const drFile of markdownFilesUnder(drDir).sort()) {
    const existing = firstHeading(drFile);
    if (!existing) continue;
    const score = similarity(title, existing);
    if (score >= threshold) {
      similarDrs.push({ file: basename(drFile), similarity: formatScore(score), title: existing });
    }
  }

  const now = new Date();
  const date = [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "ok",
        number: nextNumber,
        filename: `${nextNumber}-${slug}.md`,
        slug,
        date,
        dr_dir: drDir,
        similar_drs: similarDrs,
      },
      null,
      2,
    )}\n`,
  );
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
