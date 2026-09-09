/// <reference types="node" />
// Ports hooks/_lib/hook_harness.py's checked/run/TIMEOUT_SECONDS to the .ts side (issue #626),
// the same way workflows/_lib/tests/_brace.ts is the shared, `_`-prefixed, .ja-mirror-less
// helper other tests in its layer import from. hook_harness.py itself stays: 16 Python hook
// tests still import it, and this file does not touch that contract.
//
// Runs the hook with node (process.execPath), not bun -- CI has no bun. env, when given,
// replaces the child's environment outright rather than extending it: spawnSync uses the env
// option as the whole child environment, never merging it with the parent's, so a caller
// wanting the rest of the parent env passes `{ ...process.env, ... }` itself.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { basename } from "node:path";

// A hook that never returns has to fail the suite rather than hang it, and one waiting on a
// bounded probe of its own still has to fit.
export const TIMEOUT_SECONDS = 60;

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
