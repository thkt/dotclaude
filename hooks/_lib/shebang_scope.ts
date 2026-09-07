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

// STALE_SHEBANG and EXEC_MODE (shebang_test.py's other two mirrored constants) are deferred:
// no test in this unit exercises a stale-shebang scan or an exec-bit check yet. Add them here,
// not as a second copy, when that unit's test needs them (T-009 / T-015 only for now).

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
