/// <reference types="node" />
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
  const out = runHook('gh issue create --title "test" --body "テストです。"');
  assert.equal(
    notifiedContext(out),
    expectedChecklist(),
    "additionalContext must carry body_proofread.md's checklist text with no character changed",
  );
});

test("T-308 a body below the Japanese threshold produces no output", () => {
  const out = runHook('git commit -m "fix: 少し直した"');
  assert.equal(out, "", "a commit message below COMMIT's threshold must print nothing");
});

test("T-309 a commit message longer than the mode's threshold is proofread and a shorter one is not", () => {
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
