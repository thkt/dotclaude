/// <reference types="node" />
// verify-commit.py (workflows/code/verify-commit.py, .ja/workflows/code/verify-commit.py,
// workflows/code/tests/verify_commit_test.py) is retired in favor of verify-commit.ts
// (established by the preceding units U-001/U-002/U-003/U-004). This file guards the
// retirement itself: no tracked file still names verify-commit.py, the EN / .ja commitcheck
// prompts in code.js invoke verify-commit.ts through node rather than python3, and build.js's
// CONVENTIONAL_PREFIX type list stays the same set as verify-commit.ts's COMMIT_TYPES.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and docs in one
// change, then confirm zero residual references across git ls-files. A mention under
// docs/decisions/ or .claude/workspace/research/ is kept as historical record (a DR / a
// research report is written once and stays a record of what was true when it was written,
// not a live pointer that retirement obliges to follow), so both are excluded here rather
// than counted as a leftover reference.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../_lib/tests/_retirement.ts";
import { COMMIT_TYPES } from "../verify-commit.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// Same shape as record-retirement.test.ts's RETIRED_PATTERN: a word boundary on the retired
// filename, with a preceding "." or "-" excluded so a compound name (old-verify-commit.py)
// does not false-positive.
const RETIRED_PATTERN = /(^|[^\w.-])verify-commit\.py\b/;

function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-158 no tracked file outside docs/decisions/and .claude/workspace/research/references " +
    "verify-commit.py as a word, and the same predicate flags a fixture line carrying it",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "verify-commit.py");

    // This test's own file names verify-commit.py in comments to describe what it checks;
    // the historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredPath,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/ and .claude/workspace/research/ references " +
        `verify-commit.py\n${offenders.join(", ")}`,
    );
  },
);

// build.js and .ja/workflows/build.js each derive CONVENTIONAL_PREFIX's type alternation as a
// regex literal; oxfmt may fold that literal onto the next line, so the pattern below reads
// past newlines with \s* rather than assuming the whole declaration sits on one line.
const CONVENTIONAL_PREFIX_PATTERN = /const CONVENTIONAL_PREFIX =\s*\/\^\(\?:([^)]+)\)/;

function extractCommitTypes(source: string): string[] | null {
  const m = source.match(CONVENTIONAL_PREFIX_PATTERN);
  if (!m) return null;
  return m[1]
    .split("|")
    .map((type) => type.trim())
    .filter(Boolean);
}

test(
  "T-159 the commit types build.js and .ja/workflows/build.js strip from a PR title equal " +
    "verify-commit.ts's COMMIT_TYPES as a set",
  () => {
    const canonical = new Set<string>(COMMIT_TYPES);

    for (const path of ["workflows/build.js", ".ja/workflows/build.js"]) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const extracted = extractCommitTypes(source);
      assert.ok(
        extracted,
        `${path}: CONVENTIONAL_PREFIX's type alternation is extractable from source`,
      );
      const extractedTypes = extracted as string[];
      const extractedSet = new Set(extractedTypes);
      const onlyInBuild = extractedTypes.filter((type) => !canonical.has(type));
      const onlyInCanonical = [...canonical].filter((type) => !extractedSet.has(type));
      assert.deepEqual(
        { onlyInBuild, onlyInCanonical },
        { onlyInBuild: [], onlyInCanonical: [] },
        `${path}: CONVENTIONAL_PREFIX's type set differs from verify-commit.ts's COMMIT_TYPES ` +
          `(only in ${path}: ${onlyInBuild.join(", ")}; only in COMMIT_TYPES: ${onlyInCanonical.join(", ")})`,
      );

      // Positive control: dropping one type from the extracted list must read as a mismatch,
      // so this comparison cannot pass merely because both sides are frozen to agree
      // (docs/wiki/absence-test-positive-control-fixture.md).
      const droppedSet = new Set(extractedTypes.slice(1));
      assert.notDeepEqual(
        droppedSet,
        canonical,
        `${path}: positive control - a type list missing one entry must not compare equal to COMMIT_TYPES`,
      );
    }
  },
);

// Same extraction shape as record-retirement.test.ts's extractRecorderInvocation: read the
// source text and pull out what the commitcheck prompt actually invokes, never a copied-in
// literal (docs/wiki/workflow-const-source-text-check.md). Unlike build.js's recorder prompt,
// code.js's commitcheck command is not built inside an outer prompt string (no backslash
// escaping the backtick), and the invocation names the script only through the
// `verifyCommitScript` variable.
//
// That split is why one extraction is not enough. The backtick carries the interpreter and
// the variable, so it cannot tell verify-commit.ts from verify-commit.py: the path lives in
// the `const verifyCommitScript = bundled(...)` statement, and pointing that statement back
// at the retired script leaves the backtick's text identical. The two extractions below read
// the two halves, and T-160 asserts on both.
function extractCommitcheckInvocation(source: string): string | null {
  const m = source.match(/`([^`\n]*\bverifyCommitScript\b[^`\n]*)`/);
  return m ? m[1] : null;
}

function extractVerifyCommitScriptPath(source: string): string | null {
  const m = source.match(/const\s+verifyCommitScript\s*=\s*bundled\(\s*"([^"]+)"\s*\)/);
  return m ? m[1] : null;
}

interface CommitcheckPromptSource {
  label: string;
  path: string;
}

const COMMITCHECK_PROMPT_SOURCES: CommitcheckPromptSource[] = [
  { label: "workflows/code.js", path: "workflows/code.js" },
  { label: ".ja/workflows/code.js", path: ".ja/workflows/code.js" },
];

test(
  "T-160 the EN and .ja code.js commitcheck prompts each invoke verify-commit.ts through " +
    "node and neither still invokes python3, read from source text rather than a copied literal",
  () => {
    for (const { label, path } of COMMITCHECK_PROMPT_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const scriptPath = extractVerifyCommitScriptPath(source);
      assert.equal(
        scriptPath,
        "workflows/code/verify-commit.ts",
        `${label} points verifyCommitScript at ${scriptPath}, not at the replacement script`,
      );

      const invocation = extractCommitcheckInvocation(source);
      assert.ok(invocation, `${label} commitcheck prompt's invocation is extractable from source`);
      // One fixed line, carrying no offender list, so a --require-output anchor on the Red
      // gate can seal on exactly one line rather than on a set that could reorder.
      assert.ok(
        invocation !== null && invocation.includes("node") && !invocation.includes("python3"),
        "workflows/code.js commitcheck prompt still invokes python3",
      );
    }
  },
);
