/// <reference types="node" />
// Full-hook coverage for git_sandbox_guard.ts's REWRITES / HELP / GIT_ENV / READ_FLAGS /
// WRITE_FLAGS / READ_ARGUMENTS / REASON table, now that main() wires it end
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

// The retired Python suite's remaining judgment rows, kept as two tables. Every row runs from
// inside GUARDED, so a denial means the call reached the protected repository.
const DENIED = [
  "git checkout -- agents/x.md",
  "git switch main",
  "git pull",
  "git pull --ff-only origin main",
  "git merge origin/main",
  "git rebase main",
  "git revert HEAD",
  "git cherry-pick abc1234",
  "git stash pop",
  "git restore agents/x.md",
  "git restore --staged --worktree agents/x.md",
  "git clean -fd",
  "git rm agents/x.md",
  "git mv agents/x.md agents/y.md",
  "git sparse-checkout set docs",
  "git sparse-checkout disable",
  "git apply x.patch",
  "git rebase --abort",
  "git rm -- -h",
  "git checkout -- --help",
  "git bisect start",
  "git bisect good",
  "git bisect bad HEAD~3",
  "git bisect reset",
  "git checkout-index -a -f",
  "git read-tree -u --reset HEAD~1",
  "git filter-branch --force --tree-filter true HEAD",
  // A line that cannot be closed leaves no way to tell where the command position is.
  'git commit -m "unclosed',
];

const ALLOWED = [
  "git checkout -b docs/foo",
  "git switch -c docs/foo",
  "git reset --soft HEAD~1",
  "git fetch origin",
  "git status --short",
  "git diff --stat",
  "git push -u origin HEAD",
  "git rm -n agents/x.md",
  "git sparse-checkout list",
  "git stash --help",
  "git rm --help",
  "git apply --help",
  "git clean -n",
  "git clean -nd",
  "git clean --dry-run",
  "git apply --check x.patch",
  "git apply --stat x.patch",
  "git mv -n agents/a.md agents/b.md",
  "git mv --dry-run agents/a.md agents/b.md",
  "git restore --staged agents/x.md",
  "git rebase --show-current-patch",
  "git bisect log",
  "git bisect view",
  "git bisect visualize",
  "git bisect terms",
  "git read-tree HEAD~1",
  "git write-tree",
  "git update-index --refresh",
  // The word sits inside quotes, so no token on the line is a git command.
  'git commit -m "git pull を追加"',
  'echo "run git checkout main"',
  "ls -la",
  "gh pr list",
];

test("every rewriting form the table names is denied inside the guarded repository", () => {
  for (const command of DENIED) {
    assert.ok(denyReason(runHook(command)), `${JSON.stringify(command)} must be denied`);
  }
});

test("a form that leaves the working tree alone stays allowed inside the guarded repository", () => {
  for (const command of ALLOWED) {
    assert.equal(denyReason(runHook(command)), null, `${JSON.stringify(command)} must be allowed`);
  }
});

test("a call with the sandbox lifted passes, and an environment prefix picks the repository the flags would", () => {
  const lifted = run(
    HOOK,
    {
      tool_name: "Bash",
      cwd: GUARDED,
      tool_input: { command: "git pull", dangerouslyDisableSandbox: true },
    },
    { ...process.env, CLAUDE_CONFIG_DIR: GUARDED },
  );
  assert.equal(denyReason(lifted), null, "a call the caller already unsandboxed must be allowed");

  const outside = fixtureRepo("git-sandbox-guard-outside-");
  const redirected = (command: string) =>
    denyReason(
      run(
        HOOK,
        { tool_name: "Bash", cwd: outside, tool_input: { command } },
        { ...process.env, CLAUDE_CONFIG_DIR: GUARDED },
      ),
    );

  assert.ok(
    redirected(`GIT_DIR=${GUARDED}/.git GIT_WORK_TREE=${GUARDED} git checkout main`),
    "an environment prefix reaching the guarded repository must be denied from any cwd",
  );
  assert.equal(
    redirected(`GIT_DIR=${GUARDED}/.git GIT_WORK_TREE=${GUARDED} git status`),
    null,
    "the prefix alone is not a rewrite, so a read still passes",
  );
  assert.ok(
    redirected(`git -C ${GUARDED} checkout main`),
    "a redirect into the guarded repository must be denied from any cwd",
  );
  assert.equal(
    redirected("git checkout main"),
    null,
    "another repository is out of scope",
  );
});
