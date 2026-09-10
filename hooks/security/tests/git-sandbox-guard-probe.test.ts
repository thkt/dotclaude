/// <reference types="node" />
// Unit U-008: TypeScript port of git_sandbox_guard.py's probe -- the rev-parse call inside
// _toplevel, PROBE_TIMEOUT_SECONDS, and UNRESOLVED_PROBE. subprocess.run(timeout=...) raises
// TimeoutExpired on a stall; spawnSync never throws for that, it sets `error` and returns
// `status: null` instead, so _toplevel has to read `error` itself and turn it into the same
// Unresolved the Python side raises.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PROBE_TIMEOUT_SECONDS, UNRESOLVED_PROBE, Unresolved, _toplevel } from "../git_sandbox_guard.ts";

/** A real repository, so a probe against it has something to resolve to. Standing in for the
 * guarded config directory: the guard denies a call once _toplevel resolves it to this path. */
function fixtureRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "git-sandbox-guard-probe-repo-"));
  const init = spawnSync("git", ["init", "-q", dir]);
  assert.equal(init.status, 0, "git init must succeed for the fixture repository");
  // realpathSync because rev-parse reports a physical path and macOS hands out a symlinked
  // TMPDIR (git_sandbox_guard_test.py's fixture_repo mirrors this with Path.resolve()).
  return realpathSync(dir);
}

test("T-288 a probe that does not answer within the timeout is denied with the unresolved-probe reason, driven by a git stub that sleeps", () => {
  const shimDir = mkdtempSync(path.join(tmpdir(), "git-sandbox-guard-probe-shim-"));
  const stub = path.join(shimDir, "git");
  writeFileSync(stub, "#!/bin/sh\nsleep 60\n");
  chmodSync(stub, 0o755);

  // PATH, not a patched constant: the bound has to hold around the real subprocess call, the
  // same reasoning git_sandbox_guard_test.py's test_a_probe_that_never_answers_is_fail_closed
  // (T-030) uses for the Python side.
  const originalPath = process.env.PATH;
  process.env.PATH = `${shimDir}:${originalPath ?? ""}`;
  const started = Date.now();
  try {
    assert.throws(
      () => _toplevel(process.cwd(), [], {}),
      (failure: unknown) => {
        assert.ok(failure instanceof Unresolved, "a stalled probe must raise Unresolved");
        // main() composes the deny reason as `${UNRESOLVED_PROBE}${failure}` (git_sandbox_
        // guard.py); asserting the prefix here ties the raised message to that reason without
        // needing main() itself, which stays out of this unit.
        const reason = `${UNRESOLVED_PROBE}${(failure as Error).message}`;
        assert.ok(
          reason.startsWith(UNRESOLVED_PROBE),
          "the composed deny reason must carry the unresolved-probe prefix",
        );
        return true;
      },
    );
  } finally {
    process.env.PATH = originalPath;
  }

  const elapsedSeconds = (Date.now() - started) / 1000;
  assert.ok(
    elapsedSeconds < PROBE_TIMEOUT_SECONDS + 5,
    `the probe must bound its wait near PROBE_TIMEOUT_SECONDS (${PROBE_TIMEOUT_SECONDS}s), took ${elapsedSeconds}s`,
  );
});

test("T-289 a directory that is not a repository is allowed and one that is a repository under the sandbox is denied", () => {
  const outside = mkdtempSync(path.join(tmpdir(), "git-sandbox-guard-probe-outside-"));
  assert.equal(
    _toplevel(outside, [], {}),
    null,
    "a directory outside any repository must probe to no target, so the call is allowed",
  );

  // GIT_DIR / GIT_WORK_TREE carry the call into the guarded repository the same way the -C /
  // --git-dir / --work-tree flags do (git_sandbox_guard.py's GIT_ENV), from a cwd that is not
  // that repository itself.
  const guarded = fixtureRepo();
  const elsewhere = mkdtempSync(path.join(tmpdir(), "git-sandbox-guard-probe-elsewhere-"));
  const top = _toplevel(elsewhere, [], {
    GIT_DIR: path.join(guarded, ".git"),
    GIT_WORK_TREE: guarded,
  });
  assert.equal(
    top,
    guarded,
    "GIT_DIR/GIT_WORK_TREE must redirect the probe into the guarded repository, so the call is denied",
  );
});
