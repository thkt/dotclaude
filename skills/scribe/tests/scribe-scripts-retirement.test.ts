/// <reference types="node" />
// find_wiki_rule.py, triage.py, verify_run.py and structure_page.py (both trees' copies under
// skills/scribe/scripts/, plus each one's *_test.py) are retired in favor of the find_wiki_rule.ts /
// triage.ts / verify_run.ts / structure_page.ts ports U-002/U-003/U-004/U-005 established. This
// file guards the retirement itself, in the same shape
// workflows/_lib/tests/record-retirement.test.ts uses for its own retired build-run recorder: no
// tracked file still names one of the four scripts by its retired filename, and the six SKILL.md
// files (EN + .ja for scribe, think, fix) that used to invoke them through `python3 ... .py` now
// invoke the `.ts` port directly by path.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and docs in one
// change, then confirm zero residual references across git ls-files. A mention under
// docs/decisions/ or .claude/workspace/research/ is kept as historical record (a DR / a research
// report is written once and stays a record of what was true when it was written, not a live
// pointer that retirement obliges to follow), so both are excluded here rather than counted as a
// leftover reference.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// The four scripts this unit retires, named without their extension so the same list drives
// both the retirement regex and the invocation scan below.
const RETIRED_SCRIPTS = ["find_wiki_rule", "triage", "verify_run", "structure_page"];

// A word boundary on both sides, the same shape record-retirement.test.ts's own RETIRED_PATTERN
// uses for its retired recorder: a preceding "/" (a path) or start-of-string counts as a
// reference, and a following non-identifier character (or end of line) closes it off so
// "structure_page_test.py" does not itself contain the retired "structure_page.py" substring.
const RETIRED_PATTERN = new RegExp(`(^|[^\\w.-])(?:${RETIRED_SCRIPTS.join("|")})\\.py\\b`);

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredScript(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-231 no tracked file outside docs/decisions/and .claude/workspace/research/references " +
    "find_wiki_rule.py, triage.py, verify_run.py or structure_page.py as a word, and the same " +
    "predicate flags a fixture line carrying each",
  () => {
    for (const script of RETIRED_SCRIPTS) {
      assertDetectsAndMisses(referencesRetiredScript, `${script}.py`);
    }

    // This test's own file names the four scripts in comments to describe what it checks, so
    // it is excluded the same way record-retirement.test.ts excludes itself; the historical
    // directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredScript,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/ and .claude/workspace/research/ references " +
        `find_wiki_rule.py, triage.py, verify_run.py or structure_page.py\n${offenders.join(", ")}`,
    );
  },
);

const SKILL_MD_SOURCES: { label: string; path: string }[] = [
  { label: "skills/scribe/SKILL.md", path: "skills/scribe/SKILL.md" },
  { label: ".ja/skills/scribe/SKILL.md", path: ".ja/skills/scribe/SKILL.md" },
  { label: "skills/think/SKILL.md", path: "skills/think/SKILL.md" },
  { label: ".ja/skills/think/SKILL.md", path: ".ja/skills/think/SKILL.md" },
  { label: "skills/fix/SKILL.md", path: "skills/fix/SKILL.md" },
  { label: ".ja/skills/fix/SKILL.md", path: ".ja/skills/fix/SKILL.md" },
];

// A backtick-quoted invocation naming one of the four scripts (SKILL.md is Markdown, so inline
// code uses a single backtick, unlike the escaped-backtick template literals
// record-retirement.test.ts's extractRecorderInvocation reads out of build.js/assert.js). Every
// such span in the repository's current SKILL.md files also carries ${CLAUDE_SKILL_DIR}, the
// path variable that tells an actual invocation (`python3 ${CLAUDE_SKILL_DIR}/scripts/triage.py
// ...`) apart from a bare mention of the script's own name (`` `scripts/triage.py` `` naming
// where the threshold lives, with no path in front of it) -- only the former is what T-232
// checks.
const SCRIPT_NAME_IN_SPAN = new RegExp(`\\b(?:${RETIRED_SCRIPTS.join("|")})\\.(?:ts|py)\\b`);

/** Every backtick-quoted span in `source` that both names one of the four scripts and carries
 * ${CLAUDE_SKILL_DIR}, i.e. an actual invocation rather than a bare mention -- read from the
 * source text itself, not a copied literal (docs/wiki/workflow-const-source-text-check.md). */
function scribeScriptInvocations(source: string): string[] {
  const spanPattern = /`([^`\n]*)`/g;
  const invocations: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = spanPattern.exec(source)) !== null) {
    const span = m[1];
    if (span.includes("${CLAUDE_SKILL_DIR}") && SCRIPT_NAME_IN_SPAN.test(span)) {
      invocations.push(span);
    }
  }
  return invocations;
}

test(
  "T-232 the EN and .ja scribe, think and fix SKILL.md invoke the scribe scripts as .ts by " +
    "path and none still invokes python3, read from source text rather than a copied literal",
  () => {
    for (const { label, path } of SKILL_MD_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const invocations = scribeScriptInvocations(source);
      assert.ok(invocations.length > 0, `${label} invokes at least one scribe script by path`);
      for (const invocation of invocations) {
        assert.ok(
          !invocation.includes("python3") && /\.ts\b/.test(invocation),
          `${label} invokes ${invocation.trim()} as .ts by path, not through python3`,
        );
      }
    }
  },
);
