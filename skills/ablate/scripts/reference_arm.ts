/// <reference types="node" />
// Builds the wiped and wiped+1 fixture directories for one skill-reference harness element, and
// the claude invocation that runs the reviewer agent against that fixture.
//
// Mirrors skills/ablate/scripts/arms.ts's arm_command shape: reference_arm_command takes
// (arm, element) in the same order arm_command does. claude carries no flag to pass a working
// directory of its own, so the return value is an {argv, cwd} pair rather than argv alone -- the
// caller launches the child process from cwd instead of passing it on argv.
//
// This classification only ever runs two arms, wiped and wiped+1: full-harness runs unmodified
// with no restricting flag (arms.ts's own arm_command comment), so it needs no fixture built for
// it at all, and build_reference_fixture refuses any other arm name the same way arm_command's
// WIPED_PLUS_ONE branch refuses a missing element.
//
// Constant and function names stay snake_case, the same convention arms.ts and verdict.ts hold
// in this same directory.
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { _frontmatter_lines } from "../../_lib/harness_elements.ts";
import { WIPED, WIPED_PLUS_ONE } from "./arms.ts";

export interface FixtureCommand {
  argv: string[];
  cwd: string;
}

/** One agent file's resolved identity: its repo-relative path and the skill names its
 * `skills:` frontmatter lists, in the order that frontmatter lists them. */
interface ReviewerAgent {
  path: string;
  skills: string[];
}

/** The items of an agent's single-line `skills: [a, b]` frontmatter field, the shape every
 * file under agents/ holds it in (no multi-line dash list appears there, unlike a skill's own
 * `paths:` frontmatter, so this reads only that one shape rather than reusing
 * harness_elements.ts's `_read_array`, which expects JSON-quoted items and would parse none of
 * these bareword names). Empty when the field is absent or not a bracketed list. */
function agentSkillNames(lines: string[]): string[] {
  const fieldLine = lines.find((line) => line.startsWith("skills:"));
  if (fieldLine === undefined) {
    return [];
  }
  const match = fieldLine
    .slice("skills:".length)
    .trim()
    .match(/^\[(.*)\]$/);
  if (match === null) {
    return [];
  }
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** The reviewer agent under agents/reviewers/*.md whose `skills:` frontmatter names
 * `skillName`, plus every skill name that same frontmatter lists. Scoped to agents/reviewers/
 * rather than every agents/**\/*.md: a skill can also appear in a non-reviewer agent's
 * `skills:` field (agents/enhancers/enhancer-code.md also names
 * use-context-reviewer-readability), and this classification runs the reviewer agent, not
 * whichever agent happens to name the skill first. Throws when no reviewer agent names it,
 * since a skill-reference element with no reviewer agent naming its skill has nothing for
 * build_reference_fixture to run as. */
function findReviewerAgent(skillName: string, root: string): ReviewerAgent {
  for (const relPath of globSync("agents/reviewers/*.md", { cwd: root }).sort()) {
    const absPath = join(root, relPath);
    if (!statSync(absPath).isFile()) {
      continue;
    }
    const lines = _frontmatter_lines(absPath);
    if (lines === null) {
      continue;
    }
    const skills = agentSkillNames(lines);
    if (skills.includes(skillName)) {
      return { path: relPath, skills };
    }
  }
  throw new Error(
    `no agent under agents/ names skill ${JSON.stringify(skillName)} in its skills: frontmatter`,
  );
}

const FIXTURE_CONFIG_DIR = ".claude";

/** Where a repo-relative skill or agent file sits inside a fixture. `--setting-sources project`
 * discovers skills under `.claude/skills/` and agents under `.claude/agents/` of the cwd, so a
 * skills/<name>/... path gains the `.claude/` prefix and an agents/<group>/<name>.md path
 * lands flat at `.claude/agents/<name>.md`. exposure.ts reads the same mapping to find the
 * fixture's copy of the target reference. */
export function fixture_relpath(repoRelPath: string): string {
  if (repoRelPath.startsWith("agents/")) {
    return join(FIXTURE_CONFIG_DIR, "agents", basename(repoRelPath));
  }
  return join(FIXTURE_CONFIG_DIR, repoRelPath);
}

/** Copies one repo-relative file from root into fixtureRoot at its fixture_relpath,
 * creating the destination's parent directories first. Silently does nothing when the source
 * is absent or not a regular file, since a named skill's SKILL.md is best-effort context for
 * the fixture's project-scope discovery, not itself the element under measurement. */
function copyFileInto(root: string, relPath: string, fixtureRoot: string): void {
  const source = join(root, relPath);
  if (!existsSync(source) || !statSync(source).isFile()) {
    return;
  }
  const destination = join(fixtureRoot, fixture_relpath(relPath));
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
}

/** Copies a skills/<name> directory from root into fixtureRoot at its fixture_relpath,
 * every regular file included except dotfiles (macOS's .DS_Store and the like, which carry no
 * prompt content). */
function copySkillDir(root: string, skillDir: string, fixtureRoot: string): void {
  cpSync(join(root, skillDir), join(fixtureRoot, fixture_relpath(skillDir)), {
    recursive: true,
    filter: (source) => !basename(source).startsWith("."),
  });
}

/** The element's own skill directory (skills/<name>) and skill name, read off the element's
 * skills/<name>/references/<file>.md shape (the one shape classify() resolves to
 * skill-reference, harness_elements.ts's `_is_skill_reference`). */
function ownSkill(element: string): { dir: string; name: string } {
  const dir = dirname(dirname(element));
  return { dir, name: basename(dir) };
}

// The headless invocation this arm starts from: --print for non-interactive mode and
// --output-format stream-json for a parseable event stream rather than a single JSON blob
// (verified against https://docs.claude.com/en/docs/claude-code/cli-reference). --print with
// stream-json exits at once without --verbose ("--output-format=stream-json requires --verbose").
export const BASE_COMMAND: readonly string[] = [
  "claude",
  "--print",
  "--output-format",
  "stream-json",
  "--verbose",
];

/** Validates `arm` and resolves `element`'s own skill dir/name and its reviewer agent -- the
 * one findReviewerAgent scan (a glob over agents/reviewers/*.md plus a frontmatter read of
 * each candidate) that build_reference_fixture and reference_arm_command both need before they
 * diverge. Shared here so reference_arm_command, which also needs the agent's own path for its
 * --agent flag, does not repeat that scan a second time on top of build_reference_fixture's. */
function resolveFixtureInputs(
  arm: string,
  element: string,
  root: string,
): { ownSkillDir: string; ownSkillName: string; agent: ReviewerAgent } {
  if (arm !== WIPED && arm !== WIPED_PLUS_ONE) {
    throw new Error(
      `reference arm classification only supports ${JSON.stringify(WIPED)} and ` +
        `${JSON.stringify(WIPED_PLUS_ONE)}, got ${JSON.stringify(arm)}`,
    );
  }
  const { dir: ownSkillDir, name: ownSkillName } = ownSkill(element);
  return { ownSkillDir, ownSkillName, agent: findReviewerAgent(ownSkillName, root) };
}

/** The fixture-assembly step of build_reference_fixture, taking the already-resolved
 * ownSkillDir/ownSkillName/agent (resolveFixtureInputs) so reference_arm_command can reuse it
 * without a second agent resolution.
 *
 * wiped holds every file of the element's own skill unchanged except the target reference,
 * which is emptied. wiped+1 holds the same tree with the target reference at its original
 * content. Both arms also hold the reviewer agent whose `skills:` frontmatter names the
 * element's own skill, and every skill that frontmatter names in turn, so the fixture's
 * project-scope discovery can resolve that agent the same way it would inside the real
 * repository -- the element's own skill in full (its SKILL.md and every references/ page,
 * since the element itself lives inside that tree), and each other named skill by its
 * SKILL.md, the file project-scope discovery reads to resolve a skill's existence. */
function assembleFixture(
  arm: string,
  element: string,
  root: string,
  ownSkillDir: string,
  ownSkillName: string,
  agent: ReviewerAgent,
): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "reference-arm-"));

  copySkillDir(root, ownSkillDir, fixtureRoot);
  for (const skillName of agent.skills) {
    if (skillName === ownSkillName) {
      continue;
    }
    copyFileInto(root, join("skills", skillName, "SKILL.md"), fixtureRoot);
  }
  copyFileInto(root, agent.path, fixtureRoot);

  if (arm === WIPED) {
    writeFileSync(join(fixtureRoot, fixture_relpath(element)), "");
  }

  return fixtureRoot;
}

/** Builds the fixture directory for one arm and one skill-reference element, returning its
 * absolute path. See assembleFixture for what the fixture holds. */
export function build_reference_fixture(arm: string, element: string, root: string): string {
  const { ownSkillDir, ownSkillName, agent } = resolveFixtureInputs(arm, element, root);
  return assembleFixture(arm, element, root, ownSkillDir, ownSkillName, agent);
}

/** The claude invocation for one arm and one skill-reference element: BASE_COMMAND restricted
 * to project settings, running as the reviewer agent the fixture holds, from that fixture's own
 * directory as cwd. claude has no flag for a working directory, so this pair replaces the
 * single argv arm_command returns. */
export function reference_arm_command(arm: string, element: string, root: string): FixtureCommand {
  const { ownSkillDir, ownSkillName, agent } = resolveFixtureInputs(arm, element, root);
  const cwd = assembleFixture(arm, element, root, ownSkillDir, ownSkillName, agent);
  const argv = [
    ...BASE_COMMAND,
    "--setting-sources",
    "project",
    "--agent",
    basename(agent.path, ".md"),
  ];
  return { argv, cwd };
}
