/// <reference types="node" />
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

export const TIMEOUT_SECONDS = 60;

export function fixtureRepo(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const init = spawnSync("git", ["init", "-q", dir]);
  if (init.status !== 0) {
    throw new Error(`git init must succeed for the fixture repository (exit ${init.status})`);
  }
  return realpathSync(dir);
}

export function denyReason(output: string): string | null {
  if (!output) {
    return null;
  }
  const parsed = JSON.parse(output) as {
    hookSpecificOutput?: { permissionDecisionReason?: string };
  };
  return parsed.hookSpecificOutput?.permissionDecisionReason ?? null;
}

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

export function run(
  hook: string,
  payload: unknown,
  env?: NodeJS.ProcessEnv | null,
  args: readonly string[] = [],
): string {
  return checked(hook, payload, env, args).stdout;
}
