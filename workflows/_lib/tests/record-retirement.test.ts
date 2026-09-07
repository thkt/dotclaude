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
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const HISTORICAL_DIRS = ["docs/decisions/", ".claude/workspace/research/"];
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
    // Positive control: an absence check stays green even after the scan itself breaks (e.g.
    // RETIRED_PATTERN mistyped, the .test() call dropped) unless it is proven to still catch a
    // violation. Run the same predicate against a fixture line that names the retired file and
    // confirm it is caught, then against a copy with that one clue removed and confirm the miss
    // (docs/wiki/absence-test-positive-control-fixture.md).
    const positiveControl = "# stale doc example: run python3 record.py < payload.json";
    assert.equal(
      referencesRetiredPath(positiveControl),
      true,
      "positive control: a fixture line carrying record.py is detected",
    );
    const masked = positiveControl.replace("record.py", "REMOVED");
    assert.equal(
      referencesRetiredPath(masked),
      false,
      "positive control: the same fixture line goes undetected once the cue is removed",
    );

    const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
    const offenders: string[] = [];
    for (const path of tracked) {
      // This test's own file names record.py in comments to describe what it checks, and the
      // three exclusions above keep the retired name as history rather than as a live reference.
      if (path === SELF_PATH) continue;
      if (HISTORICAL_DIRS.some((dir) => path.startsWith(dir))) continue;
      if (path === HISTORICAL_FILE) continue;
      let content: string;
      try {
        content = readFileSync(join(REPO_ROOT, path), "utf8");
      } catch {
        continue; // not decodable as text, so it cannot contain the retired path as a string
      }
      if (referencesRetiredPath(content)) offenders.push(path);
    }
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
// Both files' prompts spell step (2) as a shell invocation inside a template literal, quoted
// with escaped backticks (\`...\`) on the line naming "(2)"; only the wording around them
// differs between the EN imperative ("run \`...\`;") and the .ja phrasing ("\`...\` を実行する。").
// The escaped pair is what is matched: the template literal's own backtick opens the line, so
// a plain backtick match would capture the prose before the invocation instead.
function extractStep2Invocation(source: string): string | null {
  const line = source.split(/\r\n|\r|\n/).find((candidate) => candidate.includes("(2)"));
  if (!line) return null;
  const m = line.match(/\\`(.+?)\\`/);
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
      const invocation = extractStep2Invocation(source);
      assert.ok(invocation, `${label} recorder prompt's step (2) is extractable from source`);
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
