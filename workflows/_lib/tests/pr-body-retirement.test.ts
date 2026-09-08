/// <reference types="node" />
// pr-body.py (workflows/build/pr-body.py, .ja/workflows/build/pr-body.py) is retired in favor of
// pr-body.ts (established by the preceding units U-002/U-003). This file guards the retirement
// itself: no tracked file still names pr-body.py, and the EN / .ja build.js Ship prompts invoke
// pr-body.ts through node rather than pr-body.py through python3.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and the wiki in one
// change, then confirm zero residual references across git ls-files. A mention under
// docs/decisions/ or .claude/workspace/research/ is kept as historical record (a DR / a research
// report is written once and stays a record of what was true when it was written, not a live
// pointer that retirement obliges to follow), so both are excluded here rather than counted as a
// leftover reference. docs/wiki/pr-tail-translate-prose-only.md's mention of pr-body.py is the
// cited basis line for issue #176 (a quote of the pre-retirement design, not a live pointer
// either), so it is excluded the same way.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const HISTORICAL_FILE = "docs/wiki/pr-tail-translate-prose-only.md";

// Same shape as record-retirement.test.ts's needle: build.js calls
// bundled("workflows/build/pr-body.py") with no directory qualifier in the prompt text, so the
// needle here is the filename with a word boundary, and a preceding `/` counts as a reference.
const RETIRED_PATTERN = /(^|[^\w.-])pr-body\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-129 no tracked file outside docs/decisions/, .claude/workspace/research/and " +
    "docs/wiki/pr-tail-translate-prose-only.md references pr-body.py as a word, and the same " +
    "predicate flags a fixture line carrying it",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "pr-body.py");

    // This test's own file names pr-body.py in comments to describe what it checks, and the
    // #176 basis line keeps the retired name as history rather than as a live reference; the
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
        `docs/wiki/pr-tail-translate-prose-only.md references pr-body.py\n${offenders.join(", ")}`,
    );
  },
);

// Same extraction intent as record-retirement.test.ts's extractRecorderInvocation: read the
// source text and pull out what the Ship prompt actually invokes, never a copied-in literal
// (docs/wiki/workflow-const-source-text-check.md). Unlike the recorder invocation, the Ship
// prompt's `&&` chain nests two more template literals inside itself (the --base and --title
// ternaries), which put raw, unescaped backticks between the escaped pair that opens and closes
// the whole chain. The capture below tolerates those raw backticks instead of excluding them, so
// it still reaches the escaped closing backtick past the nested pairs.
function extractShipInvocation(source: string): string | null {
  const m = source.match(/\\`([^\n]*?\bpr-body\.(?:ts|py)\b[^\n]*?)\\`/);
  return m ? m[1] : null;
}

interface ShipPromptSource {
  label: string;
  path: string;
}

const SHIP_PROMPT_SOURCES: ShipPromptSource[] = [
  { label: "workflows/build.js", path: "workflows/build.js" },
  { label: ".ja/workflows/build.js", path: ".ja/workflows/build.js" },
];

test(
  "T-130 the EN and .ja build.js ship prompts each invoke pr-body.ts through node and none " +
    "still invokes python3, read from source text rather than a copied literal",
  () => {
    for (const { label, path } of SHIP_PROMPT_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const invocation = extractShipInvocation(source);
      assert.ok(invocation, `${label} ship prompt's invocation is extractable from source`);
      // One fixed line per source, carrying no offender list, so a --require-output anchor on
      // the Red gate can seal on exactly one line rather than on a set that could reorder.
      assert.ok(
        invocation !== null &&
          invocation.includes("node ") &&
          invocation.includes("pr-body.ts") &&
          !invocation.includes("python3"),
        `${label} ship prompt still invokes python3`,
      );
    }
  },
);
