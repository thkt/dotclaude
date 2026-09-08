/// <reference types="node" />
// revalidate.py, verify-tests.py, diff-files.py and verify-pr.py (workflows/build/*.py, their
// .ja mirrors, and their workflows/build/tests/*_test.py fixtures-replay tests) are retired in
// favor of the .ts rewrites established by the preceding units U-005/U-006/U-007/U-008. This
// file guards the retirement itself, in the same shape as record-retirement.test.ts: no tracked
// file still names one of the four scripts, and the EN / .ja build.js relay prompts
// (relayVerifier, relayScript) invoke the bundled script through node rather than python3.
//
// Full-tree scan per docs/wiki/retire-rename-procedure.md: update both trees in one change, then
// confirm zero residual references across git ls-files. A mention under docs/decisions/ or
// .claude/workspace/research/ is kept as historical record, so both are excluded here rather
// than counted as a leftover reference. docs/wiki/deterministic-script-judgment.md's mention of
// verify-tests.py is the cited basis line for issue #623 (a quote of the pre-retirement
// verifier split the issue reported), not a live pointer either, so it is excluded the same way.
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

// The four retired scripts named as bare filenames (no directory: build.js calls
// bundled("workflows/build/revalidate.py") but the RECORD_SCHEMA-style description strings and
// prompt comments name the bare filename with no directory at all, the same asymmetry
// record-retirement.test.ts's own RETIRED_PATTERN comment describes). One regex
// covers all four, each guarded the same way: a preceding word/dot/hyphen character rules out a
// match inside a longer name, and \b after ".py" rules out a match against a longer extension.
const RETIRED_NAMES = ["revalidate.py", "verify-tests.py", "diff-files.py", "verify-pr.py"];
const RETIRED_PATTERN = new RegExp(
  `(^|[^\\w.-])(?:${RETIRED_NAMES.map((name) => name.replace(/[.-]/g, "\\$&")).join("|")})\\b`,
);

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function referencesRetiredScript(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-149 no tracked file outside docs/decisions/, .claude/workspace/research/ and " +
    "the deterministic-script-judgment basis line references revalidate.py, verify-tests.py, " +
    "diff-files.py or verify-pr.py as a word, and the same predicate flags a fixture line " +
    "carrying one",
  () => {
    for (const name of RETIRED_NAMES) assertDetectsAndMisses(referencesRetiredScript, name);

    // This test's own file names the four scripts in comments to describe what it checks, and
    // the #623 basis line keeps verify-tests.py as history rather than as a live reference; the
    // historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredScript,
      [SELF_PATH, HISTORICAL_FILE],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/, .claude/workspace/research/ and the " +
        `deterministic-script-judgment basis line references a retired verifier script\n${offenders.join(", ")}`,
    );
  },
);

// Same extraction shape as record-retirement.test.ts's extractRecorderInvocation, but pulling
// the whole `const relayVerifier = …;` / `const relayScript = …;` statement rather than one
// template-literal line: both names' python3-vs-node choice sits ahead of `${bundled(script)}`,
// several template-literal lines below the `const … =` that starts the statement
// (docs/wiki/workflow-const-source-text-check.md — read from source text, never a copied-in
// literal). The Ship prompt's pr-body line passes a literal ("workflows/build/pr-body.py") to
// bundled(), not the script parameter, so it never matches `${bundled(script)}` and stays
// structurally out of this extraction.
function extractConstStatement(source: string, constName: string): string | null {
  const m = source.match(new RegExp(`const\\s+${constName}\\s*=[\\s\\S]*?\`;`));
  return m ? m[0] : null;
}

// The word immediately before `${bundled(script)}` inside `statement` ("node" or "python3" in
// this codebase), or null when the statement never interpolates bundled(script) at all.
function commandBeforeBundledScript(statement: string): string | null {
  const m = statement.match(/\b(node|python3)\s+\$\{bundled\(script\)\}/);
  return m ? m[1] : null;
}

interface BuildJsSource {
  label: string;
  path: string;
}

const BUILD_JS_SOURCES: BuildJsSource[] = [
  { label: "workflows/build.js", path: "workflows/build.js" },
  { label: ".ja/workflows/build.js", path: ".ja/workflows/build.js" },
];

test(
  "T-150 the bundled(script) interpolation inside relayVerifier and relayScript in the EN and " +
    ".ja build.js is preceded by node and never by python3, read from the whole statements in " +
    "source text",
  () => {
    for (const { label, path } of BUILD_JS_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      for (const constName of ["relayVerifier", "relayScript"]) {
        const statement = extractConstStatement(source, constName);
        assert.ok(statement, `${label} const ${constName} statement is extractable from source`);
        const command = statement === null ? null : commandBeforeBundledScript(statement);
        assert.equal(
          command,
          "node",
          `${label} const ${constName}'s \${bundled(script)} is preceded by ${command}, not node`,
        );
      }
    }
  },
);
