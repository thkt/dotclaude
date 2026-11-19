/// <reference types="node" />
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
  "workflows/audit.js",
  "workflows/audit",
  "workflows/assert.js",
  "workflows/assert",
  "workflows/polish.js",
  "workflows/polish",
  "workflows/shake.js",
  "workflows/shake",
  "workflows/adrift.js",
  "workflows/adrift",
  "workflows/_lib/gate.ts",
  "workflows/_lib/tests/gate.test.ts",
  "workflows/_lib/tests/gate-exports.test.ts",
  "workflows/_lib/tests/gate-retirement.test.ts",
  "workflows/_lib/tests/assert-scripts-retirement.test.ts",
  "workflows/_lib/tests/snapshot-retirement.test.ts",
  "workflows/_lib/tests/record-retirement.test.ts",
  "workflows/tests/gate-flags-ssot.test.js",
  "docs/wiki",
  "agents/reviewers",
  "agents/enhancers",
  "agents/generators",
  "agents/_lib",
  "agents/critics/critic-audit.md",
  "agents/critics/critic-evidence.md",
  "skills/use-context-reviewer-readability",
  "skills/use-context-reviewer-security",
  "skills/use-context-reviewer-silence",
  "skills/use-context-reviewer-testability",
  "skills/use-context-root-cause-analysis",
  "skills/use-workflow-tdd-cycle",
  "skills/_lib/review_score.ts",
  "skills/_lib/harness_hash.ts",
  "skills/_lib/review-harness.md",
  "skills/_lib/tests/review-score.test.ts",
  "skills/_lib/tests/review-score-retirement.test.ts",
  "skills/_lib/tests/harness-hash-cli.test.ts",
  "skills/_lib/tests/harness-hash-digest.test.ts",
  "skills/_lib/tests/harness-hash-resolve.test.ts",
  "skills/_lib/tests/harness-seam.test.ts",
  "skills/_lib/tests/harness-freshness.test.ts",
  "skills/_lib/tests/fixtures/review-score-cases.json",
  "workflows/_lib/tests/severity-enum-single-source.test.ts",
  "skills/challenge",
  "skills/use-cli-ast-grep",
  "skills/use-cli-gcloud",
  "skills/use-cli-codegraph",
  "skills/scribe",
  ".github/workflows/scribe.yml",
  "hooks/pre-bash/wiki_scene.ts",
  "hooks/pre-bash/tests/wiki-scene-find.test.ts",
  "hooks/pre-bash/tests/wiki-scene-runtime.test.ts",
  "hooks/post-bash/scribe_prompt.ts",
  "hooks/post-bash/tests/scribe-prompt.test.ts",
  "hooks/_lib/scribe_gate.ts",
  "hooks/_lib/scribe_trigger.ts",
  "hooks/_lib/tests/scribe-gate.test.ts",
  "hooks/_lib/tests/scribe-trigger.test.ts",
  "hooks/_lib/tests/scribe-gate-retirement.test.ts",
];

test("no path the build-path retirement removed exists on the English side or under .ja/", () => {
  const present = REMOVED_PATHS.flatMap((path) => [path, `.ja/${path}`]).filter((path) =>
    existsSync(join(REPO_ROOT, path)),
  );
  assert.deepEqual(present, [], `removed paths still on disk: ${present.join(", ")}`);
});

const THIS_FILE = "workflows/_lib/tests/build-path-retirement.test.ts";
const ABSENCE_TESTS = [
  "skills/implement/tests/workflow-contract.test.js",
  "workflows/_lib/tests/codex-run.test.js",
];

function isScanned(path: string): boolean {
  return !(
    /^(\.ja\/)?docs\/(decisions|research)\//.test(path) ||
    path === THIS_FILE ||
    path.endsWith("-retirement.test.ts") ||
    ABSENCE_TESTS.includes(path)
  );
}

const RETIRED_COMMAND =
  /(^|[\s`"([{（［｛「『【〔〈《])\/(think|qualify|preview|slice|fix|issue|commit|checkout|pr|research|ablate|census|transcribe|audit|assert|polish|shake|adrift|challenge)(?![A-Za-z0-9/-])/m;

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
  "audit workflow",
  "workflows/audit",
  "workflows/assert",
  "workflows/polish",
  "workflows/shake",
  "workflows/adrift",
  "reviewer-",
  "critic-audit",
  "critic-evidence",
  "enhancer-",
  "generator-snapshot",
  "use-context-",
  "use-workflow-",
  "agents/_lib",
  "review-harness",
  "review_score",
  "harness_hash",
  "skills/challenge",
  "use-cli-ast-grep",
  "use-cli-gcloud",
  "use-cli-codegraph",
];

const RETIRED_PATH =
  /(workflows\/(build|code)|skills\/(think|issue|qualify|preview|slice|fix|commit|checkout|pr))(?![A-Za-z0-9_-])|(?<![A-Za-z0-9_.-])(build|code)\.js(?![A-Za-z0-9_])|pageshot/;

function namesRetiredRoute(content: string): boolean {
  return (
    RETIRED_COMMAND.test(content) ||
    RETIRED_PATH.test(content) ||
    RETIRED_NAMES.some((name) => content.includes(name))
  );
}

test("the retired-route predicate flags each removed name written in a fixture and passes the same lines once the name is replaced", () => {
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
    "Review the draft with /audit.",
    "Run `/assert` before merging.",
    "Clean it up (/polish) afterward.",
    "Find the flaky test with /shake.",
    "「/adrift」で DR との乖離を見る。",
    'PR["draft PR"] --> A["/audit · /polish"]',
    "Use the audit workflow for code review findings.",
    "Edit workflows/audit.js to add a reviewer.",
    "Read workflows/assert.js for the verdict.",
    "Run workflows/polish.js on the diff.",
    "Read workflows/shake.js for the run counts.",
    "Read workflows/adrift.js for the routing.",
    "Hand the prompt file to reviewer-prompt.",
    "critic-audit challenges each finding.",
    "critic-evidence checks the citation.",
    "enhancer-integration merges the results.",
    "generator-snapshot records the output.",
    "Preload use-context-reviewer-security for OWASP.",
    "TDD は use-workflow-tdd-cycle で進める。",
    "Read agents/_lib/finding-schema.md for the severity.",
    "Follow the blind procedure in skills/_lib/review-harness.md.",
    "Score the run with skills/_lib/review_score.ts.",
    "Write the harness_hash output into the record.",
    "Attack the proposal with /challenge first.",
    "Run `/challenge` before the DR.",
    "提案は「/challenge」で叩く。",
    "Read skills/challenge/SKILL.md for the verdict.",
    "Load use-cli-ast-grep for a structural rewrite.",
    "Load use-cli-gcloud to read the sheet.",
    "呼び出し元は use-cli-codegraph で調べる。",
    "skills/fix/SKILL.md was removed",
    "「skills/fix/」を消した",
    "// history-recording CLIs (workflows/build/record.ts, workflows/implement/record.ts).",
    '    "workflows/build",',
    "// workflows/code/tests/verify-commit.test.ts shared this read.",
    "// build.js's sibling() matches on the message.",
    "// Not a raw slice of the source: code.js escapes an apostrophe.",
    "// the same subset workflows/code.js's globToRegExp accepts",
    "// every existing caller (skills/think, skills/fix) stays unaffected",
    "Read skills/think/SKILL.md for the plan.",
    "Read skills/issue/SKILL.md for the title.",
    "Read skills/qualify/SKILL.md for the verdict.",
    "Read skills/preview/SKILL.md for the match.",
    "Read skills/slice/SKILL.md for the order.",
    "Read skills/commit/SKILL.md for the subject.",
    "Read skills/checkout/SKILL.md for the branch.",
    "See .ja/skills/pr/SKILL.md for the body.",
    "Attach the screenshot pageshot took.",
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
    "critic-design compares the plan.",
    "critic-design finds an existing helper.",
    "critic-design writes the tests.",
    "critic-design fixes the build.",
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
    "Delegate to critic-design for the shape.",
    "Measure the rule with /scoping first.",
    "Run `/scoping` on a repository without DRs.",
    "表計算は「/scoping」で読む。",
    "Read skills/scoping/SKILL.md for the arms.",
    "Read skills/scoping/SKILL.md for the criteria.",
    "Read skills/scoping/SKILL.md for the converter.",
    "Review the draft with /implement.",
    "Run `/implement` before merging.",
    "Clean it up (/implement) afterward.",
    "Find the flaky test with /implement.",
    "「/implement」で DR との乖離を見る。",
    'PR["draft PR"] --> A["/implement"]',
    "Use the implement workflow for code review findings.",
    "Edit workflows/implement.js to add a reviewer.",
    "Read workflows/implement.js for the verdict.",
    "Run workflows/implement.js on the diff.",
    "Read workflows/implement.js for the run counts.",
    "Read workflows/implement.js for the routing.",
    "Hand the prompt file to critic-design.",
    "critic-design challenges each finding.",
    "critic-design checks the citation.",
    "critic-design merges the results.",
    "critic-design records the output.",
    "Preload use-cli-scout for OWASP.",
    "TDD は use-cli-scout で進める。",
    "Read agents/critics/critic-design.md for the severity.",
    "Follow the blind procedure in skills/_lib/publish.md.",
    "Score the run with skills/dr/scripts/validate-dr.ts.",
    "Write the digest output into the record.",
    "Attack the proposal with /scoping first.",
    "Run `/dr` before the DR.",
    "提案は「/scoping」で叩く。",
    "Read skills/scoping/SKILL.md for the verdict.",
    "Load use-cli-recall for a structural rewrite.",
    "呼び出し元は use-cli-recall で調べる。",
    "skills/scoping/SKILL.md was removed",
    "「skills/scoping/」を消した",
    "// history-recording CLIs (workflows/implement/record.ts, workflows/implement/record.ts).",
    '    "skills/dr/scripts",',
    "// skills/scoping/tests/find-prior-research.test.ts shared this read.",
    "// implement.js's sibling() matches on the message.",
    "// Not a raw slice of the source: implement.js escapes an apostrophe.",
    "// the same subset workflows/implement.js's globToRegExp accepts",
    "// every existing caller (skills/scoping, skills/implement) stays unaffected",
    "Read skills/scoping/SKILL.md for the plan.",
    "Read skills/scoping/SKILL.md for the title.",
    "Read skills/scoping/SKILL.md for the verdict.",
    "Read skills/implement/SKILL.md for the match.",
    "Read skills/scoping/SKILL.md for the order.",
    "Read skills/implement/SKILL.md for the subject.",
    "Read skills/implement/SKILL.md for the branch.",
    "See .ja/skills/implement/SKILL.md for the body.",
    "Attach the screenshot capture took.",
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
    "docs/fix/SKILL.md was removed",
    "the /preview-x flag",
    "「docs/fix/」を消した",
    "（PR/issue の参照）",
    "[actions/checkout](x)",
    "Save the report under docs/research/ in the target repo.",
    "[research:name.md](../research/name.md)",
    "`docs/research/` に置く。",
    "Do not transcribe each question or create a separate canonical source.",
    "the /census-x flag",
    'import assert from "node:assert/strict";',
    "assert.equal(actual, expected);",
    "Write the report under docs/audit/ in the target repo.",
    "the /polish-x flag",
    "the /challenge-x flag",
    "critic-design challenges the proposal.",
    "Run ast-grep with a pattern.",
    "codegraph init creates .codegraph/.",
    "Read skills/prompt-audit/SKILL.md for the checks.",
    "Run workflows/codex-run.ts on the host.",
    "esbuild.js bundles the entry.",
    "vscode.js and unicode.js load first.",
    "Write the build.json manifest.",
    "the skills/fixture directory",
  ]) {
    assert.equal(namesRetiredRoute(line), false, `not a retired name: ${line}`);
  }
});

test("no tracked file outside the records and the absence tests names a retired command, agent, hook, skill path or workflow", () => {
  const scanned = trackedFiles(REPO_ROOT).filter(isScanned);
  for (const path of [
    "README.md",
    ".ja/docs/COMMANDS.md",
    "docs/SPEC.md",
    "workflows/_lib/cli.ts",
    ".ja/workflows/_lib/cli.ts",
    "pyrightconfig.json",
    "workflows/_lib/tests/retirement.test.ts",
  ]) {
    assert.ok(scanned.includes(path), `the scan reaches ${path}`);
  }
  for (const path of [
    THIS_FILE,
    "docs/decisions/0128-retire-the-plan-based-build-path-for-scoping-and-implement.md",
    "workflows/_lib/tests/pr-body-retirement.test.ts",
    ...ABSENCE_TESTS,
  ]) {
    assert.ok(!scanned.includes(path), `the scan leaves out ${path}`);
  }
  const offenders = offendersAmong(
    scanned,
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    namesRetiredRoute,
  );
  assert.deepEqual(offenders, [], `files still naming a retired route: ${offenders.join(", ")}`);
});

const WIKI_SCRIBE_COMMAND = /(^|[\s`"([{（［｛「『【〔〈《])\/scribe(?![A-Za-z0-9/-])/m;
const WIKI_SCRIBE_PATH = /docs\/wiki(?![A-Za-z0-9_-])|(?:skills|\.\.)\/scribe(?![A-Za-z0-9_-])/;
const WIKI_SCRIBE_HOOK = /\b(?:wiki_scene|scribe_prompt|scribe_gate|scribe_trigger)\b(?!\.py)/;

function namesWikiOrScribe(content: string): boolean {
  return (
    WIKI_SCRIBE_COMMAND.test(content) ||
    WIKI_SCRIBE_PATH.test(content) ||
    WIKI_SCRIBE_HOOK.test(content) ||
    content.includes("find_wiki_rule")
  );
}

test("the wiki and scribe predicate flags each retired name written in a fixture and passes the same lines once the name is replaced", () => {
  const flagged = [
    "Select pages from docs/wiki/search.md first.",
    "`docs/wiki/` の README を読む。",
    "Read the wiki under docs/wiki before planning.",
    "Read skills/scribe/SKILL.md for the phases.",
    "See .ja/skills/scribe/SKILL.md for the body.",
    "Run `/scribe` after the merge.",
    "Distill the patterns with /scribe.",
    "「/scribe」で共通項を抽出する。",
    "【/scribe】で wiki へ出す。",
    "[/scribe](x) proposes pages.",
    "Score the request with find_wiki_rule.ts.",
    "hooks/pre-bash/wiki_scene.ts names the pages.",
    "post-bash/scribe_prompt.ts prompts the run.",
    "node hooks/_lib/scribe_gate.ts",
    "scribe_trigger.ts finds the merged PR.",
    "allowed-tools: Read Bash(${CLAUDE_SKILL_DIR}/../scribe/scripts/*)",
    "| command_scan.ts | body_proofread, wiki_scene, scribe_trigger, gh_filing |",
    "| PostToolUse | Bash | post-bash/scribe_prompt |",
  ];
  const replaced = [
    "Select pages from docs/decisions/search.md first.",
    "`docs/decisions/` の README を読む。",
    "Read the wiki under docs/decisions before planning.",
    "Read skills/scoping/SKILL.md for the phases.",
    "See .ja/skills/scoping/SKILL.md for the body.",
    "Run `/scoping` after the merge.",
    "Distill the patterns with /scoping.",
    "「/scoping」で共通項を抽出する。",
    "【/scoping】で wiki へ出す。",
    "[/scoping](x) proposes pages.",
    "Score the request with find-prior-research.ts.",
    "hooks/pre-bash/body_proofread.ts names the pages.",
    "post-bash/body_proofread.ts prompts the run.",
    "node hooks/_lib/command_scan.ts",
    "command_scan.ts finds the merged PR.",
    "allowed-tools: Read Bash(${CLAUDE_SKILL_DIR}/scripts/*)",
    "| command_scan.ts | body_proofread, gh_filing |",
    "| PostToolUse | Bash | post-bash/body_proofread |",
  ];
  for (const line of flagged) {
    assert.equal(namesWikiOrScribe(line), true, `flagged: ${line}`);
  }
  for (const line of replaced) {
    assert.equal(namesWikiOrScribe(line), false, `not flagged once replaced: ${line}`);
  }
  for (const line of [
    'describe("the parser", () => {});',
    "Save the report under docs/research/ in the target repo.",
    "Read the spreadsheet with /transcribe.",
    "the /scribe-x flag",
    "Subscribe to the release feed.",
    "Read docs/wikipedia.md for the history.",
    "A GitHub wiki page is fetched with --raw.",
    "DR-0116 placed hooks/_lib/scribe_gate.py outside the shebang rule.",
    "Read ../scribes/notes.md first.",
  ]) {
    assert.equal(namesWikiOrScribe(line), false, `not a retired name: ${line}`);
  }
});

test("no tracked file outside the records and this file names docs/wiki, skills/scribe, /scribe, find_wiki_rule or a removed wiki and scribe hook", () => {
  const files = trackedFiles(REPO_ROOT);
  for (const path of [
    "workflows/_lib/tests/pr-body-retirement.test.ts",
    "hooks/pre-bash/tests/pre-bash-skill-hooks-retirement.test.ts",
    ...ABSENCE_TESTS,
  ]) {
    assert.ok(files.includes(path), `the scan reaches ${path}`);
  }
  const record = "docs/decisions/0130-retire-the-wiki-and-scribe-and-keep-intent-in-code-and-rules.md";
  assert.equal(namesWikiOrScribe(readFileSync(join(REPO_ROOT, record), "utf8")), true);
  const read = (path: string) => readFileSync(join(REPO_ROOT, path), "utf8");
  assert.deepEqual(offendersAmong([record], read, namesWikiOrScribe), []);
  const offenders = offendersAmong(files, read, namesWikiOrScribe, [THIS_FILE]);
  assert.deepEqual(offenders, [], `files still naming the wiki or scribe: ${offenders.join(", ")}`);
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

type Marketplace = {
  metadata?: Record<string, unknown>;
  plugins: Record<string, unknown>[];
};

function versionPins(manifest: Marketplace): string[] {
  const pins = manifest.plugins
    .filter((plugin) => Object.hasOwn(plugin, "version"))
    .map((plugin) => `plugins.${String(plugin.name)}`);
  return manifest.metadata && Object.hasOwn(manifest.metadata, "version")
    ? ["metadata", ...pins]
    : pins;
}

test("marketplace.json pins no version on metadata or a plugin entry, so an installer receives the source commit", () => {
  const pinned = JSON.parse(`{
    "metadata": { "description": "x", "version": "4.1.0" },
    "plugins": [
      { "name": "build", "version": "4.1.0", "commands": [] },
      { "name": "other", "commands": [] }
    ]
  }`) as Marketplace;
  assert.deepEqual(versionPins(pinned), ["metadata", "plugins.build"]);
  const unpinned = JSON.parse(`{
    "metadata": { "description": "x" },
    "plugins": [{ "name": "build", "commands": [] }]
  }`) as Marketplace;
  assert.deepEqual(versionPins(unpinned), []);

  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, ".claude-plugin", "marketplace.json"), "utf8"),
  ) as Marketplace;
  assert.ok(manifest.metadata, "the manifest has metadata");
  assert.ok(manifest.plugins.length > 0, "the manifest lists at least one plugin");
  assert.deepEqual(versionPins(manifest), []);
});

function firstColumnCells(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|")[1].trim());
}

test("PLUGIN.md states the version rule as a table row on the English side and under .ja/", () => {
  for (const path of ["rules/conventions/PLUGIN.md", ".ja/rules/conventions/PLUGIN.md"]) {
    const cells = firstColumnCells(readFileSync(join(REPO_ROOT, path), "utf8"));
    assert.ok(cells.includes("`source`"), `${path} has the rule table`);
    assert.ok(cells.includes("`version`"), `${path} has a version row`);
  }
});

test("SPEC.md keeps its version row and no longer states the pinned 4.1.0 on either side", () => {
  for (const path of ["docs/SPEC.md", ".ja/docs/SPEC.md"]) {
    const text = readFileSync(join(REPO_ROOT, path), "utf8");
    assert.ok(firstColumnCells(text).includes("version"), `${path} has a version row`);
    assert.ok(!text.includes("4.1.0"), `${path} states 4.1.0`);
  }
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

const SUPERSEDED_BY_DR_0129 = [
  "0011",
  "0012",
  "0035",
  "0043",
  "0046",
  "0047",
  "0051",
  "0063",
  "0071",
  "0075",
  "0078",
  "0079",
  "0095",
  "0096",
  "0104",
  "0108",
];

test("each DR the workflow retirement replaces carries the status superseded by DR-0129", () => {
  const decisions = join(REPO_ROOT, "docs", "decisions");
  const names = readdirSync(decisions);
  for (const number of SUPERSEDED_BY_DR_0129) {
    const file = names.find((name) => name.startsWith(`${number}-`));
    assert.ok(file, `DR-${number} exists`);
    const status = readFileSync(join(decisions, file as string), "utf8").match(
      /^status: "?([^"\n]*)"?$/m,
    )?.[1];
    assert.equal(status, "superseded by DR-0129", `DR-${number} status`);
  }
});

const SUPERSEDED_BY_DR_0130 = ["0106", "0116"];

test("each DR the wiki and scribe retirement replaces carries the status superseded by DR-0130", () => {
  const decisions = join(REPO_ROOT, "docs", "decisions");
  const names = readdirSync(decisions);
  for (const number of SUPERSEDED_BY_DR_0130) {
    const file = names.find((name) => name.startsWith(`${number}-`));
    assert.ok(file, `DR-${number} exists`);
    const status = readFileSync(join(decisions, file as string), "utf8").match(
      /^status: "?([^"\n]*)"?$/m,
    )?.[1];
    assert.equal(status, "superseded by DR-0130", `DR-${number} status`);
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
    const agentCounts = [...text.matchAll(/(\d+) agents?\b/g)].map((m) => Number(m[1]));
    assert.ok(skillCounts.length > 0, `${readme} states a skill count`);
    assert.ok(agentCounts.length > 0, `${readme} states an agent count`);
    assert.deepEqual(new Set(skillCounts), new Set([skills]), `${readme} skill count`);
    assert.deepEqual(new Set(agentCounts), new Set([agents]), `${readme} agent count`);
  }
});
