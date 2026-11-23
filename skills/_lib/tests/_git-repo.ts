/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const GIT_ENV: Record<string, string> = {
  ...(process.env as Record<string, string>),
  GIT_AUTHOR_NAME: "git-repo-test",
  GIT_AUTHOR_EMAIL: "git-repo-test@example.com",
  GIT_COMMITTER_NAME: "git-repo-test",
  GIT_COMMITTER_EMAIL: "git-repo-test@example.com",
};

export function withTempRepo<T>(fn: (repo: string) => T): T {
  const repo = mkdtempSync(join(tmpdir(), "git-repo-test-"));
  try {
    spawnSync("git", ["-C", repo, "init", "-q"], { encoding: "utf8", env: GIT_ENV });
    spawnSync("git", ["-C", repo, "config", "gc.auto", "0"], { encoding: "utf8", env: GIT_ENV });
    spawnSync("git", ["-C", repo, "config", "maintenance.auto", "false"], {
      encoding: "utf8",
      env: GIT_ENV,
    });
    return fn(repo);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

export function gcAutoValue(repo: string): string {
  const result = spawnSync("git", ["-C", repo, "config", "gc.auto"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}
