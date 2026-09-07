/// <reference types="node" />
// Shared bun-shebang and git-discovery primitives for hooks/**'s TypeScript shebang checks --
// the .ts counterpart of hooks/_lib/tests/shebang_test.py's SHEBANG / STALE_SHEBANG / EXEC_MODE
// / _tracked_entries, so a python-side check and a ts-side check reading the same constant
// cannot drift the way two copies of "#!/opt/homebrew/bin/bun" typed out separately could.
//
// DR-0114 fixes the interpreter path: settings.json runs hooks on a truncated PATH, so the
// shebang line has to resolve without a shim, and Homebrew's `#!/opt/homebrew/bin/bun` is the
// one path DR-0114 names as stable across machines (unlike bun.sh's installer default
// `~/.bun/bin/bun`, which is per-home and not a fixed path). SHEBANG is the single place that
// constant is written; every exec-bit check and every shebang-content check reads it from here
// rather than typing the literal again.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// hooks/_lib/shebang_scope.ts -> hooks/_lib -> hooks -> repo root, mirroring shebang_test.py's
// `Path(__file__).resolve().parents[3]` one level shallower (this file sits in hooks/_lib, not
// hooks/_lib/tests). Internal only: no consumer outside trackedEntries needs the repo root yet.
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** DR-0114's absolute bun interpreter path -- see the module docstring above. */
export const SHEBANG: string = "#!/opt/homebrew/bin/bun";

/** shebang_test.py's STALE_SHEBANG, generalized: the .py side's fixed literal becomes an
 * argument every check below takes instead, so this constant is the single value a real caller
 * (a future CI-wired script) and hooks/_lib/tests/shebang-ts.test.ts both pass in.
 *
 * Stale is defined per check scope. For the hooks/ checks it is this line alone, not
 * `#!/usr/bin/env node`: the two tracked .ts files carrying that line, skills/_lib/harness_hash.ts
 * and workflows/_lib/gate.ts, sit outside hooks/ and never enter these checks' subject set, and
 * DR-0114's absolute-path requirement applies to hook entry points only. */
export const STALE_SHEBANG: string = "#!/usr/bin/env bun";

// shebang_test.py's EXEC_MODE, mirrored: an internal detail of executableShebangOffenders' and
// settingsCommandShebangOffenders' own git-mode comparison, not a value any caller passes in, so
// it stays unexported.
const EXEC_MODE = "100755";

// The positive-control fixtures under this directory (docs/wiki/absence-test-positive-control-
// fixture.md) must never enter a broad hooks/-wide scan's real-subject set, but a caller that
// names a fixture path directly (or that already supplies its own exclude pathspec) means it,
// so the default exclusion below applies only when neither is true -- see trackedEntries.
export const FIXTURES_ROOT = "hooks/_lib/tests/fixtures";
const DEFAULT_FIXTURES_EXCLUDE = `:(exclude)${FIXTURES_ROOT}/**`;

function isExcludePathspec(token: string): boolean {
  return token.startsWith(":(exclude)") || token.startsWith(":!");
}

function targetsFixtures(token: string): boolean {
  return token.includes(FIXTURES_ROOT);
}

/** (git file mode, absolute path) for every file the discovery pathspec matches.
 *
 * Spawns real git rather than reimplementing its include/exclude resolution -- `--cached`
 * covers tracked files the way shebang_test.py's plain `git ls-files -s` did, and `--others
 * --exclude-standard` adds untracked-but-not-.gitignored files so a new .ts script is in scope
 * before its first `git add`. `--others` entries carry no stage/mode field, so their mode reads
 * as "" (an entry can never legitimately claim EXEC_MODE without git having staged it).
 *
 * `pattern` accepts either one pathspec or several -- git unions include tokens and subtracts
 * `:(exclude)`-magic ones within a single `--` argument list, so an array of tokens (an include
 * glob plus a caller-supplied exclude, as hooks/_lib/tests/shebang-ts.test.ts's real-subject
 * checks pass) resolves in one git call rather than a per-token reimplementation.
 *
 * When the caller supplies neither an exclude token nor a pattern that itself names a path under
 * fixtures/, this appends the default fixtures exclude above so a hooks/-wide scan never returns
 * positive-control fixture data on its own; a pathspec that already targets (or already excludes)
 * fixtures/ is left as the caller wrote it, so a direct fixture lookup still finds its file. */
export function trackedEntries(
  pattern: string | readonly string[],
): Array<[mode: string, absolutePath: string]> {
  const tokens = typeof pattern === "string" ? [pattern] : [...pattern];
  const hasExplicitExclude = tokens.some(isExcludePathspec);
  const includesFixturesDirectly = tokens
    .filter((token) => !isExcludePathspec(token))
    .some(targetsFixtures);
  const gitPathspecs =
    hasExplicitExclude || includesFixturesDirectly ? tokens : [...tokens, DEFAULT_FIXTURES_EXCLUDE];

  const output = execFileSync(
    "git",
    [
      "-C",
      REPO,
      "ls-files",
      "-s",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      ...gitPathspecs,
    ],
    { encoding: "utf8" },
  );
  const entries: Array<[string, string]> = [];
  for (const line of output.split("\n")) {
    if (!line) continue;
    // A `--others` entry is the bare path with no stage field, so it carries no tab.
    const tab = line.indexOf("\t");
    const rel = tab === -1 ? line : line.slice(tab + 1);
    const mode = tab === -1 ? "" : (line.slice(0, tab).split(" ")[0] ?? "");
    entries.push([mode, path.join(REPO, rel)]);
  }
  return entries;
}

/** shebang_test.py's `_first_line`: the file's first line, without its trailing newline. Reads
 * as utf8 like the python side's `encoding="utf-8"` open. */
function firstLine(absolutePath: string): string {
  const text = readFileSync(absolutePath, "utf8");
  const newline = text.indexOf("\n");
  return newline === -1 ? text : text.slice(0, newline);
}

/** shebang_test.py's ExecutableShebang.test_T_001, generalized to take the pathspec and the
 * expected shebang as arguments instead of the fixed `hooks/*.py` + SHEBANG pair, so
 * hooks/_lib/tests/shebang-ts.test.ts can point the same function at hooks/'s real .ts files
 * and, separately, at a positive-control fixture (docs/wiki/absence-test-positive-control-
 * fixture.md). */
export function executableShebangOffenders(
  pathspec: string | readonly string[],
  shebang: string,
): string[] {
  const offenders: string[] = [];
  for (const [mode, absolutePath] of trackedEntries(pathspec)) {
    if (mode !== EXEC_MODE) continue;
    if (firstLine(absolutePath) !== shebang) {
      offenders.push(path.relative(REPO, absolutePath));
    }
  }
  return offenders;
}

/** shebang_test.py's NoStaleShebang.test_T_002, generalized the same way: `pathspec` replaces
 * the fixed `hooks/*` scan and `staleLine` replaces the fixed STALE_SHEBANG literal. Skips
 * entries that are not a readable file (a `--others` entry can name a path git still lists but
 * that no longer exists on disk), mirroring the python side's `is_file()` guard; readFileSync's
 * `utf8` decoding never throws on invalid bytes the way python's strict utf-8 does, so there is
 * no equivalent of its `UnicodeDecodeError` skip to port. */
export function staleShebangOffenders(
  pathspec: string | readonly string[],
  staleLine: string,
): string[] {
  const offenders: string[] = [];
  for (const [, absolutePath] of trackedEntries(pathspec)) {
    let text: string;
    try {
      text = readFileSync(absolutePath, "utf8");
    } catch {
      continue;
    }
    if (text.split("\n").includes(staleLine)) {
      offenders.push(path.relative(REPO, absolutePath));
    }
  }
  return offenders;
}

function collectDotTsCommandTokens(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectDotTsCommandTokens(item, out);
    return;
  }
  if (node !== null && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.command === "string") {
      for (const token of record.command.split(/\s+/)) {
        if (token.startsWith("~/.claude/") && token.endsWith(".ts")) {
          out.push(token.slice("~/.claude/".length));
        }
      }
    }
    for (const value of Object.values(record)) collectDotTsCommandTokens(value, out);
  }
}

/** shebang_test.py's SettingsCommandShebang.test_T_003, generalized to take the settings tree
 * as a plain argument instead of reading settings.json off disk itself, so the same function
 * checks the repository's real settings.json and a settings-shaped fixture object alike. */
export function settingsCommandShebangOffenders(settings: unknown, shebang: string): string[] {
  const hooksNode =
    settings !== null && typeof settings === "object"
      ? (settings as Record<string, unknown>).hooks
      : undefined;
  const relativeScripts: string[] = [];
  collectDotTsCommandTokens(hooksNode ?? {}, relativeScripts);

  const offenders: string[] = [];
  for (const rel of relativeScripts) {
    // Looked up by its own path rather than through a hooks/-wide scan, so a script under
    // fixtures/ (the positive control) is compared on its real mode and first line too.
    const mode = trackedEntries(rel)[0]?.[0];
    let ready = mode === EXEC_MODE;
    if (ready) {
      try {
        ready = firstLine(path.join(REPO, rel)) === shebang;
      } catch {
        ready = false;
      }
    }
    if (!ready) offenders.push(rel);
  }
  return offenders;
}

/** shebang_test.py's LibHasNoShebang.test_T_004, generalized to take the pathspec as an
 * argument instead of the fixed `hooks/_lib/*.py` scan. */
export function libHasShebangOffenders(pathspec: string | readonly string[]): string[] {
  const offenders: string[] = [];
  for (const [, absolutePath] of trackedEntries(pathspec)) {
    if (firstLine(absolutePath).startsWith("#!")) {
      offenders.push(path.relative(REPO, absolutePath));
    }
  }
  return offenders;
}
