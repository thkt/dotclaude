/// <reference types="node" />
// validate-issue-body.py and pick-plan.py (skills/issue/scripts/, .ja mirror) are retired in
// favor of their .ts ports (established by the preceding units U-002/U-003/U-004). This file
// guards the retirement itself, in the same two-test shape as record-retirement.test.ts: T-194
// scans the whole tree for a leftover reference to either retired name, and T-195 checks that
// the callers actually switched to the .ts path and dropped python3 — the EN / .ja issue and
// slice SKILL.md files (which invoke the scripts by path) and the issue-body-gate hook (which
// shells out to the validator).
//
// Historical exclusions follow docs/wiki/retire-rename-procedure.md: docs/decisions/ and
// .claude/workspace/research/ are offendersAmong's own default (a DR / a research report stays a
// record of what was true when it was written, not a live pointer retirement obliges to follow).
// docs/wiki/deterministic-script-judgment.md additionally carries the #389 issue's basis line,
// which names pick-plan.py as the thing that issue moved plan-selection logic into — that
// sentence describes a past event and stays as written, so the whole file is excluded here the
// same way record-retirement.test.ts excludes its own HISTORICAL_FILE.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const HISTORICAL_FILE = "docs/wiki/deterministic-script-judgment.md";

// Word-boundary needles, same shape as record-retirement.test.ts's RETIRED_PATTERN: a preceding
// char that is a word char, dot, or hyphen blocks the match, so a differently-named script that
// merely ends in one of these names (e.g. a hypothetical "quick-pick-plan.py") is not flagged.
const VALIDATE_ISSUE_BODY_PATTERN = /(^|[^\w.-])validate-issue-body\.py\b/;
const PICK_PLAN_PATTERN = /(^|[^\w.-])pick-plan\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredScript(content: string): boolean {
  return VALIDATE_ISSUE_BODY_PATTERN.test(content) || PICK_PLAN_PATTERN.test(content);
}

test(
  "T-194 no tracked file outside docs/decisions/, .claude/workspace/research/and " +
    "docs/wiki/deterministic-script-judgment.md references validate-issue-body.py or " +
    "pick-plan.py as a word, and the same predicate flags a fixture line carrying each",
  () => {
    assertDetectsAndMisses(referencesRetiredScript, "validate-issue-body.py");
    assertDetectsAndMisses(referencesRetiredScript, "pick-plan.py");

    // This test's own file names both retired scripts in comments to describe what it checks,
    // and docs/wiki/deterministic-script-judgment.md's #389 basis line keeps pick-plan.py as
    // history rather than as a live reference; the historical directories are offendersAmong's
    // own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredScript,
      [SELF_PATH, HISTORICAL_FILE],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/, .claude/workspace/research/ and " +
        "docs/wiki/deterministic-script-judgment.md references validate-issue-body.py or " +
        `pick-plan.py\n${offenders.join(", ")}`,
    );
  },
);

// Same extraction shape as workflows/_lib/tests/record-retirement.test.ts's
// extractRecorderInvocation: read the source text and pull out what the caller actually
// invokes, never a copied-in literal (docs/wiki/workflow-const-source-text-check.md).
//
// The issue and slice SKILL.md files spell the invoked script as
// `${CLAUDE_SKILL_DIR}/scripts/<name>.<ext>` (issue) or
// `${CLAUDE_SKILL_DIR}/../issue/scripts/<name>.<ext>` (slice); either way the extension sits
// right after "scripts/<name>.".
function scriptInvocationExtension(source: string, scriptName: string): string | null {
  const m = source.match(new RegExp(`scripts/${scriptName}\\.(py|ts)\\b`));
  return m ? m[1] : null;
}

interface SkillSource {
  label: string;
  path: string;
  scripts: string[];
}

const SKILL_SOURCES: SkillSource[] = [
  {
    label: "skills/issue/SKILL.md",
    path: "skills/issue/SKILL.md",
    scripts: ["pick-plan", "validate-issue-body"],
  },
  {
    label: ".ja/skills/issue/SKILL.md",
    path: ".ja/skills/issue/SKILL.md",
    scripts: ["pick-plan", "validate-issue-body"],
  },
  {
    label: "skills/slice/SKILL.md",
    path: "skills/slice/SKILL.md",
    scripts: ["validate-issue-body"],
  },
  {
    label: ".ja/skills/slice/SKILL.md",
    path: ".ja/skills/slice/SKILL.md",
    scripts: ["validate-issue-body"],
  },
];

// The hook builds VALIDATOR from path segments rather than spelling a bare filename, so its
// extraction anchors on the assignment itself: `VALIDATOR = ROOT / ... / "validate-issue-body.<ext>"`.
function validatorPathExtension(source: string): string | null {
  const m = source.match(/VALIDATOR\s*=[^\n]*"validate-issue-body\.(py|ts)"/);
  return m ? m[1] : null;
}

test(
  "T-195 the en and ja issue and slice skill files invoke the issue scripts by their .ts path " +
    "and the issue body gate hook names the validator's .ts path, and none of them still names " +
    "python3 for those scripts",
  () => {
    for (const { label, path, scripts } of SKILL_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      for (const scriptName of scripts) {
        const ext = scriptInvocationExtension(source, scriptName);
        assert.equal(ext, "ts", `${label} invokes ${scriptName} by its .ts path, got .${ext}`);
      }
      assert.ok(!source.includes("python3"), `${label} still names python3`);
    }

    const hookPath = "hooks/pre-bash/issue_body_gate.py";
    const hookSource = readFileSync(join(REPO_ROOT, hookPath), "utf8");
    const validatorExt = validatorPathExtension(hookSource);
    assert.equal(
      validatorExt,
      "ts",
      `${hookPath} names the validator's .ts path, got .${validatorExt}`,
    );
    assert.ok(
      !hookSource.includes("python3 で直接実行して"),
      `${hookPath} error text still tells to run python3 directly`,
    );
    assert.ok(
      hookSource.includes("bun か node で直接実行して"),
      `${hookPath} error text does not tell to run bun or node directly`,
    );
  },
);
