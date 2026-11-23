/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../tests/_retirement.ts";

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

const MOVED_HELPERS: [from: string, to: string][] = [
  ["workflows/_lib/entry-point.ts", "skills/_lib/entry-point.ts"],
  [".ja/workflows/_lib/entry-point.ts", ".ja/skills/_lib/entry-point.ts"],
  ["workflows/_lib/cli.ts", "skills/_lib/cli.ts"],
  [".ja/workflows/_lib/cli.ts", ".ja/skills/_lib/cli.ts"],
  ["workflows/_lib/tests/_cli-fixture.ts", "skills/_lib/tests/_cli-fixture.ts"],
  ["workflows/_lib/tests/_git-repo.ts", "skills/_lib/tests/_git-repo.ts"],
  ["workflows/_lib/tests/cli.test.ts", "skills/_lib/tests/cli.test.ts"],
  ["workflows/_lib/tests/cli-fixture.test.ts", "skills/_lib/tests/cli-fixture.test.ts"],
  ["workflows/_lib/tests/git-repo.test.ts", "skills/_lib/tests/git-repo.test.ts"],
];

test("the 9 skill helpers exist under skills/_lib/ and .ja/skills/_lib/ and none remains under workflows/_lib/ or .ja/workflows/_lib/", () => {
  assert.equal(MOVED_HELPERS.length, 9);
  const leftBehind = MOVED_HELPERS.map(([from]) => from).filter((path) => existsSync(join(REPO_ROOT, path)));
  assert.deepEqual(leftBehind, [], `helpers still under workflows/: ${leftBehind.join(", ")}`);
  const missing = MOVED_HELPERS.map(([, to]) => to).filter((path) => !existsSync(join(REPO_ROOT, path)));
  assert.deepEqual(missing, [], `helpers missing from skills/_lib/: ${missing.join(", ")}`);
});

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
