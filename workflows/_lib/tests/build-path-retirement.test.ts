/// <reference types="node" />
// DR-0128 retires the plan-based path (/think, /issue, /qualify, /preview, /slice, the build and
// code workflows), /fix, the manual git skills (/commit, /checkout, /pr, use-workflow-pageshot),
// the agents only that path called, and the issue-body-gate hook. The path from an Issue to a PR
// becomes /scoping then /implement. /research and explorer-feature, its one caller's agent, go in a
// later change (#803) after the earlier-report search moves to /scribe and the verification rules to
// /scoping. DR-0129 then retires /ablate, /census and /transcribe with the _lib helpers only /ablate
// used (#805). This file guards the removal: the removed paths stay gone on
// both trees, and the skill, agent, rule, plugin, README and catalog prose hands no work to a
// removed name.
//
// The prose scan covers the files #799 names. Comment-only references in code and the remaining
// docs/ and docs/wiki pages are #799's follow-up Issue, so they sit outside SCANNED_FILE.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");

const REMOVED_PATHS = [
  "skills/think",
  "skills/issue",
  "skills/qualify",
  "skills/preview",
  "skills/slice",
  "skills/fix",
  "skills/commit",
  "skills/checkout",
  "skills/pr",
  "skills/use-workflow-pageshot",
  "workflows/build.js",
  "workflows/build",
  "workflows/code.js",
  "workflows/code",
  "agents/reviewers/reviewer-conformance.md",
  "agents/reviewers/reviewer-reuse.md",
  "agents/_lib/calibration/REUSE.md",
  "agents/generators/generator-test.md",
  "agents/resolvers/resolver-build.md",
  "tests/manual-lane.test.ts",
  "hooks/pre-bash/issue_body_gate.ts",
  "hooks/pre-bash/tests/issue-body-gate-template.test.ts",
  "hooks/pre-bash/tests/issue-body-gate-validator.test.ts",
  "hooks/pre-bash/tests/_issue-body-gate-fixtures.ts",
  "skills/research",
  "agents/explorers/explorer-feature.md",
  "skills/ablate",
  "skills/census",
  "skills/transcribe",
  "skills/_lib/harness_elements.ts",
  "skills/_lib/python_json.ts",
  "skills/_lib/tests/harness-elements.test.ts",
  "skills/_lib/tests/_tree-fixture.ts",
  "skills/_lib/tests/fixtures/harness-elements-cases.json",
  "workflows/_lib/tests/transcribe-retirement.test.ts",
];

test("no path the build-path retirement removed exists on the English side or under .ja/", () => {
  const present = REMOVED_PATHS.flatMap((path) => [path, `.ja/${path}`]).filter((path) =>
    existsSync(join(REPO_ROOT, path)),
  );
  assert.deepEqual(present, [], `removed paths still on disk: ${present.join(", ")}`);
});

// skills/**/*.md, agents/**/*.md, rules/**/*.md, the plugin manifest, the README and the two
// catalogs, each with its .ja/ mirror.
const SCANNED_FILE =
  /^(\.ja\/)?((skills|agents|rules)\/.+\.md|\.claude-plugin\/marketplace\.json|README\.md|docs\/(COMMANDS|SKILLS_AGENTS)\.md)$/;

// A slash command counts only after a line start, whitespace, a backtick or an opening bracket,
// and only when no letter, digit, slash or hyphen follows. The brackets include the full-width
// ones .ja/ prose uses, such as `（/think）`, `「/fix」` and `【/pr】`, and `[` for a Markdown link
// `[/pr](...)`. So `PR/issue`, `actions/checkout`, `skills/fix/`, `/preview-x`, the directory
// `docs/research/` and the link `../research/name.md` stay out, and `gh issue` / `git commit` carry
// no slash at all.
const RETIRED_COMMAND =
  /(^|[\s`([{（［｛「『【〔〈《])\/(think|qualify|preview|slice|fix|issue|commit|checkout|pr|research|ablate|census|transcribe)(?![A-Za-z0-9/-])/m;

const RETIRED_NAMES = [
  "use-workflow-pageshot",
  "build workflow",
  "reviewer-conformance",
  "reviewer-reuse",
  "generator-test",
  "resolver-build",
  "issue_body_gate",
  "skills/research",
  "explorer-feature",
  "skills/ablate",
  "skills/census",
  "skills/transcribe",
];

function namesRetiredRoute(content: string): boolean {
  return RETIRED_COMMAND.test(content) || RETIRED_NAMES.some((name) => content.includes(name));
}

test("the retired-route predicate flags each removed name written in a fixture and passes the same lines once the name is replaced", () => {
  // Literal fixtures, not built from RETIRED_COMMAND or RETIRED_NAMES, so a typo in those
  // constants cannot flow into both sides (docs/wiki/absence-test-positive-control-fixture.md).
  const flagged = [
    "Plan it with /think first.",
    "Run `/qualify` on the Issue.",
    "Match the PR with /preview.",
    "Split the plan (/slice) into Issues.",
    "Bug investigation → `/fix`",
    "File it with /issue.",
    "Then /commit the change.",
    "Cut a branch with /checkout.",
    "Open it with /pr.",
    "/pr opens the draft.",
    "use-workflow-pageshot captures the screen.",
    "hand the number to the build workflow",
    "reviewer-conformance compares the plan.",
    "reviewer-reuse finds an existing helper.",
    "generator-test writes the tests.",
    "resolver-build fixes the build.",
    "issue_body_gate.ts denies the body.",
    "「/fix」で直す。",
    "設計は（/think）で決める。",
    "[/pr](skills/pr/SKILL.md) が draft を開く。",
    "【/issue】で起票する。",
    "『/slice』で分割する。",
    "{/commit} で記録する。",
    "Investigate it with `/research` first.",
    "「/research」で調べる。",
    "Read skills/research/SKILL.md for the template.",
    "Delegate to explorer-feature for the shape.",
    "Measure the rule with /ablate first.",
    "Run `/census` on a repository without DRs.",
    "表計算は「/transcribe」で読む。",
    "Read skills/ablate/SKILL.md for the arms.",
    "Read skills/census/SKILL.md for the criteria.",
    "Read skills/transcribe/SKILL.md for the converter.",
  ];
  const replaced = [
    "Plan it with /scoping first.",
    "Run `/scoping` on the Issue.",
    "Match the PR with /implement.",
    "Split the plan (/scoping) into Issues.",
    "Bug investigation → `/scoping`",
    "File it with /scoping.",
    "Then /implement the change.",
    "Cut a branch with /implement.",
    "Open it with /implement.",
    "/implement opens the draft.",
    "agent-browser captures the screen.",
    "hand the number to /implement",
    "reviewer-design compares the plan.",
    "reviewer-duplication finds an existing helper.",
    "enhancer-code writes the tests.",
    "enhancer-code fixes the build.",
    "client_identifier_gate.ts denies the body.",
    "「/scoping」で直す。",
    "設計は（/scoping）で決める。",
    "[/implement](skills/implement/SKILL.md) が draft を開く。",
    "【/scoping】で起票する。",
    "『/scoping』で分割する。",
    "{/implement} で記録する。",
    "Investigate it with `/scoping` first.",
    "「/scoping」で調べる。",
    "Read skills/scoping/SKILL.md for the template.",
    "Delegate to enhancer-code for the shape.",
    "Measure the rule with /scoping first.",
    "Run `/scoping` on a repository without DRs.",
    "表計算は「/scoping」で読む。",
    "Read skills/scoping/SKILL.md for the arms.",
    "Read skills/scoping/SKILL.md for the criteria.",
    "Read skills/scoping/SKILL.md for the converter.",
  ];
  for (const line of flagged) {
    assert.equal(namesRetiredRoute(line), true, `flagged: ${line}`);
  }
  for (const line of replaced) {
    assert.equal(namesRetiredRoute(line), false, `not flagged once replaced: ${line}`);
  }
  for (const line of [
    "a PR/issue reference",
    "gh issue create",
    "git commit -m",
    "git checkout -b",
    "uses: actions/checkout@v4",
    "gh pr create --draft",
    "skills/fix/SKILL.md was removed",
    "the /preview-x flag",
    "「skills/fix/」を消した",
    "（PR/issue の参照）",
    "[actions/checkout](x)",
    "Save the report under docs/research/ in the target repo.",
    "[research:name.md](../research/name.md)",
    "`docs/research/` に置く。",
    "Do not transcribe each question or create a separate canonical source.",
    "the /census-x flag",
  ]) {
    assert.equal(namesRetiredRoute(line), false, `not a slash command: ${line}`);
  }
});

test("no skill, agent, rule, plugin manifest, README or catalog names a retired command, agent, hook, skill path or the build workflow", () => {
  const scanned = trackedFiles(REPO_ROOT).filter((path) => SCANNED_FILE.test(path));
  assert.ok(scanned.includes("README.md"), "the scan reaches README.md");
  assert.ok(scanned.includes(".ja/docs/COMMANDS.md"), "the scan reaches the .ja catalog");
  const offenders = offendersAmong(
    scanned,
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    namesRetiredRoute,
  );
  assert.deepEqual(offenders, [], `files still naming a retired route: ${offenders.join(", ")}`);
});

test("marketplace.json parses and every command path it lists exists", () => {
  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, ".claude-plugin", "marketplace.json"), "utf8"),
  ) as { plugins: { name: string; commands?: string[] }[] };
  const commands = manifest.plugins.flatMap((plugin) => plugin.commands ?? []);
  assert.ok(commands.length > 0, "the manifest lists at least one command");
  const missing = commands.filter((path) => !existsSync(join(REPO_ROOT, path)));
  assert.deepEqual(missing, [], `command paths with no file: ${missing.join(", ")}`);
});

const SUPERSEDED_DRS = [
  "0002",
  "0050",
  "0084",
  "0085",
  "0087",
  "0088",
  "0089",
  "0094",
  "0099",
  "0102",
  "0103",
];

test("each DR the build-path retirement replaces carries the status superseded by DR-0128", () => {
  const decisions = join(REPO_ROOT, "docs", "decisions");
  const names = readdirSync(decisions);
  for (const number of SUPERSEDED_DRS) {
    const file = names.find((name) => name.startsWith(`${number}-`));
    assert.ok(file, `DR-${number} exists`);
    const status = readFileSync(join(decisions, file as string), "utf8").match(
      /^status: "?([^"\n]*)"?$/m,
    )?.[1];
    assert.equal(status, "superseded by DR-0128", `DR-${number} status`);
  }
});

function countMatching(dir: string, keep: (name: string) => boolean): number {
  return readdirSync(join(REPO_ROOT, dir), { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && keep(entry.name),
  ).length;
}

test("the skill and agent counts README.md states match skills/*/SKILL.md and agents/*/*.md outside _lib", () => {
  const skills = countMatching("skills", (name) =>
    existsSync(join(REPO_ROOT, "skills", name, "SKILL.md")),
  );
  const agents = readdirSync(join(REPO_ROOT, "agents"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "_lib")
    .flatMap((entry) =>
      readdirSync(join(REPO_ROOT, "agents", entry.name)).filter((name) => name.endsWith(".md")),
    ).length;
  for (const readme of ["README.md", ".ja/README.md"]) {
    const text = readFileSync(join(REPO_ROOT, readme), "utf8");
    const skillCounts = [...text.matchAll(/(\d+) skills/g)].map((m) => Number(m[1]));
    const agentCounts = [...text.matchAll(/(\d+) agents/g)].map((m) => Number(m[1]));
    assert.ok(skillCounts.length > 0, `${readme} states a skill count`);
    assert.ok(agentCounts.length > 0, `${readme} states an agent count`);
    assert.deepEqual(new Set(skillCounts), new Set([skills]), `${readme} skill count`);
    assert.deepEqual(new Set(agentCounts), new Set([agents]), `${readme} agent count`);
  }
});
