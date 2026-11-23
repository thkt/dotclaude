/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withTempRepo } from "./_git-repo.ts";

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
