/// <reference types="node" />
// Unit tests for the skeleton-selection primitives in hooks/pre-bash/issue_body_gate.ts (unit
// U-001), the TypeScript side of hooks/pre-bash/issue_body_gate.py's _issue_type / _template /
// the inline deny wording main() builds when _template finds nothing. Drawn from
// hooks/pre-bash/tests/issue_body_gate_test.py's type-to-skeleton observations (T-012's
// repository-form preference, T-006's missing-prefix pass-through, T-016's unmatched-type
// deny), narrowed to the search order and wording this unit covers -- not the body-vs-skeleton
// comparison a later unit wires the validator for.
//
// Every scenario imports issue_body_gate.ts directly rather than spawning it through
// _hook-harness.ts: the module carries no main() / process.exit in this unit (see its header),
// so an in-process import runs no side effect, the same way
// hooks/pre-bash/tests/body-proofread-target.test.ts did before body_proofread.ts grew a
// main(), and the way hooks/_lib/tests/gh-filing.test.ts imports hooks/_lib/gh_filing.ts
// directly.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  TEMPLATES,
  _issue_type,
  _template,
  _unmatched_type_reason,
} from "../issue_body_gate.ts";

/** A fresh directory standing in for a filing's repo_dir, with no .github/ISSUE_TEMPLATE of
 * its own -- the shape _template sees for a type only the skill side could carry. */
function bareRepoDir(): string {
  return mkdtempSync(join(tmpdir(), "issue-body-gate-template-"));
}

/** The same repo_dir, with one form staged under .github/ISSUE_TEMPLATE -- the shape _template
 * sees once the repository defines its own skeleton for a type. */
function repoDirWithForm(issueType: string, extension: "yml" | "md" = "yml"): {
  repoDir: string;
  formPath: string;
} {
  const repoDir = bareRepoDir();
  const forms = join(repoDir, ".github", "ISSUE_TEMPLATE");
  mkdirSync(forms, { recursive: true });
  const formPath = join(forms, `${issueType}.${extension}`);
  writeFileSync(formPath, "name: staged form\n", "utf8");
  return { repoDir, formPath };
}

test("T-316 a title carrying a bracketed type selects the template that type maps to, preferring the repository's ISSUE_TEMPLATE over the skill's", () => {
  const title = "[Bug] Login fails for some users";

  const issueType = _issue_type(title);
  assert.equal(issueType, "bug", "the bracketed prefix must resolve to the lowercased type");

  // skills/issue/templates/bug.md already exists in this checkout (the skill's own skeleton
  // for the type), so staging a repository form for the same type gives _template a real
  // choice between the two, not just an empty skill side.
  const { repoDir, formPath } = repoDirWithForm("bug");

  const template = _template(issueType as string, repoDir);
  assert.equal(
    template,
    formPath,
    "the repository's .github/ISSUE_TEMPLATE/bug.yml must win over skills/issue/templates/bug.md",
  );
});

test("T-317 a title with no bracketed type leaves the filing alone", () => {
  const issueType = _issue_type("Login fails for some users");
  assert.equal(
    issueType,
    null,
    "a title opening with no [Type] prefix must resolve to no type, so no skeleton lookup runs against it",
  );
});

test("T-318 a type with no template on either path is denied with the text naming both directories and the file to add", () => {
  // "spike" carries no form under .github/ISSUE_TEMPLATE (bareRepoDir stages none) and no
  // skeleton under skills/issue/templates (only bug/chore/docs/feature exist there).
  const repoDir = bareRepoDir();

  const template = _template("spike", repoDir);
  assert.equal(
    template,
    null,
    "a type absent from both the repository's ISSUE_TEMPLATE and the skill's templates must resolve to no template",
  );

  const reason = _unmatched_type_reason("spike");
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
  // issue_body_gate.py's main() actually lists as the known types (the same fidelity
  // hooks/pre-bash/tests/body-proofread-notify.test.ts reads body_proofread.md for, per the
  // contract's "deny の文言は1文字も変えない").
  const known = readdirSync(TEMPLATES)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length))
    .sort()
    .join(", ");
  const expected =
    `issue-body-template: 型 [spike] に対応する骨格が .github/ISSUE_TEMPLATE/ にも ` +
    `skills/issue/templates/ にも無く本文を照合できない。型を ${known} のいずれかにするか、` +
    "skills/issue/templates/spike.md を足す";
  assert.equal(reason, expected, "the deny wording must match issue_body_gate.py's inline text exactly");
});
