/// <reference types="node" />
// In-process tests for skills/ablate/scripts/reference_arm.ts. These call
// build_reference_fixture and reference_arm_command directly and read what they wrote to disk;
// no claude process is started.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { WIPED, WIPED_PLUS_ONE } from "../scripts/arms.ts";
import {
  BASE_COMMAND,
  build_reference_fixture,
  reference_arm_command,
} from "../scripts/reference_arm.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");

// A skill-reference element whose reviewer agent (agents/reviewers/reviewer-readability.md)
// names exactly one skill in its `skills:` frontmatter -- arms.test.ts's own
// EXAMPLES_BEARING_PATHS confirms this path classifies as skill-reference against the real
// repository's classify().
const READABILITY_ELEMENT = "skills/use-context-reviewer-readability/references/ai-antipatterns.md";
const READABILITY_SKILL_DIR = "skills/use-context-reviewer-readability";

// A skill-reference element whose reviewer agent (agents/reviewers/reviewer-testability.md)
// names two skills in its `skills:` frontmatter, so the fixture must carry both, not just the
// element's own skill.
const TESTABILITY_ELEMENT = "skills/use-context-reviewer-testability/references/pure-functions.md";
const TESTABILITY_AGENT = "agents/reviewers/reviewer-testability.md";
const TESTABILITY_OWN_SKILL_DIR = "skills/use-context-reviewer-testability";
const TESTABILITY_EXTRA_SKILL_DIR = "skills/use-workflow-tdd-cycle";

/** Every regular file under `dir` (repo-relative, forward-slash separated), skipping dotfiles
 * such as macOS's .DS_Store, which carry no prompt content and are not part of what "every
 * other file of its skill" means here. */
function listSkillFiles(absDir: string): string[] {
  const entries = readdirSync(absDir, { recursive: true }) as string[];
  return entries
    .filter((entry) => statSync(join(absDir, entry)).isFile())
    .filter((entry) => !entry.split(sep).some((part) => part.startsWith(".")))
    .map((entry) => entry.split(sep).join("/"));
}

test("T-498 The wiped fixture holds the target reference emptied and every other file of its skill unchanged", () => {
  const fixtureRoot = build_reference_fixture(WIPED, READABILITY_ELEMENT, REPO_ROOT);

  const targetInFixture = join(fixtureRoot, READABILITY_ELEMENT);
  assert.ok(
    existsSync(targetInFixture),
    `expected the wiped fixture to hold ${READABILITY_ELEMENT}`,
  );
  assert.equal(
    readFileSync(targetInFixture, "utf8"),
    "",
    "expected the target reference emptied in the wiped fixture",
  );

  const sourceSkillDir = join(REPO_ROOT, READABILITY_SKILL_DIR);
  const fixtureSkillDir = join(fixtureRoot, READABILITY_SKILL_DIR);
  const siblingFiles = listSkillFiles(sourceSkillDir).filter(
    (relPath) => `${READABILITY_SKILL_DIR}/${relPath}` !== READABILITY_ELEMENT,
  );
  assert.ok(
    siblingFiles.length > 0,
    "expected the readability skill to hold at least one other file",
  );
  for (const relPath of siblingFiles) {
    const sourcePath = join(sourceSkillDir, relPath);
    const fixturePath = join(fixtureSkillDir, relPath);
    assert.ok(
      existsSync(fixturePath),
      `expected the wiped fixture to hold ${READABILITY_SKILL_DIR}/${relPath}`,
    );
    assert.equal(
      readFileSync(fixturePath, "utf8"),
      readFileSync(sourcePath, "utf8"),
      `expected ${READABILITY_SKILL_DIR}/${relPath} unchanged in the wiped fixture`,
    );
  }
});

test("T-499 The wiped+1 fixture holds the target reference with its original content", () => {
  const fixtureRoot = build_reference_fixture(WIPED_PLUS_ONE, READABILITY_ELEMENT, REPO_ROOT);

  const targetInFixture = join(fixtureRoot, READABILITY_ELEMENT);
  assert.ok(
    existsSync(targetInFixture),
    `expected the wiped+1 fixture to hold ${READABILITY_ELEMENT}`,
  );
  assert.equal(
    readFileSync(targetInFixture, "utf8"),
    readFileSync(join(REPO_ROOT, READABILITY_ELEMENT), "utf8"),
    "expected the target reference at its original content in the wiped+1 fixture",
  );
});

test("T-500 The fixture holds the reviewer agent whose skills frontmatter names the reference's skill, and every skill that frontmatter names", () => {
  const fixtureRoot = build_reference_fixture(WIPED_PLUS_ONE, TESTABILITY_ELEMENT, REPO_ROOT);

  const agentInFixture = join(fixtureRoot, TESTABILITY_AGENT);
  assert.ok(existsSync(agentInFixture), `expected the fixture to hold ${TESTABILITY_AGENT}`);
  assert.equal(
    readFileSync(agentInFixture, "utf8"),
    readFileSync(join(REPO_ROOT, TESTABILITY_AGENT), "utf8"),
    `expected ${TESTABILITY_AGENT} unchanged in the fixture`,
  );

  // reviewer-testability.md's own `skills:` frontmatter names two skills
  // (use-context-reviewer-testability, use-workflow-tdd-cycle); both must be present, not just
  // the element's own skill.
  for (const skillDir of [TESTABILITY_OWN_SKILL_DIR, TESTABILITY_EXTRA_SKILL_DIR]) {
    const skillMdInFixture = join(fixtureRoot, skillDir, "SKILL.md");
    assert.ok(existsSync(skillMdInFixture), `expected the fixture to hold ${skillDir}/SKILL.md`);
    assert.equal(
      readFileSync(skillMdInFixture, "utf8"),
      readFileSync(join(REPO_ROOT, skillDir, "SKILL.md"), "utf8"),
      `expected ${skillDir}/SKILL.md unchanged in the fixture`,
    );
  }
});

test("T-501 The command runs claude as that agent with setting sources limited to project and stream-json output, from the fixture directory", () => {
  const result = reference_arm_command(WIPED, READABILITY_ELEMENT, REPO_ROOT);

  assert.deepEqual(
    result.argv,
    [...BASE_COMMAND, "--setting-sources", "project", "--agent", "reviewer-readability"],
    "expected the wiped reference-arm command to run claude restricted to project settings, as reviewer-readability, with stream-json output",
  );

  assert.ok(statSync(result.cwd).isDirectory(), "expected cwd to be a directory that exists");
  assert.ok(
    existsSync(join(result.cwd, READABILITY_ELEMENT)),
    "expected cwd to be the fixture directory built for this arm and element, not an unrelated directory",
  );
});
