/// <reference types="node" />
// validate-outcome.py (skills/outcome/scripts/validate-outcome.py,
// .ja/skills/outcome/scripts/validate-outcome.py), find-prior-research.py
// (skills/research/scripts/find-prior-research.py, .ja/skills/research/scripts/find-prior-research.py;
// the .ts port now lives under skills/scribe/scripts/, DR-0128) are retired in favor of their
// .ts ports (established by the preceding units). This file guards the retirement
// itself: no tracked file still names either as a word, the EN / .ja outcome and scribe
// SKILL.md and the EN / .ja assert.js invoke the .ts script by path, and no SKILL.md grants
// Bash(python3:*).
//
// Same shape as workflows/_lib/tests/record-retirement.test.ts, which guards its own
// retirement: offendersAmong/trackedFiles/assertDetectsAndMisses from
// workflows/_lib/tests/_retirement.ts drive a full-tree scan, and only the helper's own
// defaults (docs/decisions/, docs/research/) plus this file itself are excluded.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/_lib/tests -> skills/_lib -> skills -> repo root, the same climb
// harness-hash-cli.test.ts's REPO_ROOT makes from the same starting point.
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// A word boundary, not a bare substring: my-validate-outcome.py or validate-outcome.py.bak
// would not count as one of the retired scripts being named. Mirrors
// record-retirement.test.ts's own RETIRED_PATTERN, generalized to the two filenames.
const RETIRED_PATTERN = /(^|[^\w.-])(validate-outcome|find-prior-research)\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function namesRetiredScript(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-187 no tracked file outside docs/decisions/and docs/research/ names " +
    "validate-outcome.py or find-prior-research.py as a word, and the " +
    "same predicate flags a fixture line carrying one",
  () => {
    assertDetectsAndMisses(namesRetiredScript, "validate-outcome.py");

    // This test's own file names both retired scripts in comments to describe what it
    // checks; the historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      namesRetiredScript,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/ and docs/research/ names " +
        `validate-outcome.py or find-prior-research.py\n${offenders.join(", ")}`,
    );
  },
);

// Same extraction shape as workflows/_lib/tests/record-retirement.test.ts's
// extractRecorderInvocation and skills/_lib/tests/review-score-retirement.test.ts's
// extractStep5Command: read the source text and pull out the path token the invocation
// actually names, never a copied-in literal (docs/wiki/workflow-const-source-text-check.md).
// ${CLAUDE_SKILL_DIR} paths are not translated (rules/conventions/MIRROR.md), so the same
// token pattern matches the EN and .ja source of a given script kind unchanged.
function extractPathToken(source: string, tokenPattern: RegExp): string | null {
  const m = source.match(tokenPattern);
  return m ? m[0] : null;
}

function extractBundledArg(source: string): string | null {
  const m = source.match(/bundled\("(skills\/outcome\/scripts\/validate-outcome\.(?:ts|py))"\)/);
  return m ? m[1] : null;
}

interface ScriptInvocationSource {
  label: string;
  path: string;
  extract: (source: string) => string | null;
}

const SCRIPT_INVOCATION_SOURCES: ScriptInvocationSource[] = [
  {
    label: "skills/outcome/SKILL.md",
    path: "skills/outcome/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/validate-outcome\.(?:ts|py)/),
  },
  {
    label: ".ja/skills/outcome/SKILL.md",
    path: ".ja/skills/outcome/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/validate-outcome\.(?:ts|py)/),
  },
  {
    label: "skills/scribe/SKILL.md",
    path: "skills/scribe/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/find-prior-research\.(?:ts|py)/),
  },
  {
    label: ".ja/skills/scribe/SKILL.md",
    path: ".ja/skills/scribe/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/find-prior-research\.(?:ts|py)/),
  },
  { label: "workflows/assert.js", path: "workflows/assert.js", extract: extractBundledArg },
  {
    label: ".ja/workflows/assert.js",
    path: ".ja/workflows/assert.js",
    extract: extractBundledArg,
  },
];

test(
  "T-188 the EN and .ja outcome and scribe SKILL.md and the EN and .ja " +
    "assert.js each invoke the .ts script by path and none names the .py, read from source text",
  () => {
    for (const { label, path, extract } of SCRIPT_INVOCATION_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const invocation = extract(source);
      assert.ok(invocation, `${label}: script invocation path is extractable from source`);
      // One fixed message per source, carrying no path value, so a --require-output anchor on
      // the Red gate can seal on exactly one line rather than on a set that could reorder.
      assert.ok(
        invocation !== null && invocation.endsWith(".ts"),
        `${label} still invokes the .py script`,
      );
    }
  },
);

// A python3 grant on a SKILL.md's allowed-tools line is the shape every retired .py script was
// invoked through. T-407 checks every tracked SKILL.md rather than a per-skill list, so a skill
// added later cannot bring the grant back unnoticed.

function grantsPython3Bash(content: string): boolean {
  return content.includes("Bash(python3:*)");
}

test(
  "T-407 no SKILL.md frontmatter grants Bash(python3:*), and the same predicate flags a " +
    "fixture frontmatter that does",
  () => {
    assertDetectsAndMisses(grantsPython3Bash, "Bash(python3:*)");

    // Every tracked SKILL.md, not a hardcoded per-skill pair (docs/wiki/retire-rename-procedure.md):
    // this file itself is not a SKILL.md, so no self-exclusion is needed.
    const skillMdFiles = trackedFiles(REPO_ROOT).filter((path) => path.endsWith("SKILL.md"));
    const offenders = offendersAmong(
      skillMdFiles,
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      grantsPython3Bash,
    );
    assert.deepEqual(
      offenders,
      [],
      `SKILL.md files still granting Bash(python3:*): ${offenders.join(", ")}`,
    );
  },
);
