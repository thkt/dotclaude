// Tier 2 checks between the /implement skill and the implement workflow it launches: the skill
// launches the workflow by name, and its stop table gives a handling for every stop reason the
// workflow can return, so a reason added to the script cannot reach the user unhandled.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { probe } from "../scripts/sandbox_probe.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const skill = readFileSync(join(root, "skills", "implement", "SKILL.md"), "utf8");
const script = readFileSync(join(root, "workflows", "implement.js"), "utf8");

// A stop reason is kebab-case with at least one hyphen, which leaves out values such as "execute".
const isReason = (value) => /^[a-z][a-z-]*[a-z]$/.test(value) && value.includes("-");
// Every place implement.js names a stop reason: the first argument of stop() and shipStop(), a
// stop field of a step result, the CI_STOPS entries, and the reasons replyProblem returns.
const stopReasons = () => {
  const found = new Set();
  const add = (text) => {
    for (const [, value] of text.matchAll(/"([a-z-]+)"/g)) if (isReason(value)) found.add(value);
  };
  for (const [, value] of script.matchAll(/\b(?:stop|shipStop)\(\s*"([a-z-]+)"/g)) found.add(value);
  for (const [line] of script.matchAll(/\bstop: [^\n]*/g)) add(line.split("why:")[0]);
  const ciStops = /const CI_STOPS = \{([\s\S]*?)\n\};/.exec(script);
  if (ciStops)
    for (const [, value] of ciStops[1].matchAll(/^\s*"(ci-[a-z-]+)",$/gm)) found.add(value);
  const reply = /const replyProblem = \(reply\) => \{([\s\S]*?)\n\};/.exec(script);
  if (reply) add(reply[1]);
  return found;
};

// The stop table is the section after the "## Stop conditions" heading.
const stopTable = skill.slice(skill.indexOf("## Stop conditions"));

test("the extraction reaches the workflow's stop reasons, including the later additions", () => {
  const reasons = stopReasons();
  for (const known of ["no-issue", "human-decision-required", "invalid-capture", "ci-timed-out"]) {
    assert.ok(reasons.has(known), `the extraction misses ${known}`);
  }
  assert.ok(reasons.size >= 40, `only ${reasons.size} reasons extracted`);
});

test("the skill's stop table names every stop reason the workflow can return", () => {
  const missing = [...stopReasons()].filter((reason) => !stopTable.includes(`\`${reason}\``));
  assert.deepEqual(missing, [], "stop reasons with no handling in SKILL.md § Stop conditions");
});

test("the skill launches the implement workflow by name and maps --no-publish to the publish option", () => {
  assert.match(skill, /Workflow\(\{name: "implement", args: \{issue: "[^"]+", repo: "[^"]+"\}\}\)/);
  assert.match(skill, /`--no-publish`[^\n]*`publish: false`/);
  assert.match(script, /const publishing = input\.publish !== false;/);
});

// The skill observes the sandbox by running its probe. Inferring it from settings files stopped a
// session whose sandbox a launch flag had turned off, since no file showed the flag.
test("the skill observes the sandbox with its probe before launch, and its table routes every field the probe prints", async () => {
  const phase1 = skill.slice(skill.indexOf("## Phase 1"), skill.indexOf("## Phase 2"));
  assert.match(phase1, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/sandbox_probe\.ts/);
  assert.ok(!phase1.includes("jq -s"), "Phase 1 still merges settings files");
  assert.match(skill, /^allowed-tools: .*Bash\(\$\{CLAUDE_SKILL_DIR\}\/scripts\/\*\)/m);
  const table = skill.slice(
    skill.indexOf("## Observing the sandbox"),
    skill.indexOf("## Resuming a run that stopped"),
  );
  const fields = Object.keys(await probe());
  assert.deepEqual(fields, ["sandboxed", "local_binding", "platform"]);
  for (const field of fields) assert.ok(table.includes(`\`${field}\``), `the table omits ${field}`);
  assert.match(table, /`sandbox\.network\.allowLocalBinding: true`/);
  // The config contract requires the capture key in every file, with null when no media is needed.
  assert.match(table, /`capture` in `\.dotagents\.json` is not null/);
  const whenToUse = /whenToUse:\s*"([^"]*)"/.exec(script);
  assert.ok(whenToUse && whenToUse[1].includes("sandbox.network.allowLocalBinding"));
});

// A stop the environment caused can be resumed. The skill passes back, unchanged, the retry the stop
// returned, and the workflow reads it from the retry input.
test("the skill resumes a stopped run by passing the stop's retry_next back as the workflow's retry input", () => {
  const section = skill.slice(
    skill.indexOf("## Resuming a run that stopped"),
    skill.indexOf("## Revising an existing PR"),
  );
  assert.match(section, /`scriptPath`[^\n]*`resumeFromRunId`/);
  assert.match(section, /`retry: <retry_next>`/);
  assert.match(section, /`run_id`/);
  assert.match(script, /const retrying = input\.retry !== undefined;/);
  assert.match(script, /retry_next: null,/);
});

// Codex's implement takes any agreed Issue. Routing by a `## Plan` section came from this harness's
// build flow during the port and has no counterpart in Codex, so neither side routes by it.
test("neither the skill nor the workflow routes an Issue by its Plan section", () => {
  const whenToUse = /whenToUse:\s*"([^"]*)"/.exec(script)[1];
  assert.ok(!skill.includes("## Plan"), "SKILL.md routes by a ## Plan section");
  assert.ok(!/Plan section/i.test(whenToUse), "whenToUse routes by a Plan section");
});

// The skill's hand-run revision (per-unit TDD, reviewer agents, a twice-recurring stop) had no basis in Codex;
// a revision now goes through the workflow like a fresh run.
test("the skill revises an existing PR through the workflow's revision input, not by hand", () => {
  const section = skill.slice(
    skill.indexOf("## Revising an existing PR"),
    skill.indexOf("## Stop conditions"),
  );
  assert.match(section, /revision: \{pr: "[^"]+", request: "[^"]+"\}/);
  assert.ok(
    !/use-workflow-tdd-cycle|evaluation\.md|critic-audit/.test(skill),
    "no hand-run revision remains",
  );
  assert.match(script, /const revising = input\.revision !== undefined;/);
});

test("the skill routes both terminal statuses the workflow returns", () => {
  for (const status of ["verified_local", "published_draft"]) {
    assert.ok(script.includes(`status: "${status}"`), `the workflow no longer returns ${status}`);
    assert.ok(skill.includes(`status: ${status}`), `SKILL.md does not route ${status}`);
  }
});
