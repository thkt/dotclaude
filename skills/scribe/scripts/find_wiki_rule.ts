#!/usr/bin/env node
/// <reference types="node" />
// Usage: find_wiki_rule.ts <wiki-dir> <slug> [file ...] [--scene <scene>]
//
// Ranks the rule pages under <wiki-dir> for a task. A page whose globs match one of the given
// files is a hard match; a page whose filename shares a word with the slug is a soft one.
// `--scene` additionally lists pages whose frontmatter `scenes` includes it; the value must
// come from SCENES, or the run exits 2.
//
// stdout: JSON { matched: [{page, globs, files}], related: [{page, shared}] } normally,
//         plus scenes: [page] when --scene is given
// exit: 0, or 2 on a missing argument or an unknown --scene value
//
// TypeScript port of the retired Python original, mirroring skills/_lib/harness_hash.ts's
// own header and its isMainModule(import.meta.url) entry point. Carries SCENES / NOT_A_RULE /
// glob_to_regexp / normalize / read_globs / read_scenes / words / find / _split_scene_flag /
// main, in node:* only.
//
// Contract: the retired Python original's own behavior, pinned by the fixture
// skills/scribe/tests/fixtures/find-wiki-rule-cases.json (U-001). Exercised by
// skills/scribe/tests/find-wiki-rule.test.ts.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// README indexes the directory and _candidates holds rows below the threshold. Neither is a
// rule.
const NOT_A_RULE = new Set(["README.md", "_candidates.md"]);

// The closed set of values a page's frontmatter `scenes` may declare. Importing this in the
// wiki-page contract test, rather than restating the list there, keeps that test and this
// module from drifting to two different closed sets.
export const SCENES: string[] = ["plan", "implement", "issue-create", "pr-create", "issue-close"];

export interface Matched {
  page: string;
  globs: string[];
  files: string[];
}

export interface Related {
  page: string;
  shared: number;
}

export interface Report {
  matched: Matched[];
  related: Related[];
  scenes: string[];
}

// The same subset workflows/code.js's globToRegExp accepts: `**/` crosses directories, `*`
// stops at one. Keeping the two in step is what glob-parity guards; widening one side alone
// would make a page reach an implementation the other side never routes to.
const SEGMENT = /(\*\*\/|\*)/;
const ESCAPE = /[.+^${}()|[\]\\]/g;

export function globToRegExp(glob: string): RegExp {
  const body = glob
    .split(SEGMENT)
    .map((part) =>
      part === "**/" ? "(?:.*/)?" : part === "*" ? "[^/]*" : part.replace(ESCAPE, "\\$&"),
    )
    .join("");
  return new RegExp(`^${body}$`);
}

/** Strips a leading `./` or `/` so the prefix does not decide the match. */
function normalize(path: string): string {
  return path.replace(/^(?:\.\/|\/)+/, "");
}

/** Following the closing delimiter rather than a fixed line count is what lets a page order
 * `scenes` ahead of `globs` without pushing `globs` out of view. */
function frontmatterLines(pagePath: string): string[] {
  const lines = readFileSync(pagePath, "utf8").split("\n");
  if (lines.length === 0 || lines[0] !== "---") return [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(1, i);
  }
  return [];
}

/** A value that is not an array reads as empty: iterating `globs: "**\/*"` as written turns
 * each character into a glob, which makes the page look like it matches every file. */
function arrayFromFrontmatter(lines: readonly string[], key: string): string[] {
  const prefix = `${key}:`;
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      let value: unknown;
      try {
        value = JSON.parse(line.slice(prefix.length).trim());
      } catch {
        return [];
      }
      if (!Array.isArray(value)) return [];
      return (value as unknown[]).filter((g): g is string => typeof g === "string");
    }
  }
  return [];
}

export function readGlobs(pagePath: string): string[] {
  return arrayFromFrontmatter(frontmatterLines(pagePath), "globs");
}

export function readScenes(pagePath: string): string[] {
  return arrayFromFrontmatter(frontmatterLines(pagePath), "scenes");
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[-_\s]+/)
      .filter((w) => w.length > 0),
  );
}

export function find(
  wikiDir: string,
  slug: string,
  files: readonly string[],
  scene?: string,
): Report {
  // SCENES is the closed set a --scene value is checked against. Checking against what the
  // pages happen to declare would make a valid scene with no pages yet an error, which kills
  // the caller's pre-existing matched flow.
  if (scene !== undefined && !SCENES.includes(scene)) {
    throw new Error(`unknown scene: '${scene}'`);
  }

  const pages = readdirSync(wikiDir)
    .filter((name) => name.endsWith(".md") && !NOT_A_RULE.has(name))
    .sort();
  const normalizedFiles = files.map(normalize);
  const slugWords = words(slug);

  const matched: Matched[] = [];
  const related: Related[] = [];
  const scenes: string[] = [];
  for (const pageName of pages) {
    const lines = frontmatterLines(join(wikiDir, pageName));
    const globs = arrayFromFrontmatter(lines, "globs");
    const hits = normalizedFiles.filter((f) =>
      globs.some((g) => globToRegExp(normalize(g)).test(f)),
    );
    if (hits.length > 0) {
      matched.push({ page: pageName, globs, files: hits });
    } else {
      const stem = pageName.slice(0, -".md".length);
      const shared = [...words(stem)].filter((w) => slugWords.has(w)).length;
      if (shared > 0) related.push({ page: pageName, shared });
    }
    if (scene !== undefined && arrayFromFrontmatter(lines, "scenes").includes(scene)) {
      scenes.push(pageName);
    }
  }

  // A page whose rule bears on a file this plan touches outranks one that only shares a word.
  matched.sort((a, b) => b.files.length - a.files.length);
  related.sort((a, b) => b.shared - a.shared);
  return { matched, related, scenes };
}

/** Pulls a `--scene <value>` pair out of argv, returning the rest as positional args. */
function splitSceneFlag(argv: readonly string[]): [string[], string | undefined] {
  const i = argv.indexOf("--scene");
  if (i === -1 || i + 1 >= argv.length) return [[...argv], undefined];
  return [[...argv.slice(0, i), ...argv.slice(i + 2)], argv[i + 1]];
}

const USAGE = "Usage: find_wiki_rule.ts <wiki-dir> <slug> [file ...] [--scene <scene>]\n";

export function main(argv: readonly string[]): number {
  const [positional, scene] = splitSceneFlag(argv);
  if (positional.length < 2) {
    process.stderr.write(USAGE);
    return 2;
  }
  const [wikiDir, slug, ...files] = positional;

  let report: Report;
  try {
    report = find(wikiDir, slug, files, scene);
  } catch (error) {
    process.stderr.write(`find_wiki_rule: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }

  // Preserving the pre-scene 2-key shape when --scene is absent is what keeps every existing
  // caller (skills/think, skills/fix) byte-for-byte unaffected by this axis's addition.
  const output: Record<string, unknown> = { matched: report.matched, related: report.related };
  if (scene !== undefined) {
    output.scenes = report.scenes;
  }
  process.stdout.write(`${JSON.stringify(output)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
