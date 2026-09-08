/// <reference types="node" />
// snapshot.py (workflows/audit/snapshot.py, .ja/workflows/audit/snapshot.py) is retired in favor
// of snapshot.ts (established by the preceding units U-002/U-003). This file guards the
// retirement itself: no tracked file still names snapshot.py, and the EN / .ja Snapshot prompt
// in audit.js plus the EN / .ja generator-snapshot.md definition invoke snapshot.ts through node
// rather than snapshot.py through python3.
//
// Same shape as workflows/_lib/tests/record-retirement.test.ts: a mention under
// docs/decisions/ or .claude/workspace/research/ is kept as historical record (a DR / a research
// report is written once and stays a record of what was true when it was written, not a live
// pointer that retirement obliges to follow), so both are excluded here rather than counted as a
// leftover reference.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// Same word-boundary shape as record-retirement.test.ts's RETIRED_PATTERN: audit.js's
// SNAPSHOT_SCHEMA description and prompt comments name the bare "snapshot.py" with no directory
// at all, so the needle is the filename with a word boundary, and a preceding `/` counts as a
// reference.
const RETIRED_PATTERN = /(^|[^\w.-])snapshot\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-135 no tracked file outside docs/decisions/ and .claude/workspace/research/ references " +
    "snapshot.py as a word, and the same predicate flags a fixture line carrying it",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "snapshot.py");

    // This test's own file names snapshot.py in comments to describe what it checks; the
    // historical directories are offendersAmong's own default.
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
        `snapshot.py\n${offenders.join(", ")}`,
    );
  },
);

// Same extraction shape as record-retirement.test.ts's extractRecorderInvocation: read the
// source text and pull out what the Snapshot prompt actually invokes, never a copied-in literal
// (docs/wiki/workflow-const-source-text-check.md).
//
// audit.js carries the invocation inside a template literal, quoted with escaped backticks
// (\`...\`). The anchor is the escaped pair that names the snapshot file, not the prose around it.
function extractSnapshotPromptInvocation(source: string): string | null {
  const m = source.match(/\\`([^`\n]*\bsnapshot\.(?:ts|py)\b[^`\n]*)\\`/);
  return m ? m[1] : null;
}

// generator-snapshot.md carries the invocation as a code span inside the Workflow table's step 3
// row (`| 3 | ... `<invocation>` ... |`), not inside a template literal.
function extractGeneratorStep3Invocation(source: string): string | null {
  const m = source.match(/\|\s*3\s*\|[^\n]*?`([^`\n]+)`/);
  return m ? m[1] : null;
}

interface SnapshotInvocationSource {
  label: string;
  path: string;
  extract: (source: string) => string | null;
}

const SNAPSHOT_INVOCATION_SOURCES: SnapshotInvocationSource[] = [
  {
    label: "workflows/audit.js",
    path: "workflows/audit.js",
    extract: extractSnapshotPromptInvocation,
  },
  {
    label: ".ja/workflows/audit.js",
    path: ".ja/workflows/audit.js",
    extract: extractSnapshotPromptInvocation,
  },
  {
    label: "agents/generators/generator-snapshot.md",
    path: "agents/generators/generator-snapshot.md",
    extract: extractGeneratorStep3Invocation,
  },
  {
    label: ".ja/agents/generators/generator-snapshot.md",
    path: ".ja/agents/generators/generator-snapshot.md",
    extract: extractGeneratorStep3Invocation,
  },
];

test(
  "T-136 the EN and .ja audit.js snapshot prompts and generator-snapshot definitions each " +
    "invoke snapshot.ts through node and none still names python3, read from source text " +
    "rather than a copied literal",
  () => {
    for (const { label, path, extract } of SNAPSHOT_INVOCATION_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const invocation = extract(source);
      assert.ok(invocation, `${label} snapshot invocation is extractable from source`);
      // One fixed line per source, carrying no offender list, so a --require-output anchor on
      // the Red gate can seal on exactly one line rather than on a set that could reorder.
      assert.ok(
        invocation !== null &&
          invocation.startsWith("node ") &&
          invocation.includes("snapshot.ts") &&
          !invocation.includes("python3"),
        `${label} snapshot invocation still names python3`,
      );
    }
  },
);
