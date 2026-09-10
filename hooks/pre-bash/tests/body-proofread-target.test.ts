/// <reference types="node" />
// Unit tests for the target-selection primitives in hooks/pre-bash/body_proofread.ts (unit
// U-006), the TypeScript side of hooks/pre-bash/body_proofread.py's _target / _heredoc_body.
// Drawn from the target-judgment observations in hooks/pre-bash/tests/body_proofread_test.py
// (a --body-file filing, an inline commit message, a heredoc commit message, and a command that
// writes neither) -- the cases that decide *what* the command line is about to write and *how*
// to label it, not the textlint findings (FINDINGS) or the structure checklist (CHECKLIST) a
// later unit ports alongside _lint_section / _checklist / main.
//
// Every scenario imports body_proofread.ts directly rather than spawning it through
// _hook-harness.ts: the module carries no main() / process.exit in this unit (see its header),
// so an in-process import runs no side effect, the way hooks/_lib/tests/gh-filing.test.ts
// imports hooks/_lib/gh_filing.ts directly.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { COMMIT, FILING, _heredoc_body, _target } from "../body_proofread.ts";

/** An absolute temp file carrying `content`, the way body_proofread_test.py's with_body_file
 * gives --body-file something real to resolve against. */
function tempBodyFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "body-proofread-target-"));
  const path = join(dir, "body.md");
  writeFileSync(path, content, "utf8");
  return path;
}

test("T-303 a gh issue create with a body file selects the filing mode and names that file", () => {
  const content = "この本文は --body-file の指す先から読まれる。";
  const path = tempBodyFile(content);

  const target = _target(`gh issue create --title "test" --body-file ${path}`);

  assert.ok(target, "a --body-file filing must resolve to a target");
  const [mode, body] = target;
  assert.equal(mode, FILING, "the mode must be FILING");
  assert.equal(body, content, "the body must be the content of the file the flag names");
});

test("T-304 a git commit with an inline message selects the commit mode with its length threshold", () => {
  const message = "fix: 十文字の閾値を確認するための commit message です。";

  const target = _target(`git commit -m "${message}"`);

  assert.ok(target, "an inline commit message must resolve to a target");
  const [mode, body] = target;
  assert.equal(mode, COMMIT, "the mode must be COMMIT");
  assert.equal(mode.threshold, 10, "COMMIT carries the same length threshold as the Python side");
  assert.equal(body, message, "the body must be the inline message itself");
});

test("T-305 a heredoc body is read through to its terminator, and an unterminated one leaves no target", () => {
  const body = "一行目の本文\n二行目の本文";
  const terminated = `cat <<'EOF'\n${body}\nEOF\n`;
  assert.equal(
    _heredoc_body(terminated),
    body,
    "the body must run up to, but not include, the terminator line",
  );

  const unterminated = `cat <<'EOF'\n${body}\n`;
  assert.equal(
    _heredoc_body(unterminated),
    null,
    "a marker that never closes must leave no body",
  );
});

test("T-306 a command that is neither a filing nor a commit yields no target", () => {
  assert.equal(_target("git status"), null);
});
