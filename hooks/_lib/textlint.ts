/// <reference types="node" />
// Shared textlint invocation for the fix and lint hooks. TypeScript port of
// hooks/_lib/textlint.py (docs/decisions/0112-adopt-typescript-for-helper-scripts.md, unit
// U-002): mirrors its public functions (fix, lint). shutil.which's PATH search is mirrored as
// a node:fs existence check walking process.env.PATH -- the runner (bun x, then npx) and the
// exit-0-when-absent behavior stay exactly what textlint.py already establishes.
import { spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Not $HOME/.claude, which names the installed harness alone: a checkout run from anywhere
// else finds no config there. Mirrors textlint.py's REPO_ROOT.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG = join(REPO_ROOT, ".textlintrc.json");

/** shutil.which's PATH search, mirrored with node:fs: true when `bin` names an executable
 * file in some PATH directory. */
function which(bin: string): boolean {
  const dirs = (process.env.PATH ?? "").split(delimiter);
  for (const dir of dirs) {
    if (!dir) continue;
    try {
      accessSync(join(dir, bin), constants.X_OK);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/** Mirrors textlint.py's _runner(). */
function runner(): string[] | null {
  if (which("bun")) return ["bun", "x"];
  if (which("npx")) return ["npx"];
  return null;
}

/** null when textlint cannot run at all: no config, or no runner to start it with. Mirrors
 * textlint.py's _run(). */
function run(args: string[]): { stdout: string } | null {
  try {
    if (!statSync(CONFIG).isFile()) return null;
  } catch {
    return null;
  }
  const found = runner();
  if (found === null) return null;
  // cwd, not --config alone: textlint resolves its presets from the working directory and
  // exits 1 from anywhere without node_modules above it, config or no config. That same exit
  // code is how it reports findings, so the callers read stdout regardless of status.
  const result = spawnSync(found[0], [...found.slice(1), "textlint", ...args, "--config", CONFIG], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return { stdout: result.stdout ?? "" };
}

/** Mirrors textlint.py's fix(): the result goes unread, since the caller runs after the edit
 * landed and a textlint failure has nothing left to stop. */
export function fix(path: string): void {
  run(["--fix", path]);
}

/** The findings, empty when textlint found none or could not run. The caller cannot tell the
 * two apart, and neither leaves it anything to report. Mirrors textlint.py's lint(). */
export function lint(path: string): string {
  const result = run([path]);
  return result !== null ? result.stdout : "";
}
