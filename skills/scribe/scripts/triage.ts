#!/usr/bin/env node
/// <reference types="node" />
// Usage: triage.ts '<JSON array of patterns>' <candidates-file>
//
// Each element is {name, evidence: [str], existing: "page"|"candidate"|"none"}. The array carries
// what this run extracted; the candidate store is read here rather than passed in, so a run
// cannot leave the carried-over rows out of the ranking.
//
// stdout: JSON { pages, candidates, deferred, commits }
// exit: 0, or 2 when an argument is missing
//
// TypeScript port of the retired Python original, mirroring skills/scribe/scripts/find_wiki_rule.ts's
// own header and its isMainModule(import.meta.url) entry point. Carries EVIDENCE_THRESHOLD /
// PAGE_CAP / COMMIT_CAP / ACTION / STORE_SECTIONS / EVIDENCE / triage / readStore / merge / main,
// in node:* only.
//
// Contract: the retired Python original's own behavior, pinned by the fixture
// skills/scribe/tests/fixtures/triage-cases.json (U-001). Exercised by
// skills/scribe/tests/triage.test.ts.
import { existsSync, readFileSync, statSync } from "node:fs";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// The three places a pattern this run saw may already live.
export type Existing = "page" | "candidate" | "none";

// Python's Pattern TypedDict. A fresh element from the caller's array carries no `section`; a
// row read_store/readStore rebuilds from the accumulated store attaches one.
export interface Pattern {
  name?: string;
  evidence?: string[];
  existing?: Existing;
  section?: string;
}

interface Row {
  name: string;
  count: number;
  evidence: string[];
  existing: string;
  section?: string;
}

export interface Triaged extends Row {
  action: string;
}

export interface Report {
  pages: Triaged[];
  candidates: Triaged[];
  deferred: Triaged[];
  commits: Triaged[][];
}

// A pattern with fewer than two pieces of evidence does not become a page. One piece cannot
// show recurrence, and pageifying it turns a one-off circumstance into a convention.
export const EVIDENCE_THRESHOLD = 2;

// How many pages one commit moves. Candidate appends and reference repairs are not counted.
export const PAGE_CAP = 3;

// How many commits one run moves. Provisional: revisit once the first multi-commit PR's merge
// time is measured.
export const COMMIT_CAP = 3;

// Which verb an already-triaged pattern's existing home implies for this run.
const ACTION: Record<string, string> = { page: "update", candidate: "promote", none: "create" };

// The candidate store's two headings, in the order read_store/readStore recognizes them.
const STORE_SECTIONS = ["## 昇格待ち", "## 単発"] as const;

// A store row's evidence markers: a GitHub reference number, or a bare "(research)" tag.
const EVIDENCE = /#\d+|\(research\)/g;

function toRow(pattern: Pattern): Row {
  const evidence = pattern.evidence ?? [];
  const row: Row = {
    name: pattern.name ?? "",
    count: evidence.length,
    evidence,
    existing: pattern.existing ?? "none",
  };
  if (pattern.section !== undefined) {
    row.section = pattern.section;
  }
  return row;
}

export function triage(patterns: readonly Pattern[]): Report {
  const rows = patterns.map(toRow);

  const candidates: Triaged[] = rows
    .filter((r) => r.count < EVIDENCE_THRESHOLD)
    .map((r) => ({ ...r, action: "candidate" }));

  // Array.prototype.sort is stable since ES2019, so patterns tied on evidence count keep their
  // input order and the same input never splits differently between runs.
  const promoted: Triaged[] = rows
    .filter((r) => r.count >= EVIDENCE_THRESHOLD)
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ ...r, action: ACTION[r.existing] ?? "" }));

  // deferred now carries what the commit cap left behind, not what the page cap did.
  const commits: Triaged[][] = [];
  for (let i = 0; i < promoted.length; i += PAGE_CAP) {
    commits.push(promoted.slice(i, i + PAGE_CAP));
  }
  const cappedCommits = commits.slice(0, COMMIT_CAP);
  const pages = cappedCommits.flat();

  return {
    pages,
    candidates,
    deferred: promoted.slice(pages.length),
    commits: cappedCommits,
  };
}

/** Phase 1 creates the store inside Phase 6's worktree, so the first run has none. */
export function readStore(path: string): Pattern[] {
  if (!existsSync(path) || !statSync(path).isFile()) {
    return [];
  }
  const rows: Pattern[] = [];
  const dropped: string[] = [];
  let section: string | undefined;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.startsWith("## ")) {
      const heading = STORE_SECTIONS.find((s) => line.startsWith(s));
      section = heading?.slice("## ".length);
      continue;
    }
    if (section === undefined || !line.startsWith("- ")) {
      continue;
    }
    const body = line.slice(2);
    const evidence = body.match(EVIDENCE) ?? [];
    const name = body.replace(EVIDENCE, "").trim();
    if (name) {
      rows.push({ name, evidence, existing: "candidate", section });
    } else {
      dropped.push(line);
    }
  }
  // Not stdout: the report there is a closed 4-key object the skill parses.
  if (dropped.length > 0) {
    process.stderr.write(
      `triage.ts: skipped ${dropped.length} candidate row(s) carrying no body\n`,
    );
    for (const line of dropped) {
      process.stderr.write(`  ${line}\n`);
    }
  }
  return rows;
}

/** Fresh first would let a pattern tying on evidence count displace one that already waited a
 * run, since sorted is stable. The accumulated row's front position is decided here, and
 * overwriting its existing from fresh below does not disturb that. */
export function merge(store: readonly Pattern[], fresh: readonly Pattern[]): Pattern[] {
  const merged: Array<Pattern & { evidence: string[] }> = [];
  const index = new Map<string, number>();
  for (const p of [...store, ...fresh]) {
    const name = p.name ?? "";
    const at = index.get(name);
    if (at === undefined) {
      index.set(name, merged.length);
      merged.push({ ...p, evidence: [...(p.evidence ?? [])] });
      continue;
    }
    const seen = merged[at].evidence;
    for (const e of p.evidence ?? []) {
      if (!seen.includes(e)) {
        seen.push(e);
      }
    }
    // The accumulated row's existing is only the fixed value read_store attached. Which side
    // fresh saw the same name on this time is what the row actually is now, so it wins.
    if (p.existing !== undefined) {
      merged[at].existing = p.existing;
    }
  }
  return merged;
}

const USAGE = "usage: triage.ts '<JSON array of patterns>' <candidates-file>\n";

export function main(argv: readonly string[]): number {
  if (argv.length < 2) {
    process.stderr.write(USAGE);
    return 2;
  }
  const fresh = JSON.parse(argv[0]) as Pattern[];
  const rows = merge(readStore(argv[1]), fresh);
  process.stdout.write(`${JSON.stringify(triage(rows))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
