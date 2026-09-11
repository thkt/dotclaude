/// <reference types="node" />
// Behavior tests for withTempRepo in workflows/_lib/tests/_git-repo.ts. Reads every assertion
// back through the real `git config` binary rather than any constant the helper module might
// carry internally, so a passing test proves the repository itself, not the helper's memory of
// what it meant to set. T-418 is the vacuousness guard for T-416: it runs the same read against
// a plain `git init` repo the helper never touched, so a green T-416 cannot be explained by
// "every fresh repo already reads that way" -- see T-418's own docstring below for why it stays
// unconditionally true and is not itself driving this unit's Red state.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withTempRepo } from "./_git-repo.ts";

/** The value `git -C repo config <key>` reports, or `""` when the key is unset -- the same
 * "read back through git config" the T-416 scenario name asks for, kept out of `_git-repo.ts` so
 * this test never shares a constant with the code it is checking. */
function readConfig(repo: string, key: string): string {
  const result = spawnSync("git", ["-C", repo, "config", key], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

test(
  "T-416 a repository the helper creates answers 0 for gc.auto and false for maintenance.auto, " +
    "read back through git config rather than from the helper's own constant",
  () => {
    withTempRepo((repo) => {
      assert.equal(readConfig(repo, "gc.auto"), "0");
      assert.equal(readConfig(repo, "maintenance.auto"), "false");
    });
  },
);

test(
  "T-417 the helper removes the repository even when the body throws, and the path no longer " +
    "exists afterwards",
  () => {
    let capturedRepo = "";
    assert.throws(() => {
      withTempRepo((repo) => {
        capturedRepo = repo;
        throw new Error("body boom");
      });
    }, /body boom/);
    assert.notEqual(capturedRepo, "");
    assert.equal(existsSync(capturedRepo), false);
  },
);

// Not a Red-driving assertion for this unit: a plain `git init` repository already reads this
// way regardless of withTempRepo's implementation (confirmed empirically: `git config gc.auto`
// on a freshly `git init`-ed repo exits 1 / prints nothing, the same "unset" reading this
// function's readConfig folds to ""). It exists so T-416 cannot pass vacuously -- if this one
// ever started reading "0" too, T-416 would stop proving anything about the helper.
test(
  "T-418 a repository created without the helper still answers the inherited gc.auto, " +
    "so the assertion above is not vacuous",
  () => {
    const repo = mkdtempSync(join(tmpdir(), "git-repo-control-"));
    try {
      spawnSync("git", ["-C", repo, "init", "-q"], { encoding: "utf8" });
      assert.notEqual(readConfig(repo, "gc.auto"), "0");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  },
);
