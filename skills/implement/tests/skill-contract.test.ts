import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const sides = [
  { name: "ja", dir: join(root, ".ja", "skills", "implement"), declines: /自分では打たない/ },
  { name: "en", dir: join(root, "skills", "implement"), declines: /^Do not run .* yourself$/ },
].map((side) => ({ ...side, skill: readFileSync(join(side.dir, "SKILL.md"), "utf8") }));

const REVIEWS_FILTER = ".reviews[-1] | .self, .independent | {findings, verified}";
const REPLY_FILTER = ".implement.reply";
const ONTO_FILTER = ".publications[-1].commit // .base";

const launchSource = readFileSync(join(root, "skills", "implement", "scripts", "launch.ts"), "utf8");

const section = (doc: string, heading: string): string => {
  const start = doc.indexOf(`\n${heading}`);
  assert.ok(start >= 0, `the document lost ${heading}`);
  const end = doc.indexOf("\n## ", start + 1);
  return end < 0 ? doc.slice(start) : doc.slice(start, end);
};

const frontmatterEnd = (doc: string): number => {
  assert.ok(doc.startsWith("---\n"), "SKILL.md opens with frontmatter");
  return doc.indexOf("\n---\n", 4) + "\n---\n".length;
};

const occurrences = (text: string, phrase: string): number => text.split(phrase).length - 1;

const sentences = (text: string): string[] =>
  text.split(/(?<=。)|(?<=\.)\s+|\n/).map((sentence) => sentence.trim().replace(/[。.]$/, ""));

test("every launch.ts action the skill calls is one the launch.ts usage lists, and the skill calls exactly prepare, run, publish, and agree", () => {
  const usage = /const USAGE =([\s\S]*?);\n/.exec(launchSource)?.[1];
  assert.ok(usage, "launch.ts lost its USAGE");
  for (const { name, skill } of sides) {
    const actions = new Set([...skill.matchAll(/`launch\.ts ([a-z]+) --/g)].map((match) => match[1]));
    assert.deepEqual([...actions].sort(), ["agree", "prepare", "publish", "run"], `${name}: the actions SKILL.md calls`);
    for (const action of actions) assert.ok(usage.includes(`launch.ts ${action} `), `${name}: the usage does not list ${action}`);
  }
});

test("the skill points at launch.ts by its path from the skill directory, and that file exists", () => {
  for (const { name, skill } of sides) assert.ok(skill.includes("${CLAUDE_SKILL_DIR}/scripts/launch.ts"), `${name}: SKILL.md does not name the launch.ts path`);
  assert.ok(existsSync(join(root, "skills", "implement", "scripts", "launch.ts")));
});

test("every reference the skill names exists on the same side", () => {
  for (const { name, dir, skill } of sides) {
    for (const reference of ["launch-stops.md", "publish.md", "capture.md"]) {
      assert.ok(skill.includes(`\${CLAUDE_SKILL_DIR}/references/${reference}`), `${name}: SKILL.md does not name ${reference}`);
      assert.ok(existsSync(join(dir, "references", reference)), `${name}: ${reference} does not exist`);
    }
  }
});

test("the skill's allowed tools grant its scripts but not Workflow", () => {
  for (const { name, skill } of sides) {
    const allowed = /^allowed-tools: (.*)$/m.exec(skill.slice(0, frontmatterEnd(skill)))?.[1];
    assert.ok(allowed, `${name}: the frontmatter lost allowed-tools`);
    assert.ok(!allowed.includes("Workflow"), `${name}: allowed-tools still grants Workflow`);
    assert.ok(allowed.split(" ").includes("Bash(${CLAUDE_SKILL_DIR}/scripts/*)"), `${name}: allowed-tools does not grant the skill's scripts`);
  }
});

test("the skill leaves the push and the PR creation to launch.ts publish, naming each only in the sentence that declines to run it", () => {
  for (const { name, skill, declines } of sides) {
    assert.ok(section(skill, "## Phase 3").includes("launch.ts publish --worktree"), `${name}: Phase 3 does not call publish`);
    for (const command of ["gh pr create", "git push"]) {
      assert.equal(occurrences(skill, command), 1, `${name}: SKILL.md names ${command} more than once or not at all`);
      const sentence = sentences(skill).find((candidate) => candidate.includes(command));
      assert.match(sentence ?? "", declines, `${name}: the sentence naming ${command} does not decline to run it`);
    }
  }
});

test("Phase 3 of the skill handles --no-publish", () => {
  for (const { name, skill } of sides) assert.ok(section(skill, "## Phase 3").includes("--no-publish"), `${name}: Phase 3 does not handle --no-publish`);
});

test("the skill tells the session to call launch.ts with the sandbox off", () => {
  for (const { name, skill } of sides) assert.ok(skill.includes("dangerouslyDisableSandbox: true"), `${name}: SKILL.md does not turn the sandbox off`);
});

test("the publish reference comments, watches CI, and switches to ready in that order, without editing the body", () => {
  for (const { name, dir } of sides) {
    const publish = readFileSync(join(dir, "references", "publish.md"), "utf8");
    assert.ok(!publish.includes("gh pr edit"), `${name}: publish.md edits the body`);
    const positions = ["gh pr comment", "gh pr checks", "gh pr ready"].map((command) => publish.indexOf(command));
    assert.ok(positions.every((position) => position >= 0), `${name}: publish.md lost a command: ${positions}`);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions, `${name}: publish.md runs the commands out of order`);
  }
});

test("the skill body and its three references stay within 100 lines on both sides", () => {
  for (const { name, dir, skill } of sides) {
    for (const [file, text] of [
      ["SKILL.md", skill.slice(frontmatterEnd(skill))],
      ...["publish.md", "capture.md", "launch-stops.md"].map((reference) => [reference, readFileSync(join(dir, "references", reference), "utf8")]),
    ]) {
      const lines = text.trimEnd().split("\n").length;
      assert.ok(lines <= 100, `${name}: ${file} is ${lines} lines`);
    }
  }
});

test("each English file of the skill keeps every paragraph, step, and table row of its Japanese canonical on one line, so both sides have the same line count", () => {
  for (const file of ["SKILL.md", join("references", "publish.md"), join("references", "capture.md")]) {
    const [ja, en] = sides.map(({ dir }) => readFileSync(join(dir, file), "utf8").split("\n").length);
    assert.equal(en, ja, `${file}: the English side has ${en} lines and the Japanese side ${ja}`);
  }
});

test("the Japanese and English skills carry the same number of sections and the same Phase sequence", () => {
  const [ja, en] = sides.map(({ skill }) => ({
    sections: skill.split("\n").filter((line) => line.startsWith("## ")).length,
    phases: [...skill.matchAll(/^## Phase (\d+)/gm)].map((match) => match[1]),
  }));
  assert.ok(ja.phases.length > 0, "the Japanese skill has no Phase");
  assert.deepEqual(en, ja);
});

test("Phase 3 of the skill on both sides reads the reviews and the reply of the launch record with the two jq commands", () => {
  for (const { name, skill } of sides) {
    const phase3 = section(skill, "## Phase 3");
    for (const command of [`jq '${REVIEWS_FILTER}' "<launch_file>"`, `jq -r '${REPLY_FILTER}' "<launch_file>"`])
      assert.ok(phase3.includes(command), `${name}: Phase 3 does not carry ${command}`);
  }
});

test("the two jq filters of Phase 3 return the findings and verified of both reviews in the last round, and the reply string of the implement session", () => {
  const review = (label: string) => ({ findings: [{ id: `${label}-1` }], verified: label.startsWith("last") });
  const record = {
    implement: { reply: "decided to keep the old name" },
    reviews: [
      { self: { ...review("first-self"), extra: 1 }, independent: review("first-independent") },
      { self: { ...review("last-self"), extra: 1 }, independent: review("last-independent") },
    ],
  };
  const dir = mkdtempSync(join(tmpdir(), "skill-contract-jq-"));
  try {
    const file = join(dir, "launch.json");
    writeFileSync(file, JSON.stringify(record));
    const reviews = execFileSync("jq", ["-c", REVIEWS_FILTER, file], { encoding: "utf8" }).trim().split("\n").map((line) => JSON.parse(line));
    assert.deepEqual(reviews, [review("last-self"), review("last-independent")]);
    assert.equal(execFileSync("jq", ["-r", REPLY_FILTER, file], { encoding: "utf8" }), "decided to keep the old name\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Phase 3 on both sides commits the leftover changes with commit -m when HEAD is the commit the jq filter names, and with commit --amend --no-edit otherwise", () => {
  for (const { name, skill } of sides) {
    const phase3 = section(skill, "## Phase 3");
    for (const command of [
      'git -C "<worktree>" status --porcelain',
      'git -C "<worktree>" rev-parse HEAD',
      `jq -r '${ONTO_FILTER}' "<launch_file>"`,
      'git -C "<worktree>" commit -m',
      'git -C "<worktree>" commit --amend --no-edit',
    ])
      assert.ok(phase3.includes(command), `${name}: Phase 3 does not carry ${command}`);
  }
});

const ontoOf = (record: Record<string, unknown>): string => {
  const dir = mkdtempSync(join(tmpdir(), "skill-contract-onto-"));
  try {
    const file = join(dir, "launch.json");
    writeFileSync(file, JSON.stringify(record));
    return execFileSync("jq", ["-r", ONTO_FILTER, file], { encoding: "utf8" }).trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("the commit filter of Phase 3 names the base before any publication and the last published commit after one", () => {
  assert.equal(ontoOf({ base: "b1" }), "b1");
  assert.equal(ontoOf({ base: "b1", publications: [{ commit: "p1" }, { commit: "p2" }] }), "p2");
});

test("following Phase 3 after the session committed and the capture added media leaves one commit on top of the base that holds the media", () => {
  const dir = mkdtempSync(join(tmpdir(), "skill-contract-commit-"));
  const git = (...args: string[]) => execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { encoding: "utf8" }).trim();
  try {
    git("init", "-q");
    writeFileSync(join(dir, "a.txt"), "a");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD");
    writeFileSync(join(dir, "a.txt"), "changed");
    git("add", "-A");
    git("commit", "-q", "-m", "session");
    writeFileSync(join(dir, "shot.png"), "media");
    assert.notEqual(git("status", "--porcelain"), "");
    git("add", "-A");
    if (git("rev-parse", "HEAD") === ontoOf({ base })) git("commit", "-q", "-m", "title (#1)");
    else git("commit", "-q", "--amend", "--no-edit");
    assert.equal(git("rev-parse", "HEAD^"), base);
    assert.equal(git("show", "HEAD:shot.png"), "media");
    assert.equal(git("status", "--porcelain"), "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
