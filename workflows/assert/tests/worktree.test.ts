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
// worktree before and after cleanup, and it reads the JSON rather than the bytes. The repository
// itself comes from workflows/_lib/tests/_git-repo.ts's withTempRepo -- the same disposable-repo
// helper skills/scribe/tests/verify-run.test.ts and scripts-contract.test.ts share.
//
// T-168 is what pins the bytes: it replays every case in the frozen fixture
// worktree-cases.json against the real CLI, the way workflows/assert/tests/record.test.ts
// replays record-cases.json and bootstrap.test.ts's T-164 replays bootstrap-cases.json. The
// fixture is the retired Python worktree manager's own captured output (U-001) with one token
// masked: the usage line names the script itself, so `<script>` stands where the capture read
// the python entry point, and each side resolves it to its own.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture, runCli, withTempHome, type FixtureCase } from "../../_lib/tests/_cli-fixture.ts";
import { gcAutoValue, withTempRepo } from "../../_lib/tests/_git-repo.ts";
import { create, cleanup, paths, type Runner } from "../worktree.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "worktree.ts");

interface WorktreeFixtureCase extends FixtureCase {
  stderr: string;
}

const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "worktree-cases.json"), "utf8"),
) as WorktreeFixtureCase[];

// The usage line is the one string the retired Python printed that names the script itself, so
// the capture carries it masked and each side resolves it to its own entry point: the retired
// manager printed its own python file name, this one prints worktree.ts, and carrying the
// retired name forward would misdirect a caller (U-005).
const SCRIPT_PLACEHOLDER = "<script>";

const resolveScript = (text: string): string => text.replaceAll(SCRIPT_PLACEHOLDER, "worktree.ts");

/** A Runner stub that records every command it was asked to run and reports success, so
 * create/cleanup can be exercised without touching real git. */
function recordingRunner(calls: string[][]): Runner {
  return (cmd) => {
    calls.push([...cmd]);
    return { status: 0, stderr: "" };
  };
}

/** Seeds a fresh repository (`withTempRepo` already ran `git init`) with one commit
 * ("chore: seed"), mirroring workflows/code/tests/verify-commit.test.ts's withUnitRepo /
 * workflows/build/tests/diff-files.test.ts's buildRepo, then runs `fn` against its path. */
function initRepo<T>(fn: (repo: string) => T): T {
  return withTempRepo((repo) => {
    const git = (args: readonly string[]) =>
      spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
    git(["config", "user.email", "t@example.com"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(repo, "README.md"), "seed\n");
    git(["add", "README.md"]);
    git(["commit", "-q", "-m", "chore: seed"]);
    return fn(repo);
  });
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
    initRepo((repo) => {
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
    assert.equal(result.stderr, resolveScript(usageCase.stderr), "usage: stderr");
  });
});

test("T-264 every frozen case in worktree-cases.json reproduces the python manager's exit code, stdout bytes and stderr, with the script name resolved from its placeholder", () => {
  // Byte comparison, not JSON.parse: python's json.dumps writes ": " and ", " where
  // JSON.stringify writes neither, and reading the parsed object back would pass either way.
  assert.ok(FIXTURES.length > 0, "the frozen fixture carries at least one case");
  withTempHome((home) => {
    initRepo((repo) => {
      for (const testCase of FIXTURES) {
        const needsRepo = (testCase.argv ?? []).includes("fixture-session");
        const result = runCli(SCRIPT, home, testCase.stdin, testCase.argv ?? [], {
          cwd: needsRepo ? repo : undefined,
          env: { PATH: needsRepo ? (process.env.PATH ?? "") : "" },
        });
        assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
        assert.equal(result.stdout, resolveScript(testCase.stdout), `${testCase.name}: stdout`);
        assert.equal(result.stderr, resolveScript(testCase.stderr), `${testCase.name}: stderr`);
      }
    });
  });
});

test(
  "T-419 verify-run, scripts-contract and worktree each create their repositories through the " +
    "helper, asserted by the gc.auto value those repositories report",
  () => {
    initRepo((repo) => {
      assert.equal(gcAutoValue(repo), "0");
    });
  },
);
