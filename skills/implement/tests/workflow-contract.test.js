import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const skill = readFileSync(join(root, "skills", "implement", "SKILL.md"), "utf8");

test("scoping names the three handlings of a step launch.ts cannot carry out, and the launch check sends back any other", () => {
  const sufficiency = readFileSync(join(root, "skills", "scoping", "references", "sufficiency.md"), "utf8");
  const heading = "### Handling a step `launch.ts` cannot carry out";
  assert.ok(sufficiency.includes(heading), "sufficiency.md lost the section");
  const section = sufficiency.slice(sufficiency.indexOf(heading), sufficiency.indexOf("## Questions and re-evaluation"));
  const rows = section.split("\n").filter((line) => line.startsWith("| ") && !/^\| (Handling|-)/.test(line));
  assert.equal(rows.length, 3, "the handlings an Issue may agree on");
  assert.match(sufficiency, /the `check` of `\.dotagents\.json`, the capture, and CI when publishing/);
  const phase1 = skill.slice(skill.indexOf("## Phase 1"), skill.indexOf("## Phase 2"));
  assert.ok(phase1.includes("§ Handling a step `launch.ts` cannot carry out"), "Phase 1 does not name the section");
  for (const row of rows) {
    const name = row.split("|")[1].trim();
    assert.ok(phase1.toLowerCase().includes(name.toLowerCase()), `Phase 1 does not name the handling "${name}"`);
  }
  const actors = /Someone inside the run means (.+?)\. [A-Z]/.exec(section)?.[1];
  assert.ok(actors, "the section no longer says who is inside the run");
  assert.ok(phase1.includes(`assigns work to ${actors}`), `Phase 1 does not return a cell that assigns work to ${actors}`);
  assert.match(section, /or to an option you offer the human/);
});

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
        report: /Write into that Issue's scope that the result of the investigation is written under the target repo's `docs\/research\/`/,
        done: /`check` does not confirm whether the result states the root cause [^.]*, so do not put it in the done conditions/,
        handover: /Write it as a handover to the person who reviews the PR with "Hand it over to a named owner"/,
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
        report: /調査の結果を対象 repo の `docs\/research\/` に書くことを、その Issue の範囲に書く/,
        done: /結果が根本原因を[^。]*として述べているかは、`check` が確かめないので完了条件に入れない/,
        handover: /「担当を決めて引き継ぐ」で、PR をレビューする人への引き継ぎとして書く/,
      },
    },
  ];
  for (const { path, from, to, marker, points } of sides) {
    const text = readFileSync(join(root, ...path), "utf8");
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

test("scoping's Phase 2 points at the earlier-report search and the verification rules, and both files exist, on both sides", () => {
  const sweepTrigger = {
    skills: /fixes existing code returning a result different from what is required, once you confirm the root cause/,
    ".ja": /既存のコードが要求と違う結果を返すことを直す要求で根本原因を確かめたとき/,
  };
  const sections = {
    skills: ["## Cross-method verification", "## Primary-source verification", "## Reading a zero-result", "## Same-origin sweep"],
    ".ja": ["## Cross-method 検証", "## 一次ソース検証", "## 0 件の解釈", "## Same-origin sweep"],
  };
  for (const [side, prefix] of [["skills", []], [".ja", [".ja"]]]) {
    const skillDir = join(root, ...prefix, "skills", "scoping");
    const doc = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    const phase2 = /^## Phase 2[^\n]*\n([\s\S]*?)(?=^## )/m.exec(doc)?.[1];
    assert.ok(phase2, `${side}: scoping lost Phase 2`);
    for (const ref of ["/scripts/find-prior-research.ts", "/references/verification.md"]) {
      assert.ok(phase2.includes(`\${CLAUDE_SKILL_DIR}${ref}`), `${side}: Phase 2 does not name ${ref}`);
      assert.ok(existsSync(join(skillDir, ref)), `${side}: ${ref} resolves to no file`);
    }
    const sweepStep = phase2.split("\n").find((line) => /^\d+\. /.test(line) && line.includes("/references/verification.md` § Same-origin sweep"));
    assert.ok(sweepStep, `${side}: no Phase 2 step sends work to § Same-origin sweep`);
    assert.match(sweepStep, sweepTrigger[side], `${side}: the Same-origin sweep step lost its root-cause trigger`);
    const verification = readFileSync(join(skillDir, "references", "verification.md"), "utf8");
    for (const heading of sections[side])
      assert.match(verification, new RegExp(`^${heading}$`, "m"), `${side}: verification.md lost "${heading}"`);
  }
});

test("scoping keeps its SKILL.md body and sufficiency.md within 100 lines, on both sides", () => {
  const body = (doc) => {
    assert.ok(doc.startsWith("---\n"), "SKILL.md opens with frontmatter");
    return doc.slice(doc.indexOf("\n---\n", 4) + "\n---\n".length);
  };
  for (const prefix of [[], [".ja"]]) {
    const skillDir = join(root, ...prefix, "skills", "scoping");
    for (const [rel, text] of [
      ["SKILL.md", body(readFileSync(join(skillDir, "SKILL.md"), "utf8"))],
      ["references/sufficiency.md", readFileSync(join(skillDir, "references", "sufficiency.md"), "utf8")],
    ]) {
      const lines = text.trimEnd().split("\n").length;
      assert.ok(lines <= 100, `${[...prefix, "skills/scoping", rel].join("/")} is ${lines} lines`);
    }
  }
});

test("the type prefixes scoping puts on a title are the keys launch.ts maps to a branch type, on both sides", () => {
  const keysIn = (path) => {
    const body = /const TYPE_BY_PREFIX(?:: [^=]+)? = \{([^}]*)\};/.exec(readFileSync(join(root, ...path), "utf8"))?.[1];
    assert.ok(body, `${path.join("/")} lost TYPE_BY_PREFIX`);
    return [...body.matchAll(/(\w+):/g)].map((m) => m[1]).sort();
  };
  const prefixesIn = (path) => {
    const text = readFileSync(join(root, ...path), "utf8");
    return [...text.matchAll(/^\| `\[(\w+)\]` +\|/gm)].map((m) => m[1].toLowerCase()).sort();
  };
  const keys = keysIn(["skills", "implement", "scripts", "launch.ts"]);
  assert.ok(keys.length > 0, "no key extracted from TYPE_BY_PREFIX");
  assert.deepEqual(keysIn([".ja", "skills", "implement", "scripts", "launch.ts"]), keys, ".ja/skills/implement/scripts/launch.ts");
  for (const path of [
    ["skills", "scoping", "references", "issue.md"],
    [".ja", "skills", "scoping", "references", "issue.md"],
  ])
    assert.deepEqual(prefixesIn(path), keys, path.join("/"));
});

test("the skill does not route an Issue by its Plan section", () => {
  assert.ok(!skill.includes("## Plan"), "SKILL.md routes by a ## Plan section");
});

test("the six procedure documents name launch.ts and its stop reasons, not the retired workflow and host", () => {
  const retired = /\bworkflows?\b|\bhost\b|human-decision-required|repair-no-progress|needs_host/i;
  const rounds = readFileSync(join(root, "skills", "implement", "scripts", "rounds.ts"), "utf8");
  for (const reason of ["disagreement", "not-converging"])
    assert.ok(rounds.includes(`reason: "${reason}"`), `rounds.ts no longer stops as ${reason}`);
  assert.match("the workflow stops", retired);
  assert.doesNotMatch("launch.ts stops", retired);
  for (const prefix of [[], [".ja"]])
    for (const path of [
      ["skills", "scoping", "references", "sufficiency.md"],
      ["skills", "scoping", "references", "issue.md"],
      ["skills", "implement", "SKILL.md"],
    ]) {
      const rel = [...prefix, ...path].join("/");
      const hits = readFileSync(join(root, rel), "utf8").split("\n").filter((line) => retired.test(line));
      assert.deepEqual(hits, [], `${rel} still names a retired word`);
    }
});
