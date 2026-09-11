/// <reference types="node" />
// Shared textlint invocation for the fix and lint hooks (docs/decisions/0112-adopt-typescript-
// for-helper-scripts.md, unit U-002): fix and lint carry over from this module's Python
// sibling, which stays in the tree with no importer left once the proofreading hook retired
// directly. shutil.which's PATH search is mirrored as a node:fs existence check walking
// process.env.PATH -- the runner (bun x, then npx) and the exit-0-when-absent behavior stay
// exactly what that sibling already establishes.
import { spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Not $HOME/.claude, which names the installed harness alone: a checkout run from anywhere
// else finds no config there.
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

function runner(): string[] | null {
  if (which("bun")) return ["bun", "x"];
  if (which("npx")) return ["npx"];
  return null;
}

// Node's spawnSync default maxBuffer is 1 MiB, where python's subprocess.run has no such
// bound: a long Markdown file's findings can pass it, and exceeding it turns the run into an
// ENOBUFS error whose stdout the caller then reads as "textlint found nothing". Bounded rather
// than unbounded so a runaway process still cannot exhaust memory, the same reasoning
// hooks/_lib/rust_target.ts documents for its own choice.
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

/** null when textlint cannot run at all: no config, or no runner to start it with. */
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
    maxBuffer: MAX_BUFFER_BYTES,
  });
  return { stdout: result.stdout ?? "" };
}

/** The result goes unread, since the caller runs after the edit landed and a textlint
 * failure has nothing left to stop. */
export function fix(path: string): void {
  run(["--fix", path]);
}

/** The findings, empty when textlint found none or could not run. The caller cannot tell the
 * two apart, and neither leaves it anything to report. */
export function lint(path: string): string {
  const result = run([path]);
  return result !== null ? result.stdout : "";
}
