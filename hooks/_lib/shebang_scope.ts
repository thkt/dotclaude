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
import path from "node:path";
import { fileURLToPath } from "node:url";

// hooks/_lib/shebang_scope.ts -> hooks/_lib -> hooks -> repo root, mirroring shebang_test.py's
// `Path(__file__).resolve().parents[3]` one level shallower (this file sits in hooks/_lib, not
// hooks/_lib/tests). Internal only: no consumer outside trackedEntries needs the repo root yet.
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** DR-0114's absolute bun interpreter path -- see the module docstring above.
 * TODO(planned, not yet implemented by this scaffold): fix this to "#!/opt/homebrew/bin/bun". */
export const SHEBANG: string = "";

/** shebang_test.py's STALE_SHEBANG, generalized: the .py side's fixed literal becomes an
 * argument every check below takes instead, so this constant is the single value a real caller
 * (a future CI-wired script) and hooks/_lib/tests/shebang-ts.test.ts both pass in.
 * TODO(planned, not yet implemented by this scaffold): fix this to "#!/usr/bin/env bun". */
export const STALE_SHEBANG: string = "";

// EXEC_MODE (shebang_test.py's third mirrored constant) stays deferred: it is an internal detail
// of executableShebangOffenders' own git-mode comparison, not a value any caller passes in, so
// it has no reason to be exported until that function's body is implemented for real.

/** (git file mode, absolute path) for every file the discovery pathspec matches.
 *
 * Spawns real git rather than reimplementing its include/exclude resolution -- `--cached`
 * covers tracked files the way shebang_test.py's plain `git ls-files -s` did, and `--others
 * --exclude-standard` adds untracked-but-not-.gitignored files so a new .ts script is in scope
 * before its first `git add`. `--others` entries carry no stage/mode field, so their mode reads
 * as "" (an entry can never legitimately claim EXEC_MODE without git having staged it).
 *
 * TODO(planned, not yet implemented by this scaffold): the contract's default pathspec is meant
 * to exclude hooks/_lib/tests/fixtures/** so fixture data never enters the discovery set; this
 * function does not yet apply that exclusion. */
export function trackedEntries(pattern: string): Array<[mode: string, absolutePath: string]> {
  const output = execFileSync(
    "git",
    ["-C", REPO, "ls-files", "-s", "--cached", "--others", "--exclude-standard", "--", pattern],
    { encoding: "utf8" },
  );
  const entries: Array<[string, string]> = [];
  for (const line of output.split("\n")) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    const rel = line.slice(tab + 1);
    const meta = line.slice(0, tab);
    const mode = meta.split(" ")[0] ?? "";
    entries.push([mode, path.join(REPO, rel)]);
  }
  return entries;
}

/** shebang_test.py's ExecutableShebang.test_T_001, generalized to take the pathspec and the
 * expected shebang as arguments instead of the fixed `hooks/*.py` + SHEBANG pair, so
 * hooks/_lib/tests/shebang-ts.test.ts can point the same function at hooks/'s real .ts files
 * and, separately, at a positive-control fixture (docs/wiki/absence-test-positive-control-
 * fixture.md).
 *
 * TODO(planned, not yet implemented by this scaffold): resolve `pathspec` to entries (reusing
 * trackedEntries for a single pathspec, unioned across each token for an array), filter entries
 * whose mode is the exec bit, read each survivor's first line, and collect the REPO-relative
 * paths whose first line does not equal `shebang`. */
export function executableShebangOffenders(
  _pathspec: string | readonly string[],
  _shebang: string,
): string[] {
  return [];
}

/** shebang_test.py's NoStaleShebang.test_T_002, generalized the same way: `pathspec` replaces
 * the fixed `hooks/*` scan and `staleLine` replaces the fixed STALE_SHEBANG literal.
 *
 * TODO(planned, not yet implemented by this scaffold): resolve `pathspec` to entries, read each
 * tracked file's text (skipping files that fail to decode as UTF-8, as shebang_test.py's
 * NoStaleShebang does), and collect the REPO-relative paths whose lines include `staleLine`. */
export function staleShebangOffenders(
  _pathspec: string | readonly string[],
  _staleLine: string,
): string[] {
  return [];
}

/** shebang_test.py's SettingsCommandShebang.test_T_003, generalized to take the settings tree
 * as a plain argument instead of reading settings.json off disk itself, so the same function
 * checks the repository's real settings.json and a settings-shaped fixture object alike.
 *
 * TODO(planned, not yet implemented by this scaffold): walk `settings.hooks`, collect every
 * command token ending in ".ts", resolve each `~/.claude/`-relative token to REPO, and collect
 * the REPO-relative paths that are not tracked with the exec bit and the first line `shebang`. */
export function settingsCommandShebangOffenders(_settings: unknown, _shebang: string): string[] {
  return [];
}

/** shebang_test.py's LibHasNoShebang.test_T_004, generalized to take the pathspec as an
 * argument instead of the fixed `hooks/_lib/*.py` scan.
 *
 * TODO(planned, not yet implemented by this scaffold): resolve `pathspec` to entries and collect
 * the REPO-relative paths whose first line starts with "#!". */
export function libHasShebangOffenders(_pathspec: string | readonly string[]): string[] {
  return [];
}
