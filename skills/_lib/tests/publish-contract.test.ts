/// <reference types="node" />
// /sweep, /dr, and /outcome carry what they wrote to a draft PR through one shared procedure,
// skills/_lib/publish.md (#802, DR-0128 Migration Plan step 6). Running a skill needs an LLM, so
// these tests match each SKILL.md against its counterparts instead: publish.md itself, the
// prefixes workflows/implement.js accepts, and the /outcome callers that must not publish.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// skills/_lib/tests -> skills/_lib -> skills -> repo root.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), "utf8");
const bothSides = (rel: string) => [rel, `.ja/${rel}`];

const PUBLISH_REF = "${CLAUDE_SKILL_DIR}/../_lib/publish.md";

// The branch and prefix each skill passes, from the Issue's table.
const PUBLISHERS = [
  { skill: "sweep", branch: "refactor/sweep-<", prefix: "Chore" },
  { skill: "dr", branch: "docs/dr-<", prefix: "Docs" },
  { skill: "outcome", branch: "`docs/outcome`", prefix: "Docs" },
];

const numberedSteps = (doc: string) =>
  [...doc.matchAll(/^(\d+)\. (.*)$/gm)].map((m) => ({ n: Number(m[1]), text: m[2] }));

const stepNaming = (doc: string, needle: string) => {
  const step = numberedSteps(doc).find((s) => s.text.includes(needle));
  assert.ok(step, `a step names ${needle}`);
  return step;
};

const body = (doc: string) => {
  assert.ok(doc.startsWith("---\n"), "the file opens with frontmatter");
  const end = doc.indexOf("\n---\n", 4);
  assert.ok(end > 0, "the frontmatter closes");
  return doc.slice(end + "\n---\n".length);
};

test("publish.md opens a draft PR only after check passes, and never stages everything", () => {
  for (const rel of bothSides("skills/_lib/publish.md")) {
    const doc = read(rel);
    assert.match(doc, /gh pr create --draft /, `${rel}: the PR is a draft`);
    const check = stepNaming(doc, "`check`");
    const commit = stepNaming(doc, "git commit -F");
    const push = stepNaming(doc, "git push");
    assert.ok(check.n < commit.n && check.n < push.n, `${rel}: check runs before commit and push`);
    assert.match(
      check.text,
      /push|commit/,
      `${rel}: a failing check stops before commit and push`,
    );
    const addAll = stepNaming(doc, "git add -A");
    assert.match(addAll.text, /Do not use|使わない/, `${rel}: git add -A is named only to forbid it`);
  }
});

test("publish.md looks for a same-named branch both locally and on the remote", () => {
  for (const rel of bothSides("skills/_lib/publish.md")) {
    const step = stepNaming(read(rel), "git switch -c");
    assert.match(step.text, /git branch --list /, `${rel}: the local lookup`);
    assert.match(step.text, /git ls-remote --heads /, `${rel}: the remote lookup`);
    assert.match(step.text, /`-2`/, `${rel}: the numeric suffix`);
  }
});

test("each publishing skill points at publish.md and passes its branch and an implement.js prefix", () => {
  const source = read("workflows/implement.js");
  const literal = /const TYPE_BY_PREFIX = \{([^}]*)\}/.exec(source);
  assert.ok(literal, "implement.js defines TYPE_BY_PREFIX");
  const accepted = [...literal[1].matchAll(/(\w+):/g)].map((m) => m[1]);
  assert.ok(accepted.length > 0, "TYPE_BY_PREFIX has keys");

  for (const { skill, branch, prefix } of PUBLISHERS) {
    for (const rel of bothSides(`skills/${skill}/SKILL.md`)) {
      const doc = read(rel);
      assert.ok(doc.includes(PUBLISH_REF), `${rel}: names ${PUBLISH_REF}`);
      assert.ok(
        existsSync(join(REPO_ROOT, dirname(rel), "..", "_lib", "publish.md")),
        `${rel}: the reference resolves to a file on the same side`,
      );
      const branchRow = doc.split("\n").find((line) => /^\| branch +\|/.test(line));
      assert.ok(branchRow?.includes(branch), `${rel}: the branch row passes ${branch}`);
      const subjectRow = doc.split("\n").find((line) => /^\| (subject|件名) +\|/.test(line));
      const passed = /`\[(\w+)\] /.exec(subjectRow ?? "")?.[1];
      assert.equal(passed, prefix, `${rel}: the subject row opens with [${prefix}]`);
      assert.ok(
        accepted.includes(passed.toLowerCase()),
        `${rel}: [${passed}] is a TYPE_BY_PREFIX key (${accepted.join(", ")})`,
      );
    }
  }
});

test("/dr and /outcome grant the git and gh commands publish.md runs", () => {
  for (const skill of ["dr", "outcome"]) {
    for (const rel of bothSides(`skills/${skill}/SKILL.md`)) {
      const grant = /^allowed-tools:(.*)$/m.exec(read(rel))?.[1] ?? "";
      for (const tool of ["Bash(git:*)", "Bash(gh pr:*)", "Bash(gh repo view:*)", "Bash(cat:*)"]) {
        assert.ok(` ${grant} `.includes(` ${tool} `), `${rel}: allowed-tools grants ${tool}`);
      }
    }
  }
});

test("the publishing skills keep their SKILL.md body within 100 lines", () => {
  for (const { skill } of PUBLISHERS) {
    for (const rel of bothSides(`skills/${skill}/SKILL.md`)) {
      const lines = body(read(rel)).trimEnd().split("\n").length;
      assert.ok(lines <= 100, `${rel}: the body is ${lines} lines`);
    }
  }
});

// A caller that creates a stub and then goes on with its own work would otherwise have /outcome
// switch the branch to docs/outcome and carry the caller's changes into that PR.
test("/outcome skips publishing under --no-publish, and every stub caller passes it", () => {
  for (const rel of bothSides("skills/outcome/SKILL.md")) {
    const doc = read(rel);
    assert.match(doc, /^argument-hint: "\[--no-publish\]"$/m, `${rel}: the argument hint`);
    assert.match(
      doc,
      /`\$ARGUMENTS` (carries|に) `--no-publish`.*(do not publish|公開しない)/,
      `${rel}: --no-publish skips publishing`,
    );
  }
  const callers = [
    "skills/sweep/SKILL.md",
    "rules/core/PREFLIGHT.md",
  ].flatMap(bothSides);
  for (const rel of callers) {
    const doc = read(rel);
    assert.ok(doc.includes("`/outcome --no-publish`"), `${rel}: calls /outcome --no-publish`);
    assert.doesNotMatch(
      doc,
      /(^|[\s`(])\/outcome(?! --no-publish)\b/m,
      `${rel}: no call to /outcome without --no-publish`,
    );
  }
});

// The superseding path runs the process and then changes the old DR. Running the publish stage
// inside the process would push before the old DR's status changed, and publish twice. The steps
// cite stages by name, since skills/dr/tests/script-contract.test.js forbids a Step number there.
test("/dr publishes a proposed-DR edit, and its superseding path publishes once after the old DR changes", () => {
  const wording = {
    "skills/dr/SKILL.md": {
      section: "## Updating an Existing DR",
      upTo: (first: string, last: string) => `through the process from ${first} to ${last}`,
    },
    ".ja/skills/dr/SKILL.md": {
      section: "## 既存 DR の更新",
      upTo: (first: string, last: string) => `プロセスの ${first} から ${last} までで`,
    },
  };
  for (const [rel, { section, upTo }] of Object.entries(wording)) {
    const doc = read(rel);
    const rows = [...doc.matchAll(/^\| (\d+) +\| (\S+) +\|(.*)$/gm)].map((m) => ({
      n: Number(m[1]),
      stage: m[2],
      text: m[3],
    }));
    const publish = rows.find((row) => row.text.includes("_lib/publish.md"));
    assert.ok(publish, `${rel}: the process table has a publish step`);
    const before = rows.find((row) => row.n === publish.n - 1);
    assert.ok(before, `${rel}: a step precedes the publish step`);

    const start = doc.indexOf(section);
    assert.ok(start >= 0, `${rel}: has ${section}`);
    const rest = doc.slice(start + section.length);
    const sectionBody = rest.slice(0, rest.search(/^## /m));
    // The proposed-status path edits in place and skips the numbered steps, so its own sentence
    // must reach the publish stage or the edited DR stays uncommitted.
    const proposedPath = sectionBody.split("\n").find((line) => line.includes("proposed"));
    assert.ok(
      proposedPath?.includes(publish.stage),
      `${rel}: editing a proposed DR also runs ${publish.stage}`,
    );
    const steps = numberedSteps(sectionBody);
    assert.ok(
      steps[0]?.text.includes(upTo(rows[0].stage, before.stage)),
      `${rel}: step 1 runs ${rows[0].stage} through ${before.stage}, stopping before ${publish.stage}`,
    );
    assert.ok(
      steps.at(-1)?.text.includes(publish.stage),
      `${rel}: the last step runs ${publish.stage}`,
    );
  }
});
