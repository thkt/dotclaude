// Tier 2 checks between the /implement skill and the implement workflow it launches: the skill
// launches the workflow by name, and its stop table gives a handling for every stop reason the
// workflow can return, so a reason added to the script cannot reach the user unhandled.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

// With the sandbox on and local binding denied, a check that opens a local server socket fails on
// every round, and the uncapped repair loop never ends. Both the skill's pre-launch check and the
// workflow's own whenToUse carry the requirement.
test("the skill refuses to launch under a sandbox without allowLocalBinding, and the workflow states the requirement", () => {
  const phase1 = skill.slice(skill.indexOf("## Phase 1"), skill.indexOf("## Phase 2"));
  assert.match(phase1, /`sandbox\.network\.allowLocalBinding: true`/);
  assert.match(phase1, /reduce \.\[\] as \$s \(\{\}; \. \* \$s\)/);
  const whenToUse = /whenToUse:\s*"([^"]*)"/.exec(script);
  assert.ok(whenToUse && whenToUse[1].includes("sandbox.network.allowLocalBinding"));
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
