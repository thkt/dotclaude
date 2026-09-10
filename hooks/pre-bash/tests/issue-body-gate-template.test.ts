/// <reference types="node" />
// Unit tests for the skeleton-selection primitives in hooks/pre-bash/issue_body_gate.ts (unit
// U-001), ported from the retired Python original's _issue_type / _template / the inline deny
// wording main() builds when _template finds nothing. Drawn from the retired Python test's
// type-to-skeleton observations (T-012's repository-form preference, T-006's missing-prefix
// deny, T-016's unmatched-type deny),
// narrowed to the search order and wording this unit covers -- not the body-vs-skeleton
// comparison unit U-002's validator wiring performs.
//
// Converted to spawn the hook (run(), from _hook-harness.ts) rather than importing
// issue_body_gate.ts in-process, now that unit U-002 gives it a top-level
// `process.exit(main())` (DR-0114, no isMainModule guard): an in-process import would run
// main() -- which blocks on a synchronous read of fd 0 -- and exit the test runner's own
// process the moment the import ran. hooks/pre-bash/tests/body-proofread-target.test.ts made
// the same conversion once body_proofread.ts grew a main(). A spawned run cannot read
// _issue_type / _template / _unmatched_type_reason's return values directly, so each scenario
// below observes the same decision end-to-end through the hook's permissionDecision /
// permissionDecisionReason, the shape issue_body_gate_test.py's own
// test_repository_issue_form_becomes_the_skeleton / test_title_without_a_type_prefix_is_denied /
// test_type_without_a_skeleton_is_denied use.
//
// VALID_BUG_BODY, bugIssueCmd, withBodyFile, and the decision-reading helpers come from
// _issue-body-gate-fixtures.ts, shared with issue-body-gate-validator.test.ts: both spawn this
// same hook against this same bug.md skeleton.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  bugIssueCmd,
  decisionOf,
  reasonOf,
  runHook as runIssueBodyGate,
  VALID_BUG_BODY,
  withBodyFile,
} from "./_issue-body-gate-fixtures.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const HOOK = join(HERE, "..", "issue_body_gate.ts");
// hooks/pre-bash/tests -> hooks/pre-bash -> hooks -> repo root, the same three levels
// issue-body-gate-validator.test.ts climbs from this same directory.
const REPO_ROOT = join(HERE, "..", "..", "..");
const TEMPLATES = join(REPO_ROOT, "skills", "issue", "templates");

function runHook(command: string) {
  return runIssueBodyGate(HOOK, command);
}

// issue_body_gate_test.py's BUG_FORM: a repository issue form naming one required label,
// "Impact", nothing like bug.md's own required sections.
const BUG_FORM = `name: Bug report
body:
  - type: markdown
    attributes:
      value: Thanks for filing
  - type: input
    attributes:
      label: Impact
    validations:
      required: true
`;

// issue_body_gate_test.py's FORM_SHAPED_BODY: meets BUG_FORM's own "Impact" label plus the
// floor the validator keeps for a bug whatever the skeleton requires.
const FORM_SHAPED_BODY = `## Impact

Login is down for everyone.

## Steps to Reproduce

1. Sign in

## Expected vs Actual

- Expected: 200
- Actual: 500
`;

/** A body file in a checkout whose .github/ISSUE_TEMPLATE carries one bug form
 * (issue_body_gate_test.py's staged_form). */
function stagedForm(body: string, form: string = BUG_FORM): string {
  const stage = mkdtempSync(join(tmpdir(), "issue-body-gate-template-form-"));
  const forms = join(stage, ".github", "ISSUE_TEMPLATE");
  mkdirSync(forms, { recursive: true });
  writeFileSync(join(forms, "bug.yml"), form, "utf8");
  const path = join(stage, "body.md");
  writeFileSync(path, body, "utf8");
  return path;
}

test("T-316 a title carrying a bracketed type selects the template that type maps to, preferring the repository's ISSUE_TEMPLATE over the skill's", () => {
  // FORM_SHAPED_BODY meets BUG_FORM's own "Impact" label, not skills/issue/templates/bug.md's
  // "Steps to Reproduce" / "Expected vs Actual" / "What & Why" -- so a pass here proves the
  // repository's form, not the skill's skeleton, was the one compared against.
  const out = runHook(bugIssueCmd(stagedForm(FORM_SHAPED_BODY)));
  assert.notEqual(
    decisionOf(out),
    "deny",
    "the repository's .github/ISSUE_TEMPLATE/bug.yml must win over skills/issue/templates/bug.md",
  );
});

test("T-317 a title with no bracketed type is denied for carrying no type to pin a skeleton with", () => {
  const path = withBodyFile(VALID_BUG_BODY);
  const out = runHook(`gh issue create --title "Login fails for some users" --body-file ${path}`);
  assert.equal(
    decisionOf(out),
    "deny",
    "a title opening with no [Type] prefix must deny, since no skeleton lookup can run against it",
  );
  assert.match(
    reasonOf(out),
    /型プレフィックス/,
    "the reason must name the missing type prefix",
  );
});

test("T-318 a type with no template on either path is denied with the text naming both directories and the file to add", () => {
  // "spike" carries no form under .github/ISSUE_TEMPLATE (bareRepoDir stages none) and no
  // skeleton under skills/issue/templates (only bug/chore/docs/feature exist there).
  const path = withBodyFile("## Nonsense\n\nx\n");
  const out = runHook(
    `cd ${dirname(path)} && gh issue create --title "[Spike] 骨格を持たない型" --body-file ${path}`,
  );
  assert.equal(decisionOf(out), "deny", "a type absent from both directories must deny");
  const reason = reasonOf(out);
  assert.match(
    reason,
    /\.github\/ISSUE_TEMPLATE\//,
    "the deny reason must name the repository's own template directory",
  );
  assert.match(
    reason,
    /skills\/issue\/templates\//,
    "the deny reason must name the skill's template directory",
  );
  assert.match(
    reason,
    /skills\/issue\/templates\/spike\.md を足す$/,
    "the deny reason must name the exact file to add for this type",
  );

  // Read from skills/issue/templates itself rather than hardcoding the type list: a template
  // added there later must not silently desync this test's expectation from what
  // issue_body_gate.ts's _unmatched_type_reason actually lists as the known types (the same
  // fidelity hooks/pre-bash/tests/body-proofread-notify.test.ts reads body_proofread.md for,
  // per the contract's "deny の文言は1文字も変えない").
  const known = readdirSync(TEMPLATES)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length))
    .sort()
    .join(", ");
  const expected =
    `issue-body-template: 型 [spike] に対応する骨格が .github/ISSUE_TEMPLATE/ にも ` +
    `skills/issue/templates/ にも無く本文を照合できない。型を ${known} のいずれかにするか、` +
    "skills/issue/templates/spike.md を足す";
  assert.equal(reason, expected, "the deny wording must match the retired Python original's inline text exactly");
});
