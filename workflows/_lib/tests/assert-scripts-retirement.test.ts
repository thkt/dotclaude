/// <reference types="node" />
// bootstrap.py and worktree.py (workflows/assert/bootstrap.py, workflows/assert/worktree.py,
// and their .ja mirrors) are retired in favor of bootstrap.ts / worktree.ts (established by the
// preceding units U-002/U-003/U-004). This file guards the retirement itself: no tracked file
// still names bootstrap.py or worktree.py as a word, and the EN / .ja assert.js Setup and
// Cleanup prompts invoke the .ts scripts through node rather than the .py scripts directly.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees and the prompts in
// one change, then confirm zero residual references across git ls-files. The walk itself is
// offendersAmong (workflows/_lib/tests/_retirement.ts), shared with record-retirement.test.ts,
// gate-retirement.test.ts and ts-harness-retirement.test.ts, so the historical-directory
// exclusions it applies (docs/decisions/ and .claude/workspace/research/, kept as historical
// record by that same procedure) live in one place rather than a copy per test file.
// docs/wiki/untracked-reference-dangling.md's mention of bootstrap.py / worktree.py is the
// research-derived basis line for its own #188/#190 §根拠 entry (a quote of a since-fixed
// dangling-reference example), not a live pointer either, so it is excluded the same way.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const HISTORICAL_FILE = "docs/wiki/untracked-reference-dangling.md";

// Word-boundary needle for either retired filename, mirroring record-retirement.test.ts's
// RETIRED_PATTERN shape: a preceding non-word/dot/hyphen character (or start of string) counts
// a following occurrence as a reference, so a directory-qualified mention (e.g. "assert/worktree.py")
// is still caught.
const RETIRED_PATTERN = /(^|[^\w.-])(bootstrap|worktree)\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-168 no tracked file outside the historical set references bootstrap.py or worktree.py " +
    "as a word, and the same predicate flags a fixture line carrying one of them",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "bootstrap.py");
    assertDetectsAndMisses(referencesRetiredPath, "worktree.py");

    // This test's own file names both retired filenames in comments to describe what it
    // checks, and the docs/wiki basis line keeps the retired names as a quoted historical
    // example rather than a live reference; the historical directories
    // (docs/decisions/, .claude/workspace/research/) are offendersAmong's own default.
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
        `${HISTORICAL_FILE} references bootstrap.py or worktree.py\n${offenders.join(", ")}`,
    );
  },
);

// Same extraction shape as workflows/_lib/tests/gate-retirement.test.ts's extractGateScript and
// record-retirement.test.ts's extractRecorderInvocation: read the source text and pull out what
// the prompt actually invokes, never a copied-in literal
// (docs/wiki/workflow-const-source-text-check.md). Unlike record.ts's invocation (quoted inside
// escaped backticks in a single `record.ts's` sentence), assert.js's Setup prompt names
// worktree.py and bootstrap.py as bare prose tokens with no surrounding backtick-quoting, so the
// anchor here is the `${SCRIPTS}/<script>.<ext>` call token itself (identical in the EN and .ja
// trees per rules/conventions/MIRROR.md -- only prose is translated, code tokens are not) plus
// whatever optional `node ` prefix and quoted argument sit beside it.
interface Invocation {
  script: "worktree" | "bootstrap";
  isCleanup: boolean;
  hasNodePrefix: boolean;
  ext: string;
}

const INVOCATION_PATTERN =
  /(node\s+)?\$\{SCRIPTS\}\/(worktree|bootstrap)\.(ts|py)((?:\s+--cleanup)?\s+"[^"]*")?/g;

function extractInvocations(source: string): Invocation[] {
  const invocations: Invocation[] = [];
  for (const m of source.matchAll(INVOCATION_PATTERN)) {
    invocations.push({
      script: m[2] as "worktree" | "bootstrap",
      isCleanup: (m[4] ?? "").includes("--cleanup"),
      hasNodePrefix: Boolean(m[1]),
      ext: m[3],
    });
  }
  return invocations;
}

interface PromptSource {
  label: string;
  path: string;
}

const PROMPT_SOURCES: PromptSource[] = [
  { label: "workflows/assert.js", path: "workflows/assert.js" },
  { label: ".ja/workflows/assert.js", path: ".ja/workflows/assert.js" },
];

test(
  "T-169 the EN and .ja assert.js setup and cleanup prompts each invoke the .ts scripts " +
    "through node and neither still invokes python3, read from source text rather than a " +
    "copied literal",
  () => {
    for (const { label, path } of PROMPT_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      // One fixed line per source, carrying no offender list, so a --require-output anchor on
      // the Red gate can seal on exactly one line rather than on a set that could reorder.
      assert.equal(source.includes("python3"), false, `${label} still invokes python3`);

      const invocations = extractInvocations(source);
      const setupWorktree = invocations.find((i) => i.script === "worktree" && !i.isCleanup);
      const setupBootstrap = invocations.find((i) => i.script === "bootstrap" && !i.isCleanup);
      const cleanupWorktree = invocations.find((i) => i.script === "worktree" && i.isCleanup);

      assert.ok(setupWorktree, `${label} Setup prompt's worktree invocation is extractable from source`);
      assert.ok(setupBootstrap, `${label} Setup prompt's bootstrap invocation is extractable from source`);
      assert.ok(cleanupWorktree, `${label} Cleanup prompt's worktree invocation is extractable from source`);

      for (const [stage, invocation] of [
        ["Setup worktree", setupWorktree],
        ["Setup bootstrap", setupBootstrap],
        ["Cleanup worktree", cleanupWorktree],
      ] as const) {
        assert.ok(
          invocation !== undefined && invocation.hasNodePrefix && invocation.ext === "ts",
          `${label} ${stage} prompt still invokes the .py script directly instead of node .../${invocation?.script ?? "?"}.ts`,
        );
      }
    }
  },
);
