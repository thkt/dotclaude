/// <reference types="node" />
// Unit tests for the target-selection primitives in hooks/pre-bash/body_proofread.ts (unit
// U-006), the TypeScript side of hooks/pre-bash/body_proofread.py's _target / _heredoc_body.
// Drawn from the target-judgment observations in hooks/pre-bash/tests/body_proofread_test.py
// (a --body-file filing, an inline commit message, a heredoc commit message, and a command that
// writes neither) -- the cases that decide *what* the command line is about to write, not the
// textlint findings (FINDINGS) or the structure checklist (CHECKLIST) unit U-007 wires into
// main (still a stub there -- see hooks/pre-bash/tests/body-proofread-notify.test.ts).
//
// Converted to spawn the hook (run(), from _hook-harness.ts) rather than importing
// body_proofread.ts in-process, now that unit U-007 gives it a top-level
// `process.exit(main())` (DR-0114, no isMainModule guard): an in-process import would run
// main() and exit the test runner's own process the moment the import ran -- the same hazard
// client-identifier-gate.test.ts avoids the same way. A spawned run cannot read _target's
// return value directly, so each scenario below observes _target's decision the way
// body_proofread_test.py itself does: whether the hook prints anything at all. That is enough
// to tell "resolved to a target" from "resolved to none" without needing the checklist/findings
// content unit U-007 has not wired up yet.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const HOOK = join(HERE, "..", "body_proofread.ts");

/** An absolute temp file carrying `content`, the way body_proofread_test.py's with_body_file
 * gives --body-file something real to resolve against. */
function tempBodyFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "body-proofread-target-"));
  const path = join(dir, "body.md");
  writeFileSync(path, content, "utf8");
  return path;
}

function runHook(command: string): string {
  return run(HOOK, { tool_name: "Bash", tool_input: { command } });
}

test("T-303 a gh issue create with a body file selects the filing mode and names that file", () => {
  const path = tempBodyFile("この本文は --body-file の指す先から読まれる。");

  const hit = runHook(`gh issue create --title "test" --body-file ${path}`);
  assert.notEqual(hit, "", "a --body-file filing whose file resolves must reach notify");

  // A path that resolves to nothing readable leaves _filing_body, and so _target, with no
  // body -- the contrast that shows the first run's output came from reading that file, not
  // from the command line alone.
  const miss = runHook(`gh issue create --title "test" --body-file ${path}.missing`);
  assert.equal(miss, "", "a --body-file naming nothing readable must resolve to no target");
});

test("T-304 a git commit with an inline message selects the commit mode with its length threshold", () => {
  const hit = runHook('git commit -m "fix: 十文字の閾値を確認するための commit message です。"');
  assert.notEqual(hit, "", "an inline commit message must resolve to a target");

  // An inline message that is empty carries no body for _commit_body to return, the same
  // contrast T-303 draws for a filing's --body-file.
  const miss = runHook('git commit -m ""');
  assert.equal(miss, "", "an empty inline commit message must resolve to no target");
});

test("T-305 a heredoc body is read through to its terminator, and an unterminated one leaves no target", () => {
  const body = "一行目の本文\n二行目の本文";
  const terminated = `git commit -m "$(cat <<'EOF'\n${body}\nEOF\n)"`;
  assert.notEqual(
    runHook(terminated),
    "",
    "a heredoc body read through to its terminator must resolve to a target",
  );

  // No closing "EOF" line, and the outer double quote from -m "..." stays open too: a real
  // shell would keep reading, and command_scan's tokenizer raises the same way shlex does
  // (caught by _target's try/catch), rather than falling back to some other flag's value.
  const unterminated = `git commit -m "$(cat <<'EOF'\n${body}\n`;
  assert.equal(
    runHook(unterminated),
    "",
    "a marker that never closes must leave no target for _commit_body to fall back from",
  );
});

test("T-306 a command that is neither a filing nor a commit yields no target", () => {
  assert.equal(runHook("git status"), "");
});
