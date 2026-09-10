/// <reference types="node" />
// U-005: ablate's SKILL.md (EN and .ja) still invoke skills/_lib/harness_elements.py and
// skills/ablate/scripts/report.py through inline python3, and allowed-tools grants
// Bash(python3:*) for it. This guards the port to the .ts siblings the preceding units
// (U-002/U-003 for report.ts, plus the standing harness_elements.ts) already established:
// Phase 1 and Phase 3 name a .ts script by path instead, and allowed-tools grants the path
// that covers it instead of the bare python3 command.
//
// Same shape as skills/dr/tests/dr-scripts-retirement.test.ts's T-213, with one deliberate
// deviation the U-005 contract calls for: T-213 hardcodes the expected grant string
// (ALLOWED_TOOLS_SCRIPTS_GRANT) because every dr script sits under ${CLAUDE_SKILL_DIR}/scripts.
// harness_elements.ts sits in skills/_lib instead, a sibling directory ${CLAUDE_SKILL_DIR}
// does not reach, so a single hardcoded literal cannot state the right grant in advance.
// T-480 below reads the actual allowed-tools line out of the frontmatter and checks that some
// grant on it covers each invoked path, rather than restating what the grant should say.
//
// T-481 reuses offendersAmong/trackedFiles/assertDetectsAndMisses from
// workflows/_lib/tests/_retirement.ts, the same helper skills/_lib/tests/review-score-retirement.test.ts's
// T-189 and dr-scripts-retirement.test.ts's T-213 draw on, scoped to just this skill's two
// SKILL.md files rather than a full-tree scan -- the scenario names "this skill" alone.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/ablate/tests -> skills/ablate -> skills -> repo root, the same climb
// harness-hash-cli.test.ts's REPO_ROOT makes from the same starting point.
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));
void SELF_PATH; // kept for parity with the sibling retirement tests; T-481 below scopes its
// own file list instead of scanning the full tree, so no self-exclusion is needed yet.

const SKILL_DIR = "skills/ablate";

const SKILL_MD_SOURCES = [
  { label: "skills/ablate/SKILL.md", path: "skills/ablate/SKILL.md" },
  { label: ".ja/skills/ablate/SKILL.md", path: ".ja/skills/ablate/SKILL.md" },
];

/** Substitutes ${CLAUDE_SKILL_DIR} for this skill's own repo-relative directory and collapses
 * any `..` segment, so a path written either way compares equal. */
function resolveSkillDirToken(token: string): string {
  return posix.normalize(token.replaceAll("${CLAUDE_SKILL_DIR}", SKILL_DIR));
}

/** The content of the first ```bash fence at or after `heading`, the section that heading
 * introduces in both the EN and the .ja SKILL.md (headings carry the same "## Phase N" prefix
 * on both trees, per rules/conventions/MIRROR.md -- only the words after it are translated). */
function bashBlockAfter(source: string, heading: string): string {
  const headingIndex = source.indexOf(heading);
  assert.ok(headingIndex >= 0, `heading not found in source: ${heading}`);
  const rest = source.slice(headingIndex);
  const block = rest.match(/```bash\n([\s\S]*?)```/);
  return block ? block[1] : "";
}

/** The first token in `block` that names `scriptName` immediately followed by a `.ts` or `.py`
 * extension -- a file path, not a bare module/function identifier such as Python's
 * `import harness_elements`. */
function extractScriptToken(block: string, scriptName: string): { full: string; ext: string } | null {
  const pattern = new RegExp(`[\\w$\\{\\}./-]+${scriptName}\\.(ts|py)\\b`);
  const match = block.match(pattern);
  return match ? { full: match[0], ext: match[1] } : null;
}

/** Every `Bash(...)` grant on the frontmatter's allowed-tools line that names a path (contains
 * "/") rather than a bare command (`python3:*`, `claude:*`), with its trailing `*` stripped and
 * ${CLAUDE_SKILL_DIR} resolved -- read from the source, never restated as a literal. */
function extractPathGrants(source: string): string[] {
  const allowedToolsLine = source.match(/^allowed-tools:.*$/m);
  assert.ok(allowedToolsLine, "allowed-tools line is extractable from source");
  const line = allowedToolsLine ? allowedToolsLine[0] : "";
  const grants = [...line.matchAll(/Bash\(([^)]+)\)/g)].map((m) => m[1]);
  return grants.filter((grant) => grant.includes("/")).map((grant) => resolveSkillDirToken(grant.replace(/\*+$/, "")));
}

function isCoveredByAGrant(token: string, grantPrefixes: string[]): boolean {
  const resolved = resolveSkillDirToken(token);
  return grantPrefixes.some((prefix) => resolved.startsWith(prefix));
}

test(
  "T-480 the skill body invokes the .ts scripts and grants the path that covers them, read from the frontmatter rather than restated",
  () => {
    for (const { label, path } of SKILL_MD_SOURCES) {
      const source = readFileSync(join(REPO_ROOT, path), "utf8");

      const phase1Block = bashBlockAfter(source, "## Phase 1");
      const phase3Block = bashBlockAfter(source, "## Phase 3");

      const harnessToken = extractScriptToken(phase1Block, "harness_elements");
      assert.ok(harnessToken, `${label} Phase 1 no longer names harness_elements by a file path`);
      assert.ok(
        harnessToken !== null && harnessToken.ext === "ts",
        `${label} Phase 1 still invokes harness_elements.py`,
      );

      const reportToken = extractScriptToken(phase3Block, "report");
      assert.ok(reportToken, `${label} Phase 3 no longer names report by a file path`);
      assert.ok(reportToken !== null && reportToken.ext === "ts", `${label} Phase 3 still invokes report.py`);

      const grantPrefixes = extractPathGrants(source);
      assert.ok(grantPrefixes.length > 0, `${label} allowed-tools grants no path at all`);

      for (const scriptToken of [harnessToken, reportToken]) {
        if (scriptToken === null) continue;
        assert.ok(
          isCoveredByAGrant(scriptToken.full, grantPrefixes),
          `${label} allowed-tools grants no path covering ${scriptToken.full}`,
        );
      }
    }
  },
);

function grantsPython3Bash(content: string): boolean {
  return content.includes("Bash(python3:*)");
}

test("T-481 no SKILL.md in this skill grants Bash(python3:*)", () => {
  assertDetectsAndMisses(grantsPython3Bash, "Bash(python3:*)");

  const skillMdFiles = trackedFiles(REPO_ROOT).filter((file) =>
    SKILL_MD_SOURCES.some((source) => source.path === file),
  );
  const offenders = offendersAmong(skillMdFiles, (path) => readFileSync(join(REPO_ROOT, path), "utf8"), grantsPython3Bash);
  assert.deepEqual(
    offenders,
    [],
    `SKILL.md files in skills/ablate still granting Bash(python3:*): ${offenders.join(", ")}`,
  );
});
