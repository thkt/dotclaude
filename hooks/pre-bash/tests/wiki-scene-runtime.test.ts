/// <reference types="node" />
// Unit tests for hooks/pre-bash/wiki_scene.ts's _runtime/_scene_pages (unit U-004), the
// TypeScript side of wiki_scene.py's own _runtime/_scene_pages. Ported from
// hooks/pre-bash/tests/wiki_scene_test.py's test_an_unresolvable_runtime_yields_no_output_and_exits_0
// (T-325) and the finder non-zero-exit reasoning wiki_scene.py's _scene_pages comment states
// (T-326) -- narrowed to what a missing runtime and a failing/succeeding finder decide, not
// find/SCENE_COMMANDS, which wiki-scene-find.test.ts already covers.
//
// Spawns the hook (run(), from _hook-harness.ts) rather than importing wiki_scene.ts
// in-process, for the same reason wiki-scene-find.test.ts does: main() ends in an unguarded
// process.exit(main()) (DR-0114, no isMainModule guard).
//
// T-326 stands in for find_wiki_rule.ts's own exit by pointing CLAUDE_BUN_BIN at a stub
// executable: wiki_scene.ts's _scene_pages spawns whatever CLAUDE_BUN_BIN resolves to with
// FIND_WIKI_RULE as its first argument, so a stub that ignores that argument and exits or
// prints on its own stands in for the finder process without changing wiki_scene.ts itself.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const HOOK = join(HERE, "..", "wiki_scene.ts");

function runHook(command: string, env: NodeJS.ProcessEnv): string {
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

/** A repository directory carrying docs/wiki/ with one page tagged issue-close, following
 * wiki-scene-find.test.ts's repoWithWiki/scenePage. */
function repoWithWiki(): string {
  const repo = mkdtempSync(join(tmpdir(), "wiki-scene-runtime-"));
  const wiki = join(repo, "docs", "wiki");
  mkdirSync(wiki, { recursive: true });
  writeFileSync(
    join(wiki, "issue-close-page.md"),
    '---\nglobs: []\nscenes: ["issue-close"]\n---\n\n# issue-close-page\n',
    "utf8",
  );
  return repo;
}

/** An executable shell script standing in for whatever CLAUDE_BUN_BIN resolves to, ignoring
 * the FIND_WIKI_RULE argv wiki_scene.ts passes it and instead running `body` directly -- the
 * seam T-326 uses to control what the finder subprocess does without touching wiki_scene.ts. */
function runtimeStub(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "wiki-scene-runtime-stub-"));
  const script = join(dir, "stub-runtime.sh");
  writeFileSync(script, `#!/bin/sh\n${body}\n`, "utf8");
  chmodSync(script, 0o755);
  return script;
}

test("T-325 with CLAUDE_BUN_BIN unresolvable and PATH empty the hook exits 0 with no output rather than reporting a hook error", () => {
  const repo = repoWithWiki();
  const stdout = runHook(`cd ${repo} && gh issue close 42`, {
    ...process.env,
    CLAUDE_BUN_BIN: "/nonexistent",
    PATH: "",
  });
  assert.equal(
    stdout.trim(),
    "",
    "an unresolvable runtime must read as no page, not as a hook error",
  );
});

test("T-326 a finder exiting non-zero yields no output, and a finder naming pages reaches notify with those page names", () => {
  const failing = runtimeStub("exit 3");
  const repoForFailure = repoWithWiki();
  const stdoutOnFailure = runHook(`cd ${repoForFailure} && gh issue close 42`, {
    ...process.env,
    CLAUDE_BUN_BIN: failing,
  });
  assert.equal(
    stdoutOnFailure.trim(),
    "",
    "a finder that exits non-zero must read as no pages, not as a hook error",
  );

  const succeeding = runtimeStub(`echo '{"scenes":["stub-issue-close-page.md"]}'`);
  const repoForSuccess = repoWithWiki();
  const stdoutOnSuccess = runHook(`cd ${repoForSuccess} && gh issue close 42`, {
    ...process.env,
    CLAUDE_BUN_BIN: succeeding,
  });
  assert.match(
    contextOf(stdoutOnSuccess),
    /stub-issue-close-page\.md/,
    "a finder naming pages must reach notify with those page names",
  );
});
