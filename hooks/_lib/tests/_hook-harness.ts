/// <reference types="node" />
// checked/run/TIMEOUT_SECONDS: ports the retired Python hook_harness module (issue #626), the
// same way workflows/_lib/tests/_brace.ts is the shared, `_`-prefixed, .ja-mirror-less helper
// other tests in its layer import from. The last Python hook tests that imported the retired
// module retired alongside it, so this file is the harness's only implementation now.
//
// Runs the hook with node (process.execPath), not bun -- CI has no bun. env, when given,
// replaces the child's environment outright rather than extending it: spawnSync uses the env
// option as the whole child environment, never merging it with the parent's, so a caller
// wanting the rest of the parent env passes `{ ...process.env, ... }` itself.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

// A hook that never returns has to fail the suite rather than hang it, and one waiting on a
// bounded probe of its own still has to fit.
export const TIMEOUT_SECONDS = 60;

/** A real git repository under a fresh temp directory, physical-pathed.
 *
 * realpathSync because rev-parse reports a physical path and macOS hands out a symlinked
 * TMPDIR, so a caller comparing against rev-parse output needs the same resolution here. */
export function fixtureRepo(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const init = spawnSync("git", ["init", "-q", dir]);
  if (init.status !== 0) {
    throw new Error(`git init must succeed for the fixture repository (exit ${init.status})`);
  }
  return realpathSync(dir);
}

/** The denial reason a hook run wrote, or null for a run that denied nothing. */
export function denyReason(output: string): string | null {
  if (!output) {
    return null;
  }
  const parsed = JSON.parse(output) as {
    hookSpecificOutput?: { permissionDecisionReason?: string };
  };
  return parsed.hookSpecificOutput?.permissionDecisionReason ?? null;
}

/** The whole result, after confirming the hook ran.
 *
 * No hook in this tree exits non-zero by design, so a non-zero status is a broken hook rather
 * than a result to assert against. */
export function checked(
  hook: string,
  payload: unknown,
  env?: NodeJS.ProcessEnv | null,
  args: readonly string[] = [],
): SpawnSyncReturns<string> {
  const result = spawnSync(process.execPath, [hook, ...args], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
    env: env ?? undefined,
    timeout: TIMEOUT_SECONDS * 1000,
  });
  if (result.status !== 0) {
    throw new Error(`${basename(hook)} exited ${result.status}: ${(result.stderr ?? "").trim()}`);
  }
  return result;
}

/** The hook's stdout, after confirming it ran. */
export function run(
  hook: string,
  payload: unknown,
  env?: NodeJS.ProcessEnv | null,
  args: readonly string[] = [],
): string {
  return checked(hook, payload, env, args).stdout;
}
