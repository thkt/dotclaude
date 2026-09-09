/// <reference types="node" />
// scripts/cli.js and scripts/convert.js (skills/transcribe/scripts/ and its .ja mirror) are
// retired in favor of the .ts ports. This file guards the retirement itself: no tracked file
// still names either .js path, the EN / .ja transcribe SKILL.md invoke cli.ts through node, and
// no .test.js is left under the three directories the sweep covered.
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
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// Directory-qualified: "cli.js" and "convert.js" are ordinary filenames other skills may carry,
// so the needle is the scripts/ segment the retired pair sat under.
const RETIRED_PATTERN = /scripts\/(?:cli|convert)\.js\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-256 no tracked file outside the historical directories references scripts/cli.js or " +
    "scripts/convert.js, and the same predicate flags a fixture line carrying one",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "scripts/cli.js");
    assertDetectsAndMisses(referencesRetiredPath, "scripts/convert.js");

    // This test's own file names both paths in comments to describe what it checks; the
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
        `scripts/cli.js or scripts/convert.js\n${offenders.join(", ")}`,
    );
  },
);

// Read from source text, never a copied-in literal
// (docs/wiki/workflow-const-source-text-check.md). SKILL.md carries the invocation as a plain
// fenced line, so the anchor is the ${CLAUDE_SKILL_DIR} prefix the skill body always writes.
function extractCliInvocations(source: string): string[] {
  return [...source.matchAll(/^(node \$\{CLAUDE_SKILL_DIR\}\/scripts\/cli\.[a-z]+ .*)$/gm)].map(
    (m) => m[1],
  );
}

const SKILL_SOURCES: Array<{ label: string; path: string }> = [
  { label: "skills/transcribe/SKILL.md", path: "skills/transcribe/SKILL.md" },
  { label: ".ja/skills/transcribe/SKILL.md", path: ".ja/skills/transcribe/SKILL.md" },
];

test(
  "T-257 the EN and .ja transcribe SKILL.md invoke scripts/cli.ts through node and none still " +
    "names cli.js, read from source text",
  () => {
    for (const { label, path } of SKILL_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const invocations = extractCliInvocations(source);
      assert.ok(invocations.length > 0, `${label} names the cli under \${CLAUDE_SKILL_DIR}`);
      // One fixed line per source, carrying no offender list, so a --require-output anchor on
      // the Red gate can seal on exactly one line rather than on a set that could reorder.
      assert.ok(
        invocations.every((line) => line.includes("cli.ts") && !line.includes("cli.js")),
        `${label} still invokes cli.js`,
      );
    }
  },
);

// The three directories the sweep covered. skills/ as a whole still holds .test.js files that
// later slices own, so the check names exactly those three.
const SWEPT_PREFIXES = ["tests/", "agents/", "skills/transcribe/"];

function isSweptTestJs(path: string): boolean {
  return path.endsWith(".test.js") && SWEPT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

test(
  "T-258 git ls-files reports no .test.js under the tests, agents and skills/transcribe " +
    "directories, and the same predicate flags a fixture list carrying one",
  () => {
    // The fixture is built from literals rather than from SWEPT_PREFIXES, so a prefix mistyped
    // in the constant fails here instead of passing both sides.
    assert.deepEqual(
      [
        "tests/a.test.js",
        "agents/_lib/tests/b.test.js",
        "skills/transcribe/tests/c.test.js",
      ].filter(isSweptTestJs).length,
      3,
      "the predicate must flag a .test.js under each swept directory",
    );
    assert.equal(isSweptTestJs("skills/issue/tests/d.test.js"), false, "outside the sweep");
    assert.equal(isSweptTestJs("tests/e.test.ts"), false, "a .ts file is not a leftover");

    const leftovers = trackedFiles(REPO_ROOT).filter(isSweptTestJs);
    assert.deepEqual(
      leftovers,
      [],
      `.test.js still tracked under the swept directories\n${leftovers.join(", ")}`,
    );
  },
);
