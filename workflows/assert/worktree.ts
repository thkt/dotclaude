#!/usr/bin/env node
/// <reference types="node" />
// Usage:
//   worktree.ts <session-id>             Create a fresh assert worktree
//   worktree.ts --cleanup <session-id>   Remove the assert worktree and its branch
//
// The branch and path are derived from the session id so creation and cleanup never drift:
// branch = assert-<id>, path = .claude/worktrees/assert-<id>. git runs from the process cwd
// (the repo root), so the path is relative to it.
//
// Create removes any stale worktree and branch first, then adds a fresh one from HEAD.
//
// stdout (create):  JSON {branch, path, status: "created"}
// stdout (cleanup): JSON {branch, path, status: "removed"}
// On create failure: JSON {branch, path, status: "error", reason, stderr}, exit 1 (the caller
// sets worktree_ok: false from this, which workflows/assert.js's envFail reads as an env
// failure -- #656). Cleanup is best-effort: stale-state removals are ignored and it never
// fails the run.
// A wrong argv shape (neither `<session-id>` nor `--cleanup <session-id>`) prints the usage
// line above to stderr and exits 1.
//
// TypeScript port of the Python assert worktree manager it replaces. Contract: this CLI's own
// behavior, exercised end to end by workflows/assert/tests/worktree.test.ts against the frozen
// fixture workflows/assert/tests/fixtures/worktree-cases.json.
import { spawnSync } from "node:child_process";
import { isMainModule } from "../_lib/entry-point.ts";

/** Runs one command, returning its exit status and stderr. The seam create/cleanup call
 * through, so a test can inject a fake in place of a real spawn. Mirrors the retired Python worktree manager's
 * `Runner = Callable[[Sequence[str]], tuple[int, str]]`. */
export type Runner = (cmd: readonly string[]) => { status: number; stderr: string };

/** Spawns `cmd[0]` with `cmd.slice(1)`, capturing stderr as text. Mirrors the retired Python worktree manager's
 * `_real_runner`, which runs `subprocess.run(cmd, capture_output=True, text=True,
 * check=False)` and reports `(returncode, stderr)`. */
function realRunner(cmd: readonly string[]): { status: number; stderr: string } {
  const result = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8" });
  return { status: result.status ?? 1, stderr: result.stderr ?? "" };
}

/** The branch and worktree path derived from a session id: `assert-<id>` and
 * `.claude/worktrees/assert-<id>`, so create and cleanup never drift apart. */
export function paths(sessionId: string): { branch: string; path: string } {
  return { branch: `assert-${sessionId}`, path: `.claude/worktrees/assert-${sessionId}` };
}

/** Removes any worktree and branch left over from a prior run. Errors are ignored: failing to
 * clear stale state must not fail the run. Mirrors the retired Python worktree manager's `_remove`. */
function removeStale(branch: string, path: string, runner: Runner): void {
  runner(["git", "worktree", "remove", path, "--force"]);
  runner(["git", "branch", "-D", branch]);
}

/** Removes any stale worktree/branch for `sessionId`, then adds a fresh worktree from HEAD.
 * On failure the returned object carries `status: "error"` with the exit code in `reason` and
 * git's stderr, instead of throwing -- `main` turns that into exit 1. */
export function create(
  sessionId: string,
  runner: Runner = realRunner,
): Record<string, unknown> {
  const { branch, path } = paths(sessionId);
  removeStale(branch, path, runner);
  const { status, stderr } = runner(["git", "worktree", "add", "-b", branch, path, "HEAD"]);
  if (status !== 0) {
    return {
      branch,
      path,
      status: "error",
      reason: `env:worktree-add-exit-${status}`,
      stderr: stderr.trim(),
    };
  }
  return { branch, path, status: "created" };
}

/** Removes the worktree and branch for `sessionId`. Best-effort, like `create`'s stale-state
 * removal: it never reports failure. */
export function cleanup(
  sessionId: string,
  runner: Runner = realRunner,
): Record<string, unknown> {
  const { branch, path } = paths(sessionId);
  removeStale(branch, path, runner);
  return { branch, path, status: "removed" };
}

/** argv dispatch mirroring the retired Python worktree manager's `main`: `--cleanup <id>` runs cleanup,
 * `<id>` runs create, anything else prints the usage line to stderr. The usage text names this
 * script's own current entry point (worktree.ts), matching the header comment above -- the
 * retired manager no longer exists to compare against, so keeping its name here would misdirect
 * a caller (U-005). */
export function main(): number {
  const args = process.argv.slice(2);
  if (args.length === 2 && args[0] === "--cleanup") {
    process.stdout.write(`${JSON.stringify(cleanup(args[1]))}\n`);
    return 0;
  }
  if (args.length === 1 && !args[0].startsWith("-")) {
    const result = create(args[0]);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.status === "error" ? 1 : 0;
  }
  process.stderr.write("Usage: worktree.ts <session-id> | worktree.ts --cleanup <session-id>\n");
  return 1;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
