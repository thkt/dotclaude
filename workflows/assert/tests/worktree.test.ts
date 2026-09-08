/// <reference types="node" />
// Behavior tests for workflows/assert/worktree.ts, the TypeScript port of the Python assert
// worktree manager it replaces.
//
// T-161 exercises the Runner seam in-process: paths/create/cleanup derive branch/path from a
// session id without touching real git, mirroring how worktree_test.py's ... tests would stub
// the runner to check derivation without a real repository.
//
// T-162 and T-163's git-failure half run the real CLI (runCli) against a real temporary git
// repository, PATH restored so the CLI's own `git` calls reach the real binary. A JSON
// `status: created` on stdout alone would not show that cwd took effect or that this
// repository (not some other one) was touched, so T-162 also greps `git worktree list` for the
// worktree before and after cleanup. The frozen fixture worktree-cases.json (produced by
// running the retired Python worktree manager itself, U-001) supplies T-163's argv-usage half, replayed the same way
// workflows/assert/tests/record.test.ts replays record-cases.json.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture, runCli, withTempHome, type FixtureCase } from "../../_lib/tests/_cli-fixture.ts";
import { create, cleanup, paths, type Runner } from "../worktree.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "worktree.ts");

interface WorktreeFixtureCase extends FixtureCase {
  stderr: string;
}

const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "worktree-cases.json"), "utf8"),
) as WorktreeFixtureCase[];

/** A Runner stub that records every command it was asked to run and reports success, so
 * create/cleanup can be exercised without touching real git. */
function recordingRunner(calls: string[][]): Runner {
  return (cmd) => {
    calls.push([...cmd]);
    return { status: 0, stderr: "" };
  };
}

/** Builds a fresh git repository with one commit ("chore: seed") under `root`, mirroring
 * workflows/code/tests/verify-commit.test.ts's withUnitRepo / workflows/build/tests/
 * diff-files.test.ts's buildRepo. Returns the repository's absolute path. */
function initRepo(root: string): string {
  const repo = mktempRepoDir(root);
  const git = (args: readonly string[]) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.email", "t@example.com"]);
  git(["config", "user.name", "t"]);
  writeFileSync(join(repo, "README.md"), "seed\n");
  git(["add", "README.md"]);
  git(["commit", "-q", "-m", "chore: seed"]);
  return repo;
}

function mktempRepoDirImpl(root: string, prefix: string): string {
  return mkdtempSync(join(root, prefix));
}

function mktempRepoDir(root: string): string {
  return mktempRepoDirImpl(root, "worktree-repo-");
}

/** `git worktree list`'s stdout for `repo`. */
function worktreeList(repo: string): string {
  return spawnSync("git", ["-C", repo, "worktree", "list"], { encoding: "utf8" }).stdout;
}

test("T-161 create and cleanup report the same branch and path for one session id, derived as assert-<id> and .claude/worktrees/assert-<id>", () => {
  const sessionId = "session-abc";
  const expectedBranch = `assert-${sessionId}`;
  const expectedPath = `.claude/worktrees/assert-${sessionId}`;

  const derived = paths(sessionId);
  assert.equal(derived.branch, expectedBranch, "paths: branch");
  assert.equal(derived.path, expectedPath, "paths: path");

  const createCalls: string[][] = [];
  const created = create(sessionId, recordingRunner(createCalls));
  assert.equal(created.branch, expectedBranch, "create: branch");
  assert.equal(created.path, expectedPath, "create: path");

  const cleanupCalls: string[][] = [];
  const removed = cleanup(sessionId, recordingRunner(cleanupCalls));
  assert.equal(removed.branch, expectedBranch, "cleanup: branch");
  assert.equal(removed.path, expectedPath, "cleanup: path");

  assert.equal(removed.branch, created.branch, "create and cleanup report the same branch");
  assert.equal(removed.path, created.path, "create and cleanup report the same path");
});

test("T-162 create inside a temporary git repository adds a worktree under that repository and cleanup removes it, leaving the repository without it", () => {
  withTempHome((home) => {
    const repo = initRepo(home);
    const sessionId = "temp-repo-session";
    const branchPattern = new RegExp(`\\[assert-${sessionId}\\]`);

    const createRun = runCli(SCRIPT, home, "", [sessionId], {
      cwd: repo,
      env: { PATH: process.env.PATH ?? "" },
    });
    assert.equal(createRun.status, 0, "create: exit code");
    const createdJson = JSON.parse(createRun.stdout) as Record<string, unknown>;
    assert.equal(createdJson.status, "created", "create: JSON status");
    assert.match(worktreeList(repo), branchPattern, "create: worktree appears under the repo");

    const cleanupRun = runCli(SCRIPT, home, "", ["--cleanup", sessionId], {
      cwd: repo,
      env: { PATH: process.env.PATH ?? "" },
    });
    assert.equal(cleanupRun.status, 0, "cleanup: exit code");
    const removedJson = JSON.parse(cleanupRun.stdout) as Record<string, unknown>;
    assert.equal(removedJson.status, "removed", "cleanup: JSON status");
    assert.doesNotMatch(
      worktreeList(repo),
      branchPattern,
      "cleanup: worktree no longer listed under the repo",
    );
  });
});

test("T-163 a create whose git invocation fails reports status error with the exit code in reason and exits 1, and a wrong argv shape prints the usage line to stderr and exits 1", () => {
  withTempHome((home) => {
    const notARepo = mkdtempSync(join(home, "not-a-repo-"));
    const result = runCli(SCRIPT, home, "", ["broken-session"], {
      cwd: notARepo,
      env: { PATH: process.env.PATH ?? "" },
    });
    assert.equal(result.status, 1, "git failure: exit code");
    const errorJson = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal(errorJson.status, "error", "git failure: JSON status");
    assert.match(
      String(errorJson.reason),
      /^env:worktree-add-exit-\d+$/,
      "git failure: reason carries the exit code",
    );
  });

  const usageCase = fixture(FIXTURES, "usage_zero_args");
  withTempHome((home) => {
    const result = runCli(SCRIPT, home, usageCase.stdin, usageCase.argv ?? [], {
      env: { PATH: "" },
    });
    assert.equal(result.status, usageCase.exit, "usage: exit code");
    assert.equal(result.stdout, usageCase.stdout, "usage: stdout");
    assert.equal(result.stderr, usageCase.stderr, "usage: stderr");
  });
});
