#!/usr/bin/env node
/// <reference types="node" />
// Usage: pre-check.ts "DR Title"
//
// stdout: JSON (indent 2) with the keys OUTPUT_KEYS declares, in that order --
// status, number, filename, slug, date, dr_dir, similar_drs.
// stderr: validation failures, exit 1.
//
// TypeScript port of the retired Python pre-check, in the header/entry shape
// skills/dr/scripts/dr_common.ts already uses: a plain shebang + reference-types + Usage header,
// named exports for the pieces a test can drive directly, and the CLI's own process.exit(main())
// guarded by workflows/_lib/entry-point.ts's isMainModule so importing this module for its
// exports never runs the CLI as a side effect.
//
// Contract: the retired Python pre-check's similarity, first_heading, and main; OUTPUT_KEYS
// mirrors its json.dumps key order and is imported by skills/dr/tests/script-contract.test.js.
// Exercised by skills/dr/tests/pre-check.test.ts.
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { fail, filesUnder, gitTopLevel, guardSkillDir, localDate, resolveDrDir } from "./dr_common.ts";
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
 * value like 62/100 that has no exact binary representation cannot re-round on the way out. */
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

/** Every existing DR under drDir (sorted) whose first heading scores >=
 * threshold against title, paired with formatScore(score) and the existing heading text --
 * empty when drDir carries no *.md file scoring at or above threshold. Called from main(). */
function collectSimilarDrs(title: string, drDir: string, threshold: number): SimilarDr[] {
  const similarDrs: SimilarDr[] = [];
  for (const drFile of filesUnder(drDir, (name) => name.endsWith(".md")).sort()) {
    const existing = firstHeading(drFile);
    if (!existing) continue;
    const score = similarity(title, existing);
    if (score >= threshold) {
      similarDrs.push({ file: basename(drFile), similarity: formatScore(score), title: existing });
    }
  }
  return similarDrs;
}

function drNumber(name: string): number | null {
  const match = /^(\d{4})-/.exec(name);
  return match ? parseInt(match[1], 10) : null;
}

class OpenPrCheckUnavailable extends Error {}

function runOrUnavailable(bin: string, args: string[], cwd: string): string {
  const result = spawnSync(bin, args, { cwd, encoding: "utf8" });
  if (result.error) {
    throw new OpenPrCheckUnavailable(`${bin} could not run: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const firstStderrLine = (result.stderr ?? "").trim().split("\n")[0];
    throw new OpenPrCheckUnavailable(
      `${bin} ${args.slice(0, 2).join(" ")} exited ${result.status}${firstStderrLine ? `: ${firstStderrLine}` : ""}`,
    );
  }
  return result.stdout;
}

function parsePrNumbers(listed: string): number[] {
  let prs: unknown;
  try {
    prs = JSON.parse(listed);
  } catch {
    throw new OpenPrCheckUnavailable("gh pr list printed output that is not JSON");
  }
  if (!Array.isArray(prs) || !prs.every((pr) => Number.isInteger((pr as { number?: unknown })?.number))) {
    throw new OpenPrCheckUnavailable("gh pr list printed JSON that is not a list of PR numbers");
  }
  return prs.map((pr: { number: number }) => pr.number);
}

const OPEN_PR_LIST_LIMIT = 1000;

interface OpenPrDrUse {
  pr: number;
  number: number;
}

function openPrDrUses(drDir: string): OpenPrDrUse[] {
  const [inside, topLevel, drDirPrefix = ""] = runOrUnavailable(
    "git",
    ["rev-parse", "--is-inside-work-tree", "--show-toplevel", "--show-prefix"],
    drDir,
  ).split("\n");
  if (inside !== "true") {
    throw new OpenPrCheckUnavailable(`${drDir} is not inside a git work tree`);
  }
  const gh = process.env.CLAUDE_GH_BIN || "gh";
  const prs = parsePrNumbers(
    runOrUnavailable(
      gh,
      ["pr", "list", "--state", "open", "--json", "number", "--limit", String(OPEN_PR_LIST_LIMIT)],
      topLevel,
    ),
  );
  const uses: OpenPrDrUse[] = [];
  for (const pr of prs) {
    const names = runOrUnavailable(gh, ["pr", "diff", String(pr), "--name-only"], topLevel);
    for (const path of names.split("\n")) {
      if (!path.startsWith(drDirPrefix)) continue;
      const rest = path.slice(drDirPrefix.length);
      if (rest.includes("/")) continue;
      const number = drNumber(rest);
      if (number !== null) uses.push({ pr, number });
    }
  }
  return uses;
}

const pad = (n: number): string => String(n).padStart(4, "0");

function highestUsedNumber(drDir: string, localMax: number): number {
  let uses: OpenPrDrUse[];
  try {
    uses = openPrDrUses(drDir);
  } catch (error) {
    if (!(error instanceof OpenPrCheckUnavailable)) throw error;
    process.stderr.write(
      `pre-check: could not check open pull requests (${error.message});` +
        ` returning ${pad(localMax + 1)}, the local maximum plus one\n`,
    );
    return localMax;
  }
  const ahead = uses.filter((use) => use.number > localMax).sort((a, b) => a.number - b.number);
  if (ahead.length === 0) return localMax;
  const highest = ahead[ahead.length - 1].number;
  const used = ahead.map((use) => `${pad(use.number)} (#${use.pr})`).join(", ");
  process.stderr.write(
    `pre-check: open pull requests already use ${used};` +
      ` returning ${pad(highest + 1)} instead of ${pad(localMax + 1)}\n`,
  );
  return highest;
}

// Python's main() takes no argv of its own (title comes from sys.argv[1]), so this main(argv)
// takes process.argv.slice(2).
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

  let localMax = 0;
  for (const entry of readdirSync(drDir)) {
    localMax = Math.max(localMax, drNumber(entry) ?? 0);
  }
  const nextNumber = pad(highestUsedNumber(drDir, localMax) + 1);

  const slug = title
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  const similarDrs = collectSimilarDrs(title, drDir, threshold);

  const date = localDate(new Date());

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
