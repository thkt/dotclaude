#!/usr/bin/env node
/// <reference types="node" />
// Usage: verify_run.ts <worktree> <base>   (triage's Phase 3 report JSON on stdin)
//
// Phase 6 runs this before pushing, so a run that committed fewer elements than triage handed it
// never reaches a PR.
//
// stdout: JSON { ok, mismatches: [{field, expected, actual}] }
// exit: 0 when ok, 1 when not, 2 when an argument or the stdin report is missing
//
// TypeScript port of skills/scribe/scripts/verify_run.py, mirroring skills/scribe/scripts/triage.ts's
// own header and its isMainModule(import.meta.url) entry point. Carries COMMIT_PREFIX / WIKI_DIR /
// WAITING / REJECTED / run_commits / section_rows / _store_at / rejected_added / verify / main, in
// node:* only.
//
// Contract: skills/scribe/scripts/verify_run.py's own behavior. Exercised by
// skills/scribe/tests/verify-run.test.ts.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// Every branch point already carries earlier scribe commits wearing this prefix, so the prefix
// alone does not separate one run from the history behind it.
export const COMMIT_PREFIX = "docs(wiki):";

export const WIKI_DIR = "docs/wiki";

export const WAITING = "## 昇格待ち";
export const REJECTED = "## 棄却";
// The bare label a triage row's own `section` field carries, unlike WAITING/REJECTED above which
// carry the "## " a store heading is matched by.
const WAITING_SECTION = WAITING.slice("## ".length);

const USAGE = "usage: verify_run.ts <worktree> <base>   (triage's Phase 3 report JSON on stdin)";

export interface Mismatch {
  field: string;
  expected: number;
  actual: number;
}

export interface Report {
  ok: boolean;
  mismatches: Mismatch[];
}

// The slice of triage.ts's Triaged row this module reads. `section` is absent on a row triage
// extracted fresh this run, exactly like triage.ts's own Row.
export interface TriageRow {
  name?: string;
  section?: string;
}

// The slice of triage.ts's Report this module reads.
export interface TriageReport {
  commits: TriageRow[][];
  deferred: TriageRow[];
}

function git(repo: string, ...args: string[]): string {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

export function runCommits(repo: string, base: string): string[] {
  const out = git(repo, "log", "--reverse", "--format=%H\x1f%s", `${base}..HEAD`);
  const hashes: string[] = [];
  for (const line of out.split("\n")) {
    if (!line) continue;
    const sep = line.indexOf("\x1f");
    const subject = line.slice(sep + 1);
    if (subject.startsWith(COMMIT_PREFIX)) {
      hashes.push(line.slice(0, sep));
    }
  }
  return hashes;
}

export function sectionRows(text: string, heading: string): number {
  let inside = false;
  let count = 0;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      inside = line.startsWith(heading);
      continue;
    }
    if (inside && line.startsWith("- ")) {
      count += 1;
    }
  }
  return count;
}

function store(repo: string): string {
  try {
    return readFileSync(`${repo}/${WIKI_DIR}/_candidates.md`, "utf8");
  } catch {
    return "";
  }
}

// Not `git show`'s exit status: absent and unreadable share it, so a rev that could not be read
// would pass as no rows and the verdict would come from a store nobody read. `ls-tree` prints
// nothing for an absent path and still fails on a rev it cannot resolve.
export function storeAt(repo: string, rev: string): string {
  if (!git(repo, "ls-tree", "--name-only", rev, `${WIKI_DIR}/_candidates.md`).trim()) {
    return "";
  }
  return git(repo, "show", `${rev}:${WIKI_DIR}/_candidates.md`);
}

// Phase 4 moves a dropped item's row into `棄却` without producing a page, so a row can leave
// `昇格待ち` with no page to account for it.
export function rejectedAdded(repo: string, base: string): number {
  return sectionRows(store(repo), REJECTED) - sectionRows(storeAt(repo, base), REJECTED);
}

function buildReport(
  expectedCommits: number,
  actualCommits: number,
  expectedRemaining: number,
  actualRemaining: number,
): Report {
  const mismatches: Mismatch[] = [];
  if (actualCommits !== expectedCommits) {
    mismatches.push({ field: "commits", expected: expectedCommits, actual: actualCommits });
  }
  if (actualRemaining !== expectedRemaining) {
    mismatches.push({ field: "remaining", expected: expectedRemaining, actual: actualRemaining });
  }
  return { ok: mismatches.length === 0, mismatches };
}

// `startCount` and `expectedCommits` do not come from the caller's own count: a caller that
// miscounted, or read a stale value, could pass either one wrong and this function would have no
// way to catch it. `startCount` comes from `storeAt(repo, base)` and `expectedCommits` from
// `report.commits.length` instead, both read off record this module already holds or triage
// already produced.
export function verify(repo: string, report: TriageReport, base: string): Report {
  const expectedCommits = report.commits.length;
  const actualCommits = runCommits(repo, base).length;

  const startCount = sectionRows(storeAt(repo, base), WAITING);
  // A row committed out of `昇格待ち` clears the candidate line that held it; a row committed out
  // of any other section (`単発`, or absent on a row triage extracted fresh this run) never held
  // a line in `昇格待ち` to clear.
  let cleared = 0;
  for (const commit of report.commits) {
    for (const row of commit) {
      if (row.section === WAITING_SECTION) cleared += 1;
    }
  }
  // A row the commit cap left in `deferred` is still promotion-worthy, so the store carries it
  // under `昇格待ち` to wait for the next run. Only a row arriving from elsewhere (`単発`, or
  // fresh) is new to that section; one already there stays counted once, in startCount.
  const inflow = report.deferred.filter((row) => row.section !== WAITING_SECTION).length;
  const expectedRemaining = startCount - cleared + inflow - rejectedAdded(repo, base);
  const actualRemaining = sectionRows(store(repo), WAITING);

  return buildReport(expectedCommits, actualCommits, expectedRemaining, actualRemaining);
}

export function main(argv: readonly string[]): number {
  if (argv.length !== 2) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const [repo, base] = argv;
  // Not a positional count: a caller that miscounted, or read a stale value, would pass a wrong
  // number and this script would have no way to catch it. triage's own report is the record both
  // counts come off.
  let loaded: unknown;
  try {
    loaded = JSON.parse(readFileSync(0, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${USAGE}\n${message}\n`);
    return 2;
  }
  if (
    typeof loaded !== "object" ||
    loaded === null ||
    !Array.isArray((loaded as { commits?: unknown }).commits) ||
    !Array.isArray((loaded as { deferred?: unknown }).deferred)
  ) {
    process.stderr.write(`${USAGE}\nstdin carries no triage report with commits and deferred\n`);
    return 2;
  }
  const report = verify(repo, loaded as TriageReport, base);
  process.stdout.write(`${JSON.stringify(report)}\n`);
  return report.ok ? 0 : 1;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
