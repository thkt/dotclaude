/// <reference types="node" />
// record.py (workflows/build/record.py, .ja/workflows/build/record.py, workflows/assert/record.py,
// .ja/workflows/assert/record.py) is retired in favor of record.ts (established by the preceding
// units U-002/U-003/U-004). This file guards the retirement itself: no tracked file still names
// record.py, and the EN / .ja recorder prompts in build.js / assert.js invoke record.ts through
// node rather than record.py through python3.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and docs in one
// change, then confirm zero residual references across git ls-files. A mention under
// docs/decisions/ or .claude/workspace/research/ is kept as historical record (a DR / a research
// report is written once and stays a record of what was true when it was written, not a live
// pointer that retirement obliges to follow), so both are excluded here rather than counted as a
// leftover reference. docs/wiki/supply-list-single-source.md's mention of record.py is the cited
// basis line for issue #557 (a quote of the pre-retirement asymmetry the issue reported), not a
// live pointer either, so it is excluded the same way.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const HISTORICAL_FILE = "docs/wiki/supply-list-single-source.md";

// Not the directory-qualified form gate-retirement.test.ts uses for its own retired path: build.js
// calls bundled("workflows/build/record.py") but assert.js calls `${SCRIPTS}/record.py`, and both
// files' RECORD_SCHEMA `description` strings and prompt comments name the bare "record.py" with
// no directory at all. A directory-qualified needle would miss all of those, so the needle here
// is the filename with a word boundary, and a preceding `/` counts as a reference.
const RETIRED_PATTERN = /(^|[^\w.-])record\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-113 no tracked file outside docs/decisions/, .claude/workspace/research/ and " +
    "docs/wiki/supply-list-single-source.md references record.py as a word, and the same " +
    "predicate flags a fixture line carrying it",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "record.py");

    // This test's own file names record.py in comments to describe what it checks, and the
    // #557 basis line keeps the retired name as history rather than as a live reference; the
    // historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredPath,
      [SELF_PATH, HISTORICAL_FILE],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/, .claude/workspace/research/ and " +
        `docs/wiki/supply-list-single-source.md references record.py\n${offenders.join(", ")}`,
    );
  },
);

// Same extraction shape as workflows/_lib/tests/gate-retirement.test.ts's extractGateScript:
// read the source text and pull out what the recorder prompt actually invokes, never a
// copied-in literal (docs/wiki/workflow-const-source-text-check.md).
//
// Both files' prompts carry the recorder invocation inside a template literal, quoted with
// escaped backticks (\`...\`). The anchor is the escaped pair that names the recorder file,
// not the prose around it: the template literal's own backtick opens the line, and other
// prompts in the same file number their steps the same way.
function extractRecorderInvocation(source: string): string | null {
  const m = source.match(/\\`([^`\n]*\brecord\.(?:ts|py)\b[^`\n]*)\\`/);
  return m ? m[1] : null;
}

interface RecorderPromptSource {
  label: string;
  path: string;
}

const RECORDER_PROMPT_SOURCES: RecorderPromptSource[] = [
  { label: "workflows/build.js", path: "workflows/build.js" },
  { label: ".ja/workflows/build.js", path: ".ja/workflows/build.js" },
  { label: "workflows/assert.js", path: "workflows/assert.js" },
  { label: ".ja/workflows/assert.js", path: ".ja/workflows/assert.js" },
];

test(
  "T-114 the EN and .ja build.js and assert.js recorder prompts each invoke record.ts " +
    "through node and none still invokes python3, read from source text rather than a copied " +
    "literal",
  () => {
    for (const { label, path } of RECORDER_PROMPT_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const invocation = extractRecorderInvocation(source);
      assert.ok(invocation, `${label} recorder prompt's invocation is extractable from source`);
      // One fixed line per source, carrying no offender list, so a --require-output anchor on
      // the Red gate can seal on exactly one line rather than on a set that could reorder.
      assert.ok(
        invocation !== null &&
          invocation.startsWith("node ") &&
          invocation.includes("record.ts") &&
          !invocation.includes("python3"),
        `${label} recorder prompt still invokes python3`,
      );
    }
  },
);
