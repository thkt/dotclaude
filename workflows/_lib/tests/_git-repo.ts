/// <reference types="node" />
// Shared by any workflow/skill test that needs a real, disposable git repository to run
// commands against, in the same "temp resource with a finally-closed lifetime" shape as
// withTempHome in workflows/_lib/tests/_cli-fixture.ts. Background gc and maintenance can fire
// mid-test on a repo git considers large or stale enough, racing the test's own git commands for
// the same .git/index.lock (hypothesis #1 of the 3 raised against that class of flakiness);
// withTempRepo turns both off immediately after `git init` so a repo this helper creates never
// triggers them.
//
// GREEN (U-001): withTempRepo(fn) creates a real temp directory holding a `git init -q`
// repository, removing it through a `finally` even when `fn` throws (T-417). Immediately after
// creation it turns gc.auto and maintenance.auto off (T-416) -- hypothesis #1 of the 3 raised
// against .git/index.lock flakiness: background gc/maintenance firing mid-test on a repo git
// considers large or stale enough, racing the test's own git commands for the same lock file.
// Every command this helper runs against the repo carries the same four-variable git identity
// (GIT_AUTHOR_NAME/EMAIL, GIT_COMMITTER_NAME/EMAIL) skills/scribe/tests/verify-run.test.ts's
// GIT_ENV uses, so a commit made through this repo never falls back to an unset git identity.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The four-variable git identity `skills/scribe/tests/verify-run.test.ts`'s GIT_ENV uses,
 * layered onto `process.env` -- passed to every command `withTempRepo` runs against the
 * repository it creates. Exported so a caller that runs its own git commands (commits, most
 * often) against a `withTempRepo` repository reuses this identity instead of carrying a second
 * copy of the same four variables. */
export const GIT_ENV: Record<string, string> = {
  ...(process.env as Record<string, string>),
  GIT_AUTHOR_NAME: "git-repo-test",
  GIT_AUTHOR_EMAIL: "git-repo-test@example.com",
  GIT_COMMITTER_NAME: "git-repo-test",
  GIT_COMMITTER_EMAIL: "git-repo-test@example.com",
};

/** Runs `fn` against a freshly created temp directory holding a real git repository (`git init
 * -q`), in the same "temp resource, finally-closed lifetime" shape as `withTempHome` in
 * `./_cli-fixture.ts`. Background gc and maintenance are disabled on the repository right after
 * creation so they never race `fn`'s own git commands for the same `.git/index.lock`. */
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
