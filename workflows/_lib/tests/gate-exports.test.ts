/// <reference types="node" />
// knip.json lists workflows/_lib/gate.ts (and its .ja mirror) as an `entry` point, so knip's
// unused-export report never flags a name this file exports but nothing else reads -- entry
// files are allowed to carry an API surface knip cannot trace to a caller. That suppression is
// right for `main` (the process that spawns the file is the reader, not an importer) but wrong
// for every other export: a name with no reader anywhere else is dead weight knip's own report
// cannot catch here. This file is that catch: it re-derives, independently of knip, which of
// gate.ts's runtime-value exports (`export const` / `export function` / `export class`; a
// type-only `export interface` carries no importable value and sits outside this check) no
// tracked file outside gate.ts and its .ja mirror ever names, anywhere in that file's own text --
// a broad "reader" search, not a strict `import {}` parse, because a name can be read by a
// source-as-text check (workflows/tests/gate-flags-ssot.test.js reads gate.ts's DEFAULT_* consts
// that way) as much as by an ES import.
//
// T-429 is this predicate's positive control (docs/wiki/absence-test-positive-control-fixture.md):
// a literal fixture source and file list prove the predicate can still flag an unread export,
// and a paired case proves it does not flag one a reader names. Without that control, T-428
// staying green would be as consistent with "the predicate stopped checking" as with "gate.ts
// is clean".
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const GATE_PATH = join(REPO_ROOT, "workflows", "_lib", "gate.ts");
const GATE_JA_PATH = join(REPO_ROOT, ".ja", "workflows", "_lib", "gate.ts");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const VALUE_EXPORT_PATTERN = /^export (?:const|function|class) ([A-Za-z_$][\w$]*)/gm;

/** The runtime-value export names `source` declares. `export interface` / `export type` are
 * not in scope: they erase at compile time, so "nothing imports this" carries no runtime cost
 * the way an unread const or function does. */
function valueExportNames(source: string): string[] {
  return [...source.matchAll(VALUE_EXPORT_PATTERN)].map((match) => match[1]);
}

/** The names `valueExportNames(source)` reports that no path in `files` names anywhere in the
 * text `read` returns for it. `read` is injected (same shape as
 * workflows/_lib/tests/_retirement.ts's offendersAmong) so the positive control below can drive
 * this against a literal in-memory tree instead of the real one. `main` is exempt: as this
 * module's entry point it is read by the process that spawns the file, never by an importer, so
 * no tracked file needs to name it either. */
function unreadExportNames(
  source: string,
  files: readonly string[],
  read: (path: string) => string,
): string[] {
  const unread: string[] = [];
  for (const name of valueExportNames(source)) {
    if (name === "main") continue;
    const namesIt = new RegExp(`\\b${name}\\b`);
    const hasReader = files.some((path) => {
      let content: string;
      try {
        content = read(path);
      } catch {
        // Not decodable as text (e.g. a binary fixture): it cannot name the export either.
        return false;
      }
      return namesIt.test(content);
    });
    if (!hasReader) unread.push(name);
  }
  return unread;
}

let trackedFilesCache: string[] | null = null;

/** Every path `git ls-files` reports under REPO_ROOT, cached: the tree does not change while
 * this test file runs. Same source and shape as workflows/_lib/tests/_retirement.ts's
 * trackedFiles -- not imported from there because that module's cache is keyed by repoRoot for
 * three retirement tests sharing one process; this file only ever queries REPO_ROOT once. */
function trackedFiles(): string[] {
  if (trackedFilesCache === null) {
    trackedFilesCache = execFileSync("git", ["ls-files", "-z"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean);
  }
  return trackedFilesCache;
}

const readRepoFile = (path: string): string => readFileSync(join(REPO_ROOT, path), "utf8");

test("gate.ts's export list contains only the names a tracked file outside gate.ts imports, plus main", () => {
  const source = readRepoFile(relative(REPO_ROOT, GATE_PATH));
  const excludePaths = new Set([
    relative(REPO_ROOT, GATE_PATH),
    relative(REPO_ROOT, GATE_JA_PATH),
    SELF_PATH,
  ]);
  const candidateFiles = trackedFiles().filter((path) => !excludePaths.has(path));
  const unread = unreadExportNames(source, candidateFiles, readRepoFile);
  assert.deepEqual(
    unread,
    [],
    `gate.ts exports with no reader outside gate.ts (drop \`export\` from these, or add the ` +
      `reader that is missing): ${unread.join(", ")}`,
  );
});

test("the same predicate flags a fixture module that exports a name nothing imports", () => {
  // Built as a literal, not from a name this file also uses to check gate.ts -- constructing it
  // from a shared constant would let a typo in that constant go unnoticed by both sides
  // (docs/wiki/absence-test-positive-control-fixture.md).
  const unreadName = "FIXTURE_VALUE_NOTHING_IN_THIS_TREE_IMPORTS_9f2c";
  const readName = "FIXTURE_VALUE_A_FIXTURE_READER_NAMES_3ab1";
  const fixtureSource = `export const ${unreadName} = 1;\nexport const ${readName} = 2;\n`;
  const fixtureFiles = ["fixture/reader.ts"];
  const fixtureRead = (path: string): string => {
    if (path === "fixture/reader.ts") return `console.log(${readName});\n`;
    throw new Error(`no fixture content for ${path}`);
  };

  const flagged = unreadExportNames(fixtureSource, fixtureFiles, fixtureRead);
  assert.deepEqual(
    flagged,
    [unreadName],
    "flags the export a fixture reader never names, and only that one",
  );
});
