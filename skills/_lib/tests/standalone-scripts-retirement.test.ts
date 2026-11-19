/// <reference types="node" />
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
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_PATTERN = /(^|[^\w.-])(validate-outcome|find-prior-research)\.py\b/;

function namesRetiredScript(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-187 no tracked file outside docs/decisions/and docs/research/ names " +
    "validate-outcome.py or find-prior-research.py as a word, and the " +
    "same predicate flags a fixture line carrying one",
  () => {
    assertDetectsAndMisses(namesRetiredScript, "validate-outcome.py");

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

function extractPathToken(source: string, tokenPattern: RegExp): string | null {
  const m = source.match(tokenPattern);
  return m ? m[0] : null;
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
    label: "skills/scoping/SKILL.md",
    path: "skills/scoping/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/find-prior-research\.(?:ts|py)/),
  },
  {
    label: ".ja/skills/scoping/SKILL.md",
    path: ".ja/skills/scoping/SKILL.md",
    extract: (s) =>
      extractPathToken(s, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/find-prior-research\.(?:ts|py)/),
  },
];

test(
  "T-188 the EN and .ja outcome and scoping SKILL.md each invoke the .ts script by path " +
    "and none names the .py, read from source text",
  () => {
    for (const { label, path, extract } of SCRIPT_INVOCATION_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");
      const invocation = extract(source);
      assert.ok(invocation, `${label}: script invocation path is extractable from source`);
      assert.ok(
        invocation !== null && invocation.endsWith(".ts"),
        `${label} still invokes the .py script`,
      );
    }
  },
);

function grantsPython3Bash(content: string): boolean {
  return content.includes("Bash(python3:*)");
}

test(
  "T-407 no SKILL.md frontmatter grants Bash(python3:*), and the same predicate flags a " +
    "fixture frontmatter that does",
  () => {
    assertDetectsAndMisses(grantsPython3Bash, "Bash(python3:*)");

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
