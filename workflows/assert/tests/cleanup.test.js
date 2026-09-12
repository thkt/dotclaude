// Behavior tests for workflows/assert.js's Cleanup stage: the worktree assert created for a run
// is removed by the script's own deterministic instruction, not left to the Cleanup agent
// step's own judgment call (workflows/assert.js:687-691, best-effort, "reporting it as a
// warning is enough"). worktree.ts really runs against a real temporary git repository, and
// only the LLM-facing agent() calls are faked -- mirroring
// workflows/assert/tests/assert.record.seam.test.js's pattern of running the real deterministic
// script a stage names rather than faking its effect.
//
// The stub's cleanup handler performs the real `git worktree remove` / `git branch -D` only
// when the Cleanup prompt it receives names a concrete, already-resolvable worktree path
// (.claude/worktrees/assert-<id>) -- standing in for a compliant executor that can act on an
// explicit target. The pre-fix prompt names only the unresolved "$CLAUDE_SESSION_ID" shell
// variable, which the stub cannot act on, so it performs nothing -- reproducing the run leaving
// its own worktree behind. The fix is expected to hand the agent boot.worktree_path (already
// known to the script since Bootstrap) instead, giving the stub a concrete target to act on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { runWorkflow } from "../../_lib/run-workflow.ts";
import { runCli } from "../../_lib/tests/_cli-fixture.ts";
import { bootOk } from "./_fixtures.js";

const here = dirname(fileURLToPath(import.meta.url));
const assertJs = join(here, "..", "..", "assert.js");
const worktreeScript = join(here, "..", "worktree.ts");

/** A fresh git repository with one commit, mirroring worktree.test.ts's initRepo /
 * workflows/build/tests/diff-files.test.ts's buildRepo. */
function initRepo(root) {
  const repo = mkdtempSync(join(root, "cleanup-repo-"));
  const git = (args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.email", "t@example.com"]);
  git(["config", "user.name", "t"]);
  writeFileSync(join(repo, "README.md"), "seed\n");
  git(["add", "README.md"]);
  git(["commit", "-q", "-m", "chore: seed"]);
  return repo;
}

/** Adds a real worktree via the real worktree.ts CLI (mirroring worktree.test.ts's T-162), so
 * it carries the exact branch/path worktree.ts itself derives from `sessionId`. Returns the
 * relative path worktree.ts reports (.claude/worktrees/assert-<sessionId>). */
function createRealWorktree(home, repo, sessionId) {
  const result = runCli(worktreeScript, home, "", [sessionId], {
    cwd: repo,
    env: { PATH: process.env.PATH ?? "" },
  });
  assert.equal(result.status, 0, `worktree.ts create (${sessionId}) exits 0: ${result.stderr}`);
  return JSON.parse(result.stdout).path;
}

/** `git worktree list`'s stdout for `repo`. */
const worktreeList = (repo) =>
  spawnSync("git", ["-C", repo, "worktree", "list"], { encoding: "utf8" }).stdout;

// Reused by both tests, so a stub that swept more than the one worktree it was told about would
// show up the same way in either test.
const cleanupCapableAgentStub = (repo, worktreePathA) => (prompt, opts) => {
  const label = opts && opts.label;
  if (label === "bootstrap") return { ...bootOk, worktree_path: worktreePathA, scope_files: [] };
  if (label === "test-exec") return { outcome: "no-runner" };
  if (label === "adversarial") return { ran: false, notes: "stub" };
  if (label === "codex-review") return { ran: false, findings: [] };
  if (label === "synthesize") return { issues: [], root_causes: [], report: "stub" };
  if (label === "cleanup") {
    const match = /\.claude\/worktrees\/assert-[A-Za-z0-9._-]+/.exec(prompt);
    // No concrete path in the prompt (the pre-fix text names only the unresolved
    // "$CLAUDE_SESSION_ID"): nothing for this stub to act on, so it does nothing -- and its own
    // return to the script is nothing either way, per this unit's T-439.
    if (!match) return undefined;
    const path = match[0];
    const branch = path.split("/").pop();
    spawnSync("git", ["-C", repo, "worktree", "remove", path, "--force"], { encoding: "utf8" });
    spawnSync("git", ["-C", repo, "branch", "-D", branch], { encoding: "utf8" });
    return undefined;
  }
  return undefined;
};

test("T-439 a run that creates a worktree removes it from the git worktree list even when the agent step returns nothing", async () => {
  const home = mkdtempSync(join(tmpdir(), "assert-cleanup-"));
  try {
    const repo = initRepo(home);
    const sessionId = "run-under-test";
    const worktreePathA = createRealWorktree(home, repo, sessionId);
    assert.match(
      worktreeList(repo),
      new RegExp(`\\[assert-${sessionId}\\]`),
      "setup: the run's own worktree exists before Cleanup runs",
    );

    const { result } = await runWorkflow(assertJs, {
      args: { repo },
      stubs: { agent: cleanupCapableAgentStub(repo, worktreePathA) },
    });
    assert.equal(result.stopped, undefined, "the run reaches Cleanup rather than stopping early");

    assert.doesNotMatch(
      worktreeList(repo),
      new RegExp(`\\[assert-${sessionId}\\]`),
      "the worktree assert created for this run is gone from `git worktree list` after Cleanup, " +
        "even though the cleanup agent step's own reported return was nothing",
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("T-440 a worktree the run did not create is left alone", async () => {
  const home = mkdtempSync(join(tmpdir(), "assert-cleanup-"));
  try {
    const repo = initRepo(home);
    const otherSessionId = "leftover-from-another-run";
    createRealWorktree(home, repo, otherSessionId);
    assert.match(
      worktreeList(repo),
      new RegExp(`\\[assert-${otherSessionId}\\]`),
      "setup: the unrelated worktree exists before this run starts",
    );

    const thisSessionId = "run-under-test-2";
    const worktreePathA = createRealWorktree(home, repo, thisSessionId);

    const { result } = await runWorkflow(assertJs, {
      args: { repo },
      stubs: { agent: cleanupCapableAgentStub(repo, worktreePathA) },
    });
    assert.equal(result.stopped, undefined, "the run reaches Cleanup rather than stopping early");

    assert.match(
      worktreeList(repo),
      new RegExp(`\\[assert-${otherSessionId}\\]`),
      "the worktree this run did not create is still listed after Cleanup",
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
