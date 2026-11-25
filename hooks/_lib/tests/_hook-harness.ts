/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const TIMEOUT_SECONDS = 60;

export function isolatedEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "hook-test",
    GIT_AUTHOR_EMAIL: "hook-test@example.invalid",
    GIT_COMMITTER_NAME: "hook-test",
    GIT_COMMITTER_EMAIL: "hook-test@example.invalid",
    ...extra,
  };
  for (const key of ["GIT_DIR", "GIT_INDEX_FILE", "GIT_WORK_TREE", "GIT_OBJECT_DIRECTORY"]) {
    delete env[key];
  }
  return env;
}

export function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, env: isolatedEnv(), encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

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
