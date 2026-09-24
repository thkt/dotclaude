/// <reference types="node" />
// Locating a program a hook shells out to. A hook runs with PATH cut down, so each caller names
// an absolute default and falls back to a PATH scan; the check for "runnable here" and the scan
// itself live here so every hook answers them the same way.
//
// No shebang and no exec bit: hooks/_lib/tests/shebang-ts.test.ts's T-013 forbids a shebang
// line under hooks/_lib/*.ts.
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, join } from "node:path";

// DR-0114's fixed Homebrew bun path (hooks/_lib/shebang_scope.ts's SHEBANG): a hook can run with
// PATH cut down to nothing, so a bare "bun" is never trusted to resolve on its own.
const DEFAULT_BUN = "/opt/homebrew/bin/bun";

/** True for a regular file this process may execute; false for a directory, a missing path, or
 * a file without the execute bit. */
export function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) {
      return false;
    }
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Where `name` resolves on PATH, or null when no directory on it carries an executable file by
 * that name. Read straight off process.env.PATH rather than shelling out to a `which` binary a
 * truncated PATH could leave just as unreachable.
 *
 * An empty PATH entry is skipped rather than resolved against cwd the way a POSIX shell treats
 * it: a hook's cwd follows the command it gates, so honoring that quirk would let a same-named
 * file in that directory stand in for the real program. */
export function which(name: string): string | null {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) {
      continue;
    }
    const candidate = join(dir, name);
    if (isExecutableFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** The runtime to run a .ts script with: CLAUDE_BUN_BIN, else DEFAULT_BUN, when that one is
 * executable, else `node` on PATH. null when none of them runs. */
export function tsRuntime(): string | null {
  const bun = process.env.CLAUDE_BUN_BIN || DEFAULT_BUN;
  if (isExecutableFile(bun)) {
    return bun;
  }
  return which("node");
}
