/// <reference types="node" />
// Shared, `_`-prefixed fixture body, decision-parsing, and command-building helpers for
// issue-body-gate-template.test.ts and issue-body-gate-validator.test.ts -- both spawn
// hooks/pre-bash/issue_body_gate.ts through run() (_hook-harness.ts) against the same bug.md
// skeleton, so the valid-body fixture and the decision-reading shape are one piece of knowledge
// here rather than duplicated per test file. Follows the same `_`-prefix, no-.ja-mirror shape as
// hooks/_lib/tests/_hook-harness.ts and hooks/_lib/tests/_command-scan-corpus.ts: a pure helper
// other test files import from, not a test file of its own.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { run } from "../../_lib/tests/_hook-harness.ts";

// The same fixture body issue_body_gate_test.py's VALID_BUG_BODY used -- a body the real bug.md
// skeleton accepts, so a scenario not exercising the skeleton mismatch itself still reaches the
// branch under test instead of denying earlier on a body/skeleton mismatch.
export const VALID_BUG_BODY = `## What & Why

Login fails for some users.

## Steps to Reproduce

1. Open app
2. Log in

## Expected vs Actual

- Expected: 200 OK
- Actual: 500 error

## Scope

- In scope: login flow
- Out of scope: signup flow
`;

export interface Decision {
  hookSpecificOutput?: {
    permissionDecision?: string;
    permissionDecisionReason?: string;
  };
}

export function runHook(hook: string, command: string, env?: NodeJS.ProcessEnv): Decision | null {
  const stdout = run(hook, { tool_name: "Bash", tool_input: { command } }, env);
  return stdout.trim() ? (JSON.parse(stdout) as Decision) : null;
}

export function decisionOf(out: Decision | null): string | undefined {
  return out?.hookSpecificOutput?.permissionDecision;
}

export function reasonOf(out: Decision | null): string {
  return out?.hookSpecificOutput?.permissionDecisionReason ?? "";
}

export function withBodyFile(body: string, name = "body.md"): string {
  const dir = mkdtempSync(join(tmpdir(), "issue-body-gate-"));
  const path = join(dir, name);
  writeFileSync(path, body, "utf8");
  return path;
}

// cwd left at bodyPath's own directory: the hook looks for a repository's own
// .github/ISSUE_TEMPLATE first, the shape both files' scenarios need control over.
export function bugIssueCmd(bodyPath: string): string {
  return (
    `cd ${dirname(bodyPath)} && gh issue create ` +
    `--title "[Bug] Login fails for some users" --body-file ${bodyPath}`
  );
}
