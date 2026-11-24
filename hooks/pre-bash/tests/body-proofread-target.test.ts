/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const HOOK = join(HERE, "..", "body_proofread.ts");

function tempBodyFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "body-proofread-target-"));
  const path = join(dir, "body.md");
  writeFileSync(path, content, "utf8");
  return path;
}

function runHook(command: string): string {
  return run(HOOK, { tool_name: "Bash", tool_input: { command } });
}

test("a gh issue create with a body file selects the filing mode and names that file, and a body file naming nothing readable leaves no target", () => {
  const path = tempBodyFile("この本文は --body-file の指す先から読まれる。");

  const hit = runHook(`gh issue create --title "test" --body-file ${path}`);
  assert.notEqual(hit, "", "a --body-file filing whose file resolves must reach notify");

  const miss = runHook(`gh issue create --title "test" --body-file ${path}.missing`);
  assert.equal(miss, "", "a --body-file naming nothing readable must resolve to no target");
});

test("a git commit with an inline message selects the commit mode with its length threshold, and an empty inline message leaves no target", () => {
  const hit = runHook('git commit -m "fix: 十文字の閾値を確認するための commit message です。"');
  assert.notEqual(hit, "", "an inline commit message must resolve to a target");

  const miss = runHook('git commit -m ""');
  assert.equal(miss, "", "an empty inline commit message must resolve to no target");
});

test("a heredoc body is read through to its terminator, and an unterminated one leaves no target", () => {
  const body = "一行目の本文\n二行目の本文";
  const terminated = `git commit -m "$(cat <<'EOF'\n${body}\nEOF\n)"`;
  assert.notEqual(
    runHook(terminated),
    "",
    "a heredoc body read through to its terminator must resolve to a target",
  );

  const unterminated = `git commit -m "$(cat <<'EOF'\n${body}\n`;
  assert.equal(
    runHook(unterminated),
    "",
    "a marker that never closes must leave no target for _commit_body to fall back from",
  );
});

test("a command that is neither a filing nor a commit yields no target", () => {
  assert.equal(runHook("git status"), "");
});
