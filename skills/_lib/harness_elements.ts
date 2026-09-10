#!/usr/bin/env node
/// <reference types="node" />
// Usage: harness_elements.ts <repo-root>
//
// Enumerates the harness files under <repo-root> matching POPULATION_GLOBS and classifies each
// into one of always-loaded / path-triggered / glob-triggered / non-prompt.
//
// stdout: JSON array of { path, classification }, path relative to <repo-root>
// exit: 0 on success, 2 without an argument
//
// Names stay snake_case -- ALWAYS_LOADED, PATH_TRIGGERED, GLOB_TRIGGERED, NON_PROMPT,
// POPULATION_GLOBS, _frontmatter_lines, _unquote, _read_array, classify, enumerate_elements,
// main -- not camelCased the way review_score.ts renamed its own Python source, the shape
// skills/ablate/scripts/arms.ts also keeps.
//
// Not a from-scratch YAML parser: the two frontmatter shapes in play (`globs: [...]` on one
// line, `paths:` followed by `  - "..."` lines) are narrow enough that hand-parsing the two
// shapes stays smaller than adding a dependency for them (rules/PRINCIPLES.md Reuse Ordering).
import { globSync, readFileSync, statSync } from "node:fs";
import { extname, join, sep } from "node:path";
import { isMainModule } from "../../workflows/_lib/entry-point.ts";
import { pythonJsonStringify } from "./python_json.ts";

export const ALWAYS_LOADED = "always-loaded";
export const PATH_TRIGGERED = "path-triggered";
export const GLOB_TRIGGERED = "glob-triggered";
export const NON_PROMPT = "non-prompt";

// The population's supply list, held as a script constant rather than a prose contract
// (docs/wiki/harness-production-divergence.md).
//
// The scripts/ and hooks/ patterns each carry a .py glob and a .ts glob: skills/ablate/scripts/
// and hooks/**/ have each moved files from one extension to the other (#643 / #684 / #644 /
// #645 moved hooks to .ts; this same retirement slice moves ablate's own scripts), and a glob
// counting only the .py extension would drop every file such a move already made -- including
// ablate's own script tree once it is all .ts, which would make the skill stop measuring
// itself.
//
// Every pattern is anchored on a literal top-level segment (never on a bare "**"), so a
// `.ja/` mirror living beside each of these trees is never traversed by these globs: one
// canonical match is one population member, and rules/conventions/MIRROR.md's "a file and
// its .ja mirror count as one element" holds by construction rather than by a dedup pass.
export const POPULATION_GLOBS: readonly string[] = [
  "rules/**/*.md",
  "docs/wiki/**/*.md",
  "CLAUDE.md",
  "skills/**/*.md",
  "skills/**/scripts/*.py",
  "skills/**/scripts/*.ts",
  "agents/**/*.md",
  "hooks/**/*.py",
  "hooks/**/*.ts",
  "hooks/**/*.md",
];

export interface HarnessElement {
  path: string;
  classification: string;
}

/** The lines strictly between the opening and closing `---` delimiters, or null when the
 * file carries no frontmatter block at all (distinct from an empty block). */
export function _frontmatter_lines(path: string): string[] | null {
  const lines = readFileSync(path, "utf8").split("\n");
  if (lines.length === 0 || lines[0] !== "---") {
    return null;
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      return lines.slice(1, i);
    }
  }
  return null;
}

export function _unquote(item: string): string {
  if (
    item.length >= 2 &&
    item[0] === item[item.length - 1] &&
    (item[0] === "'" || item[0] === '"')
  ) {
    return item.slice(1, -1);
  }
  return item;
}

/** Reads a frontmatter array in either shape this repo's harness files use: a single-line
 * JSON array (`globs: ["a", "b"]`) or a multi-line YAML dash list (`paths:` followed by
 * `  - "a"` lines). */
export function _read_array(lines: string[], key: string): string[] {
  const prefix = `${key}:`;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith(prefix)) {
      continue;
    }
    const rest = line.slice(prefix.length).trim();
    if (rest) {
      let value: unknown;
      try {
        value = JSON.parse(rest);
      } catch {
        return [];
      }
      if (!Array.isArray(value)) {
        return [];
      }
      return value.filter((v): v is string => typeof v === "string");
    }
    const items: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const stripped = lines[j].trim();
      if (!stripped.startsWith("-")) {
        break;
      }
      items.push(_unquote(stripped.slice(1).trim()));
    }
    return items;
  }
  return [];
}

/** Classifies one harness file. Read top to bottom, first match taken
 * (skills/census/SKILL.md Phase 4's table shape): a non-.md file is never prompt
 * content; a rules/**\/*.md file (or the root CLAUDE.md) with no frontmatter is always
 * loaded and one carrying a non-empty `paths` key is path-triggered; a docs/wiki/**\/*.md
 * page with a non-empty `globs` key is glob-triggered. Everything else the population
 * can hold (a SKILL.md invoked by name, a reviewer definition loaded only when spawned,
 * a script that is executed rather than injected as prose) is non-prompt. */
export function classify(path: string): string {
  if (extname(path) !== ".md") {
    return NON_PROMPT;
  }

  const parts = path.split(sep);
  const name = parts[parts.length - 1];
  const lines = _frontmatter_lines(path);

  if (parts.includes("rules") || name === "CLAUDE.md") {
    if (lines === null) {
      return ALWAYS_LOADED;
    }
    if (_read_array(lines, "paths").length > 0) {
      return PATH_TRIGGERED;
    }
    return NON_PROMPT;
  }

  if (parts.includes("docs") && parts.includes("wiki")) {
    if (lines !== null && _read_array(lines, "globs").length > 0) {
      return GLOB_TRIGGERED;
    }
    return NON_PROMPT;
  }

  return NON_PROMPT;
}

/** Scans POPULATION_GLOBS under root and classifies each match. A pattern never reaches into
 * `.ja/`, so a mirrored file surfaces once, through its canonical side alone. */
export function enumerate_elements(root: string): HarnessElement[] {
  const seen = new Map<string, HarnessElement>();
  for (const pattern of POPULATION_GLOBS) {
    for (const rel of globSync(pattern, { cwd: root })) {
      const absolute = join(root, rel);
      if (!statSync(absolute).isFile()) {
        continue;
      }
      if (!seen.has(rel)) {
        seen.set(rel, { path: rel, classification: classify(absolute) });
      }
    }
  }
  return [...seen.keys()].sort().map((key) => seen.get(key) as HarnessElement);
}

// The wire format has to follow json.dumps' byte-for-byte spacing, not JSON.stringify's default
// -- see python_json.ts's header for why, and for the shared encoder every CLI in this family
// reuses instead of hand-building its own braces.
//
// Python's main(argv) takes sys.argv (script name included), so `len(argv) != 2` there is
// this CLI's `argv.length !== 1` here: main() receives process.argv.slice(2), the same argv
// convention harness_hash.ts's main() uses.
export function main(argv: string[]): number {
  if (argv.length !== 1) {
    process.stderr.write("Usage: harness_elements.ts <repo-root>\n");
    return 2;
  }
  const elements = enumerate_elements(argv[0]);
  process.stdout.write(`${pythonJsonStringify(elements)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
