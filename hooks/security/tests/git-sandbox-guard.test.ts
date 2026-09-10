/// <reference types="node" />
// Full-hook coverage for git_sandbox_guard.ts's REWRITES / HELP / GIT_ENV / READ_FLAGS /
// WRITE_FLAGS / READ_ARGUMENTS / REASON table (unit U-007) now that main() (U-009) wires it end
// to end. Spawned through _hook-harness.ts's run rather than imported: the module carries a
// top-level `process.exit(main())` (DR-0114, no isMainModule guard), and main() reads stdin
// synchronously, so importing it in-process hangs the test runner on its own open stdin -- the
// same reason npm-install-guard.test.ts and rm-to-trash.test.ts only ever spawn their hook.
// CLAUDE_CONFIG_DIR points the guard at a disposable fixture repository, so a call denied here
// is denied because it reaches that repository, not this checkout.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { denyReason, fixtureRepo, run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "git_sandbox_guard.ts");

// One repository for the whole file: every scenario below runs from inside it with
// CLAUDE_CONFIG_DIR pointed at it, so a rewriting call is denied and a read-only one is not.
const GUARDED = fixtureRepo("git-sandbox-guard-tests-");

function runHook(command: string): string {
  return run(
    HOOK,
    { tool_name: "Bash", cwd: GUARDED, tool_input: { command } },
    { ...process.env, CLAUDE_CONFIG_DIR: GUARDED },
  );
}

test("T-285 a rewriting subcommand is denied with the REASON text and a read-only one is allowed", () => {
  const reason = denyReason(runHook("git checkout main"));
  assert.ok(reason, "a rewriting subcommand must be denied");
  assert.match(
    reason as string,
    /^git-sandbox-guard: このリポジトリで作業ツリーを書き換える git は sandbox 内で走らせない。/,
    "the deny reason must carry REASON's text",
  );

  assert.equal(denyReason(runHook("git status")), null, "a read-only subcommand must be allowed");
});

test("T-286 a help flag turns a rewriting subcommand into an allowed call", () => {
  for (const command of ["git checkout --help", "git stash -h"]) {
    assert.equal(denyReason(runHook(command)), null, `${command} must be allowed`);
  }
});

test("T-287 a read-only flag or argument on a rewriting subcommand keeps it allowed, and adding a write flag denies it", () => {
  assert.equal(denyReason(runHook("git rm --cached x")), null, "read flag must be allowed");
  assert.equal(denyReason(runHook("git stash list")), null, "read argument must be allowed");
  assert.equal(
    denyReason(runHook("git reset --mixed origin/main")),
    null,
    "index-only reset must be allowed",
  );
  assert.ok(denyReason(runHook("git reset --hard origin/main")), "write flag must be denied");
});
