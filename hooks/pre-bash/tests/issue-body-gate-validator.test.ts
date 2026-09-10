/// <reference types="node" />
// Unit tests for hooks/pre-bash/issue_body_gate.ts's validator-invocation primitives (unit
// U-002), the TypeScript side of hooks/pre-bash/issue_body_gate.py's DEFAULT_BUN / _interpreter
// / _errors / main. Drawn from hooks/pre-bash/tests/issue_body_gate_test.py's
// test_no_bun_or_node_interpreter_denies, test_a_validator_that_cannot_run_denies,
// test_body_missing_a_required_section_is_denied and test_body_following_the_skeleton_passes,
// narrowed to the two deny wordings this unit adds -- the search order and the skeleton-to-body
// comparison itself stay unit U-001's and skills/issue/scripts/validate-issue-body.test.ts's.
//
// Every scenario spawns the hook (run(), from _hook-harness.ts) rather than importing
// issue_body_gate.ts in-process: once this unit adds main(), the module ends in an unguarded
// process.exit(main()) (DR-0114, no isMainModule guard), so an in-process import would exit the
// test runner's own process the moment the import ran -- the same hazard
// hooks/pre-bash/tests/body-proofread-notify.test.ts avoids the same way.
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const HOOK = join(HERE, "..", "issue_body_gate.ts");
// hooks/pre-bash/tests -> hooks/pre-bash -> hooks -> repo root, the same three levels
// issue_body_gate.py's Path(__file__).resolve().parents[2] climbs from hooks/pre-bash/.
const REPO_ROOT = join(HERE, "..", "..", "..");

// The same fixture body issue_body_gate_test.py's VALID_BUG_BODY / MISSING_SECTION_BUG_BODY use,
// narrowed to what this unit's scenarios need: a body the real bug.md skeleton accepts, and the
// same body with "Expected vs Actual" dropped so the validator's missing_section error fires.
const VALID_BUG_BODY = `## What & Why

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

const MISSING_SECTION_BUG_BODY = `## What & Why

Login fails for some users.

## Steps to Reproduce

1. Open app
2. Log in

## Scope

- In scope: login flow
- Out of scope: signup flow
`;

interface Decision {
  hookSpecificOutput?: {
    permissionDecision?: string;
    permissionDecisionReason?: string;
  };
}

function withBodyFile(body: string, name = "body.md"): string {
  const dir = mkdtempSync(join(tmpdir(), "issue-body-gate-validator-"));
  const path = join(dir, name);
  writeFileSync(path, body, "utf8");
  return path;
}

// cwd left at bodyPath's own directory: the hook looks for a repository's own
// .github/ISSUE_TEMPLATE first, and none exists there, so the skill's skills/issue/templates/
// bug.md is the skeleton every scenario here compares against.
function bugIssueCmd(bodyPath: string): string {
  return (
    `cd ${dirname(bodyPath)} && gh issue create ` +
    `--title "[Bug] Login fails for some users" --body-file ${bodyPath}`
  );
}

function runHook(hook: string, command: string, env?: NodeJS.ProcessEnv): Decision | null {
  const stdout = run(hook, { tool_name: "Bash", tool_input: { command } }, env);
  return stdout.trim() ? (JSON.parse(stdout) as Decision) : null;
}

function decisionOf(out: Decision | null): string | undefined {
  return out?.hookSpecificOutput?.permissionDecision;
}

function reasonOf(out: Decision | null): string {
  return out?.hookSpecificOutput?.permissionDecisionReason ?? "";
}

/** A scratch checkout carrying the hook, the _lib modules it imports, and
 * skills/issue/templates/bug.md, but no skills/issue/scripts/ -- so _template still resolves
 * the bug skeleton (the interpreter check this test is not exercising) while the interpreter has
 * nothing to run VALIDATOR from. issue_body_gate.py's stdout stays empty the same way a broken
 * skeleton crashes the real validator before report() ever writes
 * (issue_body_gate_test.py's test_a_validator_that_cannot_run_denies). */
function scratchWithoutValidator(): { hook: string; bodyPath: string } {
  const root = mkdtempSync(join(tmpdir(), "issue-body-gate-no-validator-"));
  mkdirSync(join(root, "hooks", "pre-bash"), { recursive: true });
  mkdirSync(join(root, "hooks", "_lib"), { recursive: true });
  mkdirSync(join(root, "skills", "issue", "templates"), { recursive: true });
  const hook = join(root, "hooks", "pre-bash", "issue_body_gate.ts");
  copyFileSync(HOOK, hook);
  for (const name of ["gh_filing.ts", "command_scan.ts", "hook_payload.ts"]) {
    copyFileSync(join(REPO_ROOT, "hooks", "_lib", name), join(root, "hooks", "_lib", name));
  }
  copyFileSync(
    join(REPO_ROOT, "skills", "issue", "templates", "bug.md"),
    join(root, "skills", "issue", "templates", "bug.md"),
  );
  const repoDir = join(root, "repo");
  mkdirSync(repoDir, { recursive: true });
  const bodyPath = join(repoDir, "body.md");
  writeFileSync(bodyPath, VALID_BUG_BODY, "utf8");
  return { hook, bodyPath };
}

test("T-319 with CLAUDE_BUN_BIN unresolvable and PATH empty the filing is denied with the text naming CLAUDE_BUN_BIN and node", () => {
  const bodyPath = withBodyFile(VALID_BUG_BODY);
  const env = { ...process.env, CLAUDE_BUN_BIN: "/nonexistent", PATH: "" };
  const out = runHook(HOOK, bugIssueCmd(bodyPath), env);
  assert.equal(decisionOf(out), "deny", "no bun override and no PATH must deny the filing");
  const reason = reasonOf(out);
  assert.match(reason, /CLAUDE_BUN_BIN/, "the reason must name CLAUDE_BUN_BIN as the way out");
  assert.match(reason, /node/, "the reason must name node as the PATH fallback");
});

test("T-320 a validator whose stdout carries no errors array denies with the text telling the reader to run it directly", () => {
  const { hook, bodyPath } = scratchWithoutValidator();
  const out = runHook(hook, bugIssueCmd(bodyPath));
  assert.equal(
    decisionOf(out),
    "deny",
    "a validator with nothing to run from must deny rather than pass the filing through unread",
  );
  assert.match(
    reasonOf(out),
    /bun.*node.*直接実行して出力を確かめる/,
    "the reason must tell the reader to run the validator directly with bun or node",
  );
});

test("T-321 a validator reporting errors denies with those errors joined, and one reporting none leaves the filing alone", () => {
  const missing = runHook(HOOK, bugIssueCmd(withBodyFile(MISSING_SECTION_BUG_BODY)));
  assert.equal(
    decisionOf(missing),
    "deny",
    "a body the validator reports errors for must deny",
  );
  assert.match(
    reasonOf(missing),
    /missing_section:Expected vs Actual/,
    "the reason must carry the validator's own error joined in, not a rewritten summary",
  );

  const valid = runHook(HOOK, bugIssueCmd(withBodyFile(VALID_BUG_BODY)));
  assert.notEqual(
    decisionOf(valid),
    "deny",
    "a body the validator reports no errors for must leave the filing alone",
  );
});
