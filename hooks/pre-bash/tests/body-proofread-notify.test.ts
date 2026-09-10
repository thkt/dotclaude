/// <reference types="node" />
// Integration tests for hooks/pre-bash/body_proofread.ts's notify pipeline (unit U-007), the
// TypeScript side of body_proofread.py's _checklist / main. Drawn from the remaining
// observations in hooks/pre-bash/tests/body_proofread_test.py that unit U-006's
// body-proofread-target.test.ts left out: what actually reaches notify, not merely which mode
// _target picks.
//
// Every scenario spawns the hook (run(), from _hook-harness.ts) rather than importing
// body_proofread.ts in-process: main() ends in an unguarded process.exit(main()) (DR-0114), so
// an in-process import would exit the test runner's own process the moment the import ran --
// the same hazard body-proofread-target.test.ts now avoids the same way.
//
// The structure checklist is read straight from hooks/pre-bash/body_proofread.md with the same
// partition-on-"\n## " logic body_proofread.py's _checklist uses, rather than hardcoded here,
// so a byte in that file changing does not silently desync this test's expectation from what
// the hook is meant to send -- the exact-fidelity check the contract's "notify の本文は 1 文字
// も変えない" asks for.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const HOOK = join(HERE, "..", "body_proofread.ts");

const FINDINGS = "textlint 校正結果";
const CHECKLIST_HEADING = "構造レビュー";

/** body_proofread.py's _checklist, read the same way: from the first "\n## " heading down. */
function expectedChecklist(): string {
  const text = readFileSync(join(HERE, "..", "body_proofread.md"), "utf8");
  const marker = "\n## ";
  const at = text.indexOf(marker);
  if (at === -1) {
    return "";
  }
  return `## ${text.slice(at + marker.length)}`.trim();
}

function runHook(command: string): string {
  return run(HOOK, { tool_name: "Bash", tool_input: { command } });
}

/** The additionalContext notify sent, "" for a run that printed nothing or printed something
 * that does not parse as the notify envelope. */
function notifiedContext(stdout: string): string {
  if (!stdout) {
    return "";
  }
  try {
    const parsed = JSON.parse(stdout) as {
      hookSpecificOutput?: { additionalContext?: string };
    };
    return parsed.hookSpecificOutput?.additionalContext ?? "";
  } catch {
    return "";
  }
}

test("T-307 a Japanese body reaches notify with the checklist text unchanged", () => {
  // Short enough to stay under FILING's default Japanese threshold, so the checklist is the
  // only thing in additionalContext -- an exact-equality check against it is meaningful.
  const out = runHook('gh issue create --title "test" --body "テストです。"');
  assert.equal(
    notifiedContext(out),
    expectedChecklist(),
    "additionalContext must carry body_proofread.md's checklist text with no character changed",
  );
});

test("T-308 a body below the Japanese threshold produces no output", () => {
  // COMMIT's threshold is 10; this message carries five Japanese characters (少/し/直/し/た).
  const out = runHook('git commit -m "fix: 少し直した"');
  assert.equal(out, "", "a commit message below COMMIT's threshold must print nothing");
});

test("T-309 a commit message longer than the mode's threshold is proofread and a shorter one is not", () => {
  // Sixteen Japanese characters, well over COMMIT's threshold of 10, with enough 読点 to draw
  // a real max-ten finding -- the same fixture body_proofread_test.py's COMMIT_BODY uses.
  const longer = runHook(
    'git commit -m "fix: これは、テスト、です、が、読点、が、多すぎ、ます。"',
  );
  const longerContext = notifiedContext(longer);
  assert.match(longerContext, new RegExp(FINDINGS), "a commit message over threshold must be proofread");
  assert.doesNotMatch(
    longerContext,
    new RegExp(CHECKLIST_HEADING),
    "a commit message never carries the structure checklist, filing-only",
  );

  const shorter = runHook('git commit -m "fix: 少し直した"');
  assert.equal(shorter, "", "a commit message below threshold must print nothing");
});
