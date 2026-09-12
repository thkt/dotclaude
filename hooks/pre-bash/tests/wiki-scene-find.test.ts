/// <reference types="node" />
// Unit tests for hooks/pre-bash/wiki_scene.ts's find (unit U-003), ported from the retired
// Python original's SCENE_COMMANDS/find, drawn from the retired Python test's own gh-command
// / tilde-cd / no-docs/wiki observations (T-009/T-011/T-012 there), narrowed to what find's
// cd-walk and scene-table
// match decide -- not _runtime()/find_wiki_rule.ts wiring, which stays out of this unit.
//
// Spawns the hook (run(), from _hook-harness.ts) rather than importing wiki_scene.ts
// in-process: it ends in an unguarded process.exit(main()) (DR-0114, no isMainModule guard,
// same as hooks/pre-bash/body_proofread.ts and hooks/pre-bash/issue_body_gate.ts), so an
// in-process import would exit the test runner's own process the moment the import ran.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const HOOK = join(HERE, "..", "wiki_scene.ts");

function runHook(command: string, env?: NodeJS.ProcessEnv): string {
  return run(HOOK, { tool_name: "Bash", tool_input: { command } }, env);
}

interface Notification {
  hookSpecificOutput?: { additionalContext?: string };
}

function contextOf(stdout: string): string {
  if (!stdout.trim()) {
    return "";
  }
  return (JSON.parse(stdout) as Notification).hookSpecificOutput?.additionalContext ?? "";
}

/** A repository directory carrying docs/wiki/, following wiki_scene_test.py's with_wiki. */
function repoWithWiki(): string {
  const repo = mkdtempSync(join(tmpdir(), "wiki-scene-find-"));
  mkdirSync(join(repo, "docs", "wiki"), { recursive: true });
  return repo;
}

/** One docs/wiki page tagged `scenes: [scene]`, the same fixture shape
 * wiki_scene_test.py's ISSUE_CLOSE_PAGE uses. */
function scenePage(repo: string, name: string, scene: string): void {
  writeFileSync(
    join(repo, "docs", "wiki", `${name}.md`),
    `---\nglobs: []\nscenes: ["${scene}"]\n---\n\n# ${name}\n`,
    "utf8",
  );
}

test("T-322 each command the scene table names yields its scene, and a command outside the table yields nothing", () => {
  const cases: ReadonlyArray<readonly [command: string, scene: string, page: string]> = [
    ["gh issue create --title t", "issue-create", "issue-create-page"],
    ["gh pr create --title t", "pr-create", "pr-create-page"],
    ["gh issue close 42", "issue-close", "issue-close-page"],
  ];
  for (const [command, scene, page] of cases) {
    const repo = repoWithWiki();
    scenePage(repo, page, scene);
    const context = contextOf(runHook(`cd ${repo} && ${command}`));
    assert.match(
      context,
      new RegExp(`${page}\\.md`),
      `${command} must report the ${scene} page from its own directory's docs/wiki`,
    );
  }

  const repo = repoWithWiki();
  scenePage(repo, "issue-close-page", "issue-close");
  const stdout = runHook(`cd ${repo} && gh issue comment 42 --body hi`);
  assert.equal(stdout.trim(), "", "a command outside the scene table must yield no output");
});

test("T-323 a cd with a tilde ahead of the command resolves against HOME rather than the current directory", () => {
  // A `~` that reaches docs/wiki lookup unexpanded resolves against cwd instead of HOME, lands
  // on a directory named literally "~" that never exists, and comes back indistinguishable
  // from T-324's no-docs/wiki case: both print nothing.
  const home = mkdtempSync(join(tmpdir(), "wiki-scene-find-home-"));
  mkdirSync(join(home, "myrepo", "docs", "wiki"), { recursive: true });
  writeFileSync(
    join(home, "myrepo", "docs", "wiki", "issue-close-page.md"),
    '---\nglobs: []\nscenes: ["issue-close"]\n---\n\n# issue-close-page\n',
    "utf8",
  );

  const context = contextOf(
    runHook("cd ~/myrepo && gh issue close 42", { ...process.env, HOME: home }),
  );
  assert.match(
    context,
    /issue-close-page\.md/,
    "the tilde must expand against HOME, not the hook's own working directory",
  );
});

test("T-324 a repository without docs/wiki yields no output", () => {
  const repo = mkdtempSync(join(tmpdir(), "wiki-scene-find-no-wiki-"));
  const stdout = runHook(`cd ${repo} && gh issue close 42`);
  assert.equal(stdout.trim(), "", "a repository without docs/wiki must yield no output");
});
