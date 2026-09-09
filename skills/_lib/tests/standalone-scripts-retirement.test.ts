/// <reference types="node" />
// validate-outcome.py (skills/outcome/scripts/validate-outcome.py,
// .ja/skills/outcome/scripts/validate-outcome.py), find-prior-research.py
// (skills/research/scripts/find-prior-research.py, .ja/skills/research/scripts/find-prior-research.py)
// and list-source-files.py (skills/census/scripts/list-source-files.py,
// .ja/skills/census/scripts/list-source-files.py) are retired in favor of their .ts ports
// (established by the preceding units U-002/U-003/U-004). This file guards the retirement
// itself: no tracked file still names one of the three as a word, the EN / .ja outcome,
// research, think and census SKILL.md and the EN / .ja assert.js invoke the .ts script by
// path, and census's allowed-tools grants the script path instead of Bash(python3:*).
//
// Same shape as workflows/_lib/tests/record-retirement.test.ts, which guards its own
// retirement: offendersAmong/trackedFiles/assertDetectsAndMisses from
// workflows/_lib/tests/_retirement.ts drive a full-tree scan, and only the helper's own
// defaults (docs/decisions/, .claude/workspace/research/) plus this file itself are excluded.
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
// would not count as one of the three retired scripts being named. Mirrors
// record-retirement.test.ts's own RETIRED_PATTERN, generalized to the three filenames.
const RETIRED_PATTERN = /(^|[^\w.-])(validate-outcome|find-prior-research|list-source-files)\.py\b/;

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function namesRetiredScript(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-187 no tracked file outside docs/decisions/and .claude/workspace/research/ names " +
    "validate-outcome.py, find-prior-research.py or list-source-files.py as a word, and the " +
    "same predicate flags a fixture line carrying one",
  () => {
    assertDetectsAndMisses(namesRetiredScript, "validate-outcome.py");

    // This test's own file names all three retired scripts in comments to describe what it
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
      "no tracked file outside docs/decisions/ and .claude/workspace/research/ names " +
        `validate-outcome.py, find-prior-research.py or list-source-files.py\n${offenders.join(", ")}`,
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
    label: "skills/research/SKILL.md",
    path: "skills/research/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/find-prior-research\.(?:ts|py)/),
  },
  {
    label: ".ja/skills/research/SKILL.md",
    path: ".ja/skills/research/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/find-prior-research\.(?:ts|py)/),
  },
  {
    label: "skills/think/SKILL.md",
    path: "skills/think/SKILL.md",
    extract: (s) =>
      extractPathToken(
        s,
        /\$\{CLAUDE_SKILL_DIR\}\/\.\.\/research\/scripts\/find-prior-research\.(?:ts|py)/,
      ),
  },
  {
    label: ".ja/skills/think/SKILL.md",
    path: ".ja/skills/think/SKILL.md",
    extract: (s) =>
      extractPathToken(
        s,
        /\$\{CLAUDE_SKILL_DIR\}\/\.\.\/research\/scripts\/find-prior-research\.(?:ts|py)/,
      ),
  },
  {
    label: "skills/census/SKILL.md",
    path: "skills/census/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/list-source-files\.(?:ts|py)/),
  },
  {
    label: ".ja/skills/census/SKILL.md",
    path: ".ja/skills/census/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/list-source-files\.(?:ts|py)/),
  },
  { label: "workflows/assert.js", path: "workflows/assert.js", extract: extractBundledArg },
  {
    label: ".ja/workflows/assert.js",
    path: ".ja/workflows/assert.js",
    extract: extractBundledArg,
  },
];

test(
  "T-188 the EN and .ja outcome, research, think and census SKILL.md and the EN and .ja " +
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

const CENSUS_ALLOWED_TOOLS_SOURCES = [
  { label: "skills/census/SKILL.md", path: "skills/census/SKILL.md" },
  { label: ".ja/skills/census/SKILL.md", path: ".ja/skills/census/SKILL.md" },
];

test(
  "T-189 the EN and .ja census SKILL.md allowed-tools grant " +
    "Bash(${CLAUDE_SKILL_DIR}/scripts/*) and no longer grant Bash(python3:*)",
  () => {
    for (const { label, path } of CENSUS_ALLOWED_TOOLS_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const allowedToolsLine = source.match(/^allowed-tools:.*$/m);
      assert.ok(allowedToolsLine, `${label}: allowed-tools line is extractable from source`);
      const line = allowedToolsLine ? allowedToolsLine[0] : "";
      // One fixed message per source, carrying no line value, so a --require-output anchor on
      // the Red gate can seal on exactly one line rather than on a set that could reorder.
      assert.ok(
        line.includes("Bash(${CLAUDE_SKILL_DIR}/scripts/*)") && !line.includes("Bash(python3:*)"),
        `${label} allowed-tools still grants Bash(python3:*)`,
      );
    }
  },
);
