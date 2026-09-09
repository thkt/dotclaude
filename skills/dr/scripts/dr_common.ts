/// <reference types="node" />
// TypeScript port of the retired Python dr_common's shared helpers, in the same shape
// skills/_lib/harness_hash.ts uses (named exports, no default export). This module carries no
// CLI entry of its own -- pre-check.ts, validate-dr.ts, and update-index.ts each import it -- so
// it ships shebang-less at mode 100644, unlike the skills-CLI shebang + 100755 the scripts that
// call it carry.
//
// Contract: the retired Python dr_common's fail, resolve_dr_dir, guard_skill_dir, and
// split_frontmatter. Python's snake_case names carry over as TS camelCase, the same rename
// harness_hash.py's _digest -> harness_hash.ts's digest already made.
//
// resolveDrDir is a pure function here, unlike the retired Python resolve_dr_dir, which called
// fail() itself on a non-zero git exit: env, the CLI argument, and the git-toplevel spawn result
// all arrive as explicit parameters, and a caller that finds none of the three decides what to do
// with the null it gets back. That keeps the git spawn and the process.exit side effect in the CLI
// wrapper, where main()'s Usage-header contract already documents them, instead of buried in a
// helper this module's own tests import directly.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** Writes each line to stderr and exits the process with status 1, mirroring the retired
 * Python dr_common's fail(*lines): print(*lines, sep="\n", file=sys.stderr); sys.exit(1). */
export function fail(...lines: string[]): never {
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exit(1);
}

/** The fields of node:child_process's spawnSync(str, ["rev-parse", "--show-toplevel"], {
 * encoding: "utf8" }) result that resolveDrDir reads: a subset, not the full
 * SpawnSyncReturns<string>, so a caller can hand-build a fixture without conjuring the rest
 * (pid, signal, output) a real spawnSync return also carries. */
export interface GitTopLevelResult {
  status: number | null;
  stdout: string;
  error?: Error;
}

/** Resolves the Decision Record archive directory: DR_DIR env, then the CLI argument, then
 * the git top level joined with docs/decisions, in that order -- null when none apply,
 * including when the git spawn itself failed to launch (status null + error) or exited
 * non-zero. Pure: never reads process.env or spawns git itself, and never calls fail(). */
export function resolveDrDir(
  env: NodeJS.ProcessEnv,
  arg: string | undefined,
  gitTopLevel: GitTopLevelResult,
): string | null {
  if (env.DR_DIR) {
    return env.DR_DIR;
  }
  if (arg) {
    return arg;
  }
  if (gitTopLevel.status !== 0) {
    return null;
  }
  return join(gitTopLevel.stdout.trim(), "docs", "decisions");
}

/** True when path exists and is a regular file, mirroring Python's Path.is_file() (a
 * directory named SKILL.md does not count as carrying it). */
function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** Fails with hint when drDir carries SKILL.md (a skill-definition directory, not a Decision
 * Record archive), mirroring the retired Python dr_common's guard_skill_dir. Returns normally
 * otherwise. */
export function guardSkillDir(drDir: string, hint: string): void {
  if (isFile(join(drDir, "SKILL.md"))) {
    fail(
      `Error: ${drDir} contains SKILL.md (skill-definition directory,` +
        " not a Decision Record archive)",
      hint,
    );
  }
}

/** Splits text into (frontmatter lines, body lines) at a --- delimiter pair, mirroring the
 * retired Python dr_common's split_frontmatter: only a --- on line 1 opens the fence, so a ---
 * anywhere in the body of a file that never opened one is never mistaken for a delimiter. */
export function splitFrontmatter(text: string): [string[], string[]] {
  const lines = text.split("\n");
  const fence = /^---[ \t]*$/;
  if (lines.length === 0 || !fence.test(lines[0])) {
    return [[], lines];
  }
  for (let i = 1; i < lines.length; i++) {
    if (fence.test(lines[i])) {
      return [lines.slice(1, i), lines.slice(i + 1)];
    }
  }
  return [[], lines];
}
