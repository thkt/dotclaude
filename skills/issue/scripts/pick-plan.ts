#!/usr/bin/env node
/// <reference types="node" />
// Usage: pick-plan.ts <issue-title | plan-path> [planning-dir]
//
// A path extracts that draft's sections; a title ranks the drafts in planning-dir.
//
// stdout: JSON { path, slug, date, plan, backlog, candidates, ambiguous }
//         path       chosen file, or null when zero or several drafts score
//         plan       the `## Plan` section including its heading, or null
//         backlog    the `## Backlog candidates` section including its heading, or null
//         candidates every draft newest first, each { path, slug, date, score }
//         ambiguous  true when several drafts tie the top score
// exit: 0 always, including no match. A missing directory is a no-match, not a failure: an
//       issue filed before any planning happened is the normal case and must not stop the
//       skill. 1 only when the required <issue-title | plan-path> argument is missing.
//
// TypeScript port of pick-plan.py. Contract: pick-plan.py's slugify / scoring_words / section /
// extracted / rank / main. Exercised by skills/issue/tests/pick-plan.test.ts. Python's
// snake_case names carry over as TS camelCase (scoring_words -> scoringWords); rank, slugify,
// and section are exported for the tests, the rest stay module-private the way harness_hash.ts
// keeps its own internals private.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// The date comes from the name because no tool the issue skill may use reports mtime.
const NAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.plan\.md$/;

// A relative path deliberately left unresolved against the script's own location: like
// pick-plan.py's `Path(".claude/workspace/planning")`, it is read against the caller's cwd.
const DEFAULT_DIR = ".claude/workspace/planning";

interface Draft {
  path: string;
  slug: string;
  date: string;
  score: number;
}

interface Extracted {
  path: string;
  slug: string | null;
  date: string | null;
  plan: string | null;
  backlog: string | null;
}

interface PickPlanResult {
  path: string | null;
  slug: string | null;
  date: string | null;
  plan: string | null;
  backlog: string | null;
  candidates: Draft[];
  ambiguous: boolean;
}

/** The title reduced to /think's slug shape: lowercase, hyphen-separated.
 *
 * The type prefix goes first. `[Feature] Add CSV export` is filed under add-csv-export, so
 * leaving the bracket in would stop every title from matching its own draft.
 */
export function slugify(title: string): string {
  let text = title.normalize("NFKC");
  text = text.replace(/^\[[A-Za-z]+\]\s*/, "");
  // \w is Unicode-aware in Python; \p{L}\p{N}_ under the u flag is the same class in JS.
  text = text.replace(/[^\p{L}\p{N}_\s-]/gu, " ");
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .join("-")
    .toLowerCase();
}

/** The words that count toward a score. Two letters or fewer match every slug. */
function scoringWords(slug: string): Set<string> {
  return new Set(slug.split("-").filter((word) => word.length > 2));
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const word of a) {
    if (b.has(word)) count += 1;
  }
  return count;
}

/** One `## <name>` section including its heading, up to the next h2 or the end. */
export function section(text: string, name: string): string | null {
  const headings = /^## (.+?)\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = headings.exec(text)) !== null) {
    if (match[1] !== name) continue;
    const rest = text.slice(match.index + match[0].length);
    const following = /^## (.+?)\s*$/m.exec(rest);
    const body = following ? rest.slice(0, following.index) : rest;
    return `${match[0]}${body}`.trimEnd() + "\n";
  }
  return null;
}

/** The output values read from one draft. */
function extracted(path: string): Extracted {
  const text = readFileSync(path, "utf8");
  const parsed = NAME.exec(basename(path));
  return {
    path,
    slug: parsed ? parsed[2] : null,
    date: parsed ? parsed[1] : null,
    plan: section(text, "Plan"),
    backlog: section(text, "Backlog candidates"),
  };
}

/** Every draft in the directory, highest score first and newest first within a tie. */
export function rank(title: string, directory: string): Draft[] {
  const wanted = scoringWords(slugify(title));
  const rows: Draft[] = [];
  if (existsSync(directory) && statSync(directory).isDirectory()) {
    const names = readdirSync(directory).sort();
    for (const name of names) {
      const parsed = NAME.exec(name);
      if (!parsed) continue;
      const slug = parsed[2];
      rows.push({
        path: join(directory, name),
        slug,
        date: parsed[1],
        score: intersectionSize(wanted, scoringWords(slug)),
      });
    }
  }
  // Stable descending sort on (score, date): Python's `reverse=True` on a stable sort keeps
  // equal-key rows in their original (ascending-name) order rather than reversing them.
  rows.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.date === b.date) return 0;
    return a.date < b.date ? 1 : -1;
  });
  return rows;
}

function main(argv: string[]): number {
  if (argv.length < 1) {
    process.stderr.write("Usage: pick-plan.ts <issue-title | plan-path> [planning-dir]\n");
    return 1;
  }
  const directory = argv.length > 1 ? argv[1] : DEFAULT_DIR;

  const result: PickPlanResult = {
    path: null,
    slug: null,
    date: null,
    plan: null,
    backlog: null,
    candidates: [],
    ambiguous: false,
  };

  const given = argv[0];
  if (extname(given) === ".md" && existsSync(given) && statSync(given).isFile()) {
    Object.assign(result, extracted(given));
  } else {
    const rows = rank(given, directory);
    const scored = rows.filter((row) => row.score > 0);
    const top = scored.length > 0 ? scored.filter((row) => row.score === scored[0].score) : [];
    result.candidates = rows;
    result.ambiguous = top.length > 1;
    if (top.length === 1) {
      Object.assign(result, extracted(top[0].path));
    }
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
