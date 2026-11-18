// Tier 2 checks between the /implement skill and the implement workflow it launches: the skill
// launches the workflow by name, and its stop table gives a handling for every stop reason the
// workflow can return, so a reason added to the script cannot reach the user unhandled.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

// The table moved out of the body when the body passed its line cap. The body points at it.
const stopTable = readFileSync(join(root, "skills", "implement", "references", "stops.md"), "utf8");

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

// The host runs the workflow's commands itself, so a launch costs no agent for a relay (DR-0127). The skill
// reads the run's result and its state from the last line the host prints, so the two have to name the same keys.
test("the skill launches on the host through its script, asks the probe first, and reads the keys the host prints", async () => {
  const steps = skill.slice(skill.indexOf("## Phase 2"), skill.indexOf("## Phase 3"));
  assert.match(steps, /\$\{CLAUDE_SKILL_DIR\}\/references\/host\.md/, "Phase 2 does not point at its reference");
  // The tables Phase 2 routes its outputs with live in the reference it names.
  const phase2 = steps + readFileSync(join(root, "skills", "implement", "references", "host.md"), "utf8");
  assert.match(phase2, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/host\.ts probe --repo "[^"]+" "git status --short"/);
  assert.match(phase2, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/host\.ts run implement --repo "[^"]+" --args-file "[^"]+"/);
  assert.ok(phase2.indexOf("host.ts probe") < phase2.indexOf("host.ts run"), "the probe comes before the launch");
  assert.match(phase2, /sandbox off/);

  const { main, probeChild } = await import("../../../workflows/_lib/claude-run.ts");
  const answer = async () => ({ code: 0, stdout: '{"is_error":false,"permission_denials":[]}', stderr: "", timedOut: false });
  for (const field of Object.keys(await probeChild("/abs/repo", ["git status"], answer)))
    assert.ok(phase2.includes(`\`${field}\``), `Phase 2 does not route the probe's ${field}`);

  const dir = mkdtempSync(join(tmpdir(), "implement-contract-"));
  const file = join(dir, "sample.js");
  writeFileSync(file, 'export const meta = { name: "sample", description: "returns" };\nreturn { status: "verified_local" };\n');
  const logs = [];
  await main(["sample", "--repo", "/abs/repo", "--state", join(dir, "calls.jsonl")], {
    resolvePath: () => file,
    out: () => {},
    onLog: (message) => logs.push(message),
  });
  const last = logs.at(-1);
  assert.match(last, /^claude-run: \{/);
  assert.ok(phase2.includes("`claude-run: {...}`"), "Phase 2 does not name the line it reads");
  const printed = JSON.parse(last.replace(/^claude-run: /, ""));
  for (const key of ["result", "state"]) {
    assert.ok(key in printed, `the host no longer prints ${key}`);
    assert.ok(phase2.includes(`\`${key}\``), `Phase 2 does not read ${key}`);
  }
  const runner = readFileSync(join(root, "workflows", "_lib", "claude-run.ts"), "utf8");
  for (const phrase of ["the script threw", "held by the running process"]) {
    assert.ok(runner.includes(phrase), `the host no longer says "${phrase}"`);
    assert.ok(phase2.includes(phrase), `Phase 2 and its reference do not handle "${phrase}"`);
  }
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
  assert.match(section, /`--state "[^"]+"`/);
  assert.match(section, /`retry: <retry_next>`/);
  assert.match(section, /`run_id`/);
  assert.match(script, /const retrying = input\.retry !== undefined;/);
  assert.match(script, /retry_next: null,/);
});

// A run stopped after eleven repairs because its Issue gave a verification to a host run the workflow does not
// have. /scoping names the handlings an Issue may agree on, and /implement sends back an Issue that agreed another.
test("scoping names the three handlings of a step the workflow cannot carry out, and the launch check sends back any other", () => {
  const sufficiency = readFileSync(join(root, "skills", "scoping", "references", "sufficiency.md"), "utf8");
  const heading = "### Handling a step the workflow cannot carry out";
  assert.ok(sufficiency.includes(heading), "sufficiency.md lost the section");
  const section = sufficiency.slice(sufficiency.indexOf(heading), sufficiency.indexOf("## Questions and re-evaluation"));
  const rows = section.split("\n").filter((line) => line.startsWith("| ") && !/^\| (Handling|-)/.test(line));
  assert.equal(rows.length, 3, "the handlings an Issue may agree on");
  // What the workflow runs itself, in the words its own prompt uses.
  assert.match(sufficiency, /the `check` of `\.dotagents\.json`, the capture, and CI when publishing/);
  // The implementer returns needs_human for a verification outside this list, so the list has all three.
  assert.match(
    script,
    /The host runs the configured check and capture after you return\. \$\{CI_RULE\}/,
  );
  assert.match(
    script,
    /This run publishes, so the host also confirms the configured CI checks \(\$\{config\.ciChecks\.join\(", "\)\}\) on the published head\./,
  );
  assert.ok(script.includes('"repair-no-progress"') && section.includes("`repair-no-progress`"));
  const phase1 = skill.slice(skill.indexOf("## Phase 1"), skill.indexOf("## Phase 2"));
  assert.ok(phase1.includes("§ Handling a step the workflow cannot carry out"), "Phase 1 does not name the section");
  // Phase 1 recognizes a handling by its name, so the names it lists are the rows of the table.
  for (const row of rows) {
    const name = row.split("|")[1].trim();
    assert.ok(phase1.toLowerCase().includes(name.toLowerCase()), `Phase 1 does not name the handling "${name}"`);
  }
  // An Issue left a step out of scope and added "implement confirms with another tool" to the same cell. One
  // launch sent it back and another let it through. Both sides now decide by who does the step, so the launch
  // check lists the same actors scoping forbids in the cell.
  const actors = /Someone inside the run means ([^.]+)\./.exec(section)?.[1];
  assert.ok(actors, "the section no longer says who is inside the run");
  assert.ok(phase1.includes(`assigns work to ${actors}`), `Phase 1 does not return a cell that assigns work to ${actors}`);
  assert.match(section, /or to an option you offer the human/);
});

// DR-0094 made the build path require a root cause of a bug plan. DR-0128 retires that path and sends a bug
// through /scoping (Migration Plan step 2), so one item of sufficiency.md carries the root cause on both sides.
// Each point is matched inside that item, so moving a point out of it or dropping it on one side fails.
test("scoping confirms a bug's root cause in the code before agreeing on a fix, on both sides", () => {
  const sides = [
    {
      path: ["skills", "scoping", "references", "sufficiency.md"],
      from: "## Organizing evidence and direction",
      to: "## When there is a UI requirement",
      marker: "confirm the root cause in the code before agreement",
      points: {
        trigger: /fixes existing code returning a result different from what is required/,
        form: /which line of which file returns a different result, for which input, and why/,
        place: /differs from the place of the cause, write the place of the cause/,
        unidentified: /cannot identify the root cause, do not agree on a fix/,
        scope: /investigation of the cause the scope of that Issue/,
        report: /result of the investigation under the target repo's `docs\/research\/`/,
        done: /done condition "the root cause is written as which line of which file returns a different result, for which input, and why"/,
        handover: /hand it over to the person who reviews the PR with "Hand it over to a named owner"/,
      },
    },
    {
      path: [".ja", "skills", "scoping", "references", "sufficiency.md"],
      from: "## 根拠と方針の整理",
      to: "## UI の要求がある場合",
      marker: "合意の前に根本原因をコードで確かめる",
      points: {
        trigger: /既存のコードが要求と違う結果を返すことを直す要求/,
        form: /どのファイルのどの行が、どの入力でなぜ違う結果を返すか/,
        place: /症状が出る場所と原因の場所が違うときは、原因の場所を書く/,
        unidentified: /根本原因を特定できないときは、修正を合意しない/,
        scope: /原因の調査をその Issue の範囲にする/,
        report: /調査の結果は対象 repo の `docs\/research\/` に書き/,
        done: /完了条件を「根本原因を、どのファイルのどの行が、どの入力でなぜ違う結果を返すかとして書いてある」にする/,
        handover: /「担当を決めて引き継ぐ」で、PR をレビューする人に引き継ぐ/,
      },
    },
  ];
  for (const { path, from, to, marker, points } of sides) {
    const text = readFileSync(join(root, ...path), "utf8");
    // The section ends at the next H2, which must be the UI section, so an item moved under a new heading fails.
    const start = text.indexOf(from);
    const end = text.indexOf("\n## ", start + from.length) + 1;
    assert.ok(start >= 0 && text.startsWith(to, end), `${path.join("/")} lost the section`);
    const section = text.slice(start, end);
    const item = section.split("\n").find((line) => /^\d+\. /.test(line) && line.includes(marker));
    assert.ok(item, `${path.join("/")} has no numbered item that confirms the root cause`);
    for (const [name, pattern] of Object.entries(points))
      assert.match(item, pattern, `${path.join("/")} lost the ${name} point of the root-cause item`);
  }
});

// DR-0128 retires /research after moving two of its parts: the search of earlier reports (now under
// skills/scribe/scripts/) and the verification rules (now skills/scoping/references/verification.md).
// A path left pointing at the removed skill, or a section dropped in the move, leaves /scoping without them.
test("scoping's Phase 2 points at the earlier-report search and the verification rules, and both files exist, on both sides", () => {
  const sections = {
    skills: ["## Cross-method verification", "## Primary-source verification", "## Reading a zero-result", "## Same-origin sweep"],
    ".ja": ["## Cross-method 検証", "## 一次ソース検証", "## 0 件の解釈", "## Same-origin sweep"],
  };
  for (const [side, prefix] of [["skills", []], [".ja", [".ja"]]]) {
    const skillDir = join(root, ...prefix, "skills", "scoping");
    const doc = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    const phase2 = /^## Phase 2[^\n]*\n([\s\S]*?)(?=^## )/m.exec(doc)?.[1];
    assert.ok(phase2, `${side}: scoping lost Phase 2`);
    for (const ref of ["/../scribe/scripts/find-prior-research.ts", "/references/verification.md"]) {
      assert.ok(phase2.includes(`\${CLAUDE_SKILL_DIR}${ref}`), `${side}: Phase 2 does not name ${ref}`);
      assert.ok(existsSync(join(skillDir, ref)), `${side}: ${ref} resolves to no file`);
    }
    const verification = readFileSync(join(skillDir, "references", "verification.md"), "utf8");
    for (const heading of sections[side])
      assert.match(verification, new RegExp(`^${heading}$`, "m"), `${side}: verification.md lost "${heading}"`);
  }
});

// The workflow stops as issue-untyped on a title whose prefix is not a key of TYPE_BY_PREFIX, so a prefix
// scoping lists without a key, or a key scoping never writes, sends an agreed Issue back on every launch.
test("the type prefixes scoping puts on a title are the keys the workflow maps to a branch type, on both sides", () => {
  const keysIn = (path) => {
    const body = /const TYPE_BY_PREFIX = \{([^}]*)\};/.exec(readFileSync(join(root, ...path), "utf8"))?.[1];
    assert.ok(body, `${path.join("/")} lost TYPE_BY_PREFIX`);
    return [...body.matchAll(/(\w+):/g)].map((m) => m[1]).sort();
  };
  const prefixesIn = (path) => {
    const text = readFileSync(join(root, ...path), "utf8");
    return [...text.matchAll(/^\| `\[(\w+)\]` +\|/gm)].map((m) => m[1].toLowerCase()).sort();
  };
  const keys = keysIn(["workflows", "implement.js"]);
  assert.ok(keys.length > 0, "no key extracted from TYPE_BY_PREFIX");
  assert.deepEqual(keysIn([".ja", "workflows", "implement.js"]), keys, ".ja/workflows/implement.js");
  for (const path of [
    ["skills", "scoping", "references", "issue.md"],
    [".ja", "skills", "scoping", "references", "issue.md"],
  ])
    assert.deepEqual(prefixesIn(path), keys, path.join("/"));
});

// The contract takes the check as a shell string or as one argv array. The skill's line read it as an array
// of argv arrays, which jq rejects for both.
test("the skill's jq line reads the check in every shape the workflow's contract accepts", () => {
  assert.match(script, /isShell\(c\.check\) \|\| isArgv\(c\.check\)/);
  const phase2 = skill.slice(skill.indexOf("## Phase 2"), skill.indexOf("## Launching through agents"));
  const filter = /`jq -c '([^']+)' "<absolute path>\/\.dotagents\.json"`/.exec(phase2)?.[1];
  assert.ok(filter, "Phase 2 lost its jq line");
  for (const check of [["bun", "run", "check"], "bun run check", "FOO=1 bun run check", "cd trial && bun test"]) {
    const out = execFileSync("jq", ["-c", filter], { input: JSON.stringify({ check }), encoding: "utf8" });
    assert.deepEqual(JSON.parse(out), check, `check given as ${JSON.stringify(check)}`);
  }
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
