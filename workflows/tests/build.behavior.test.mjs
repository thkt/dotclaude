// U-004: build.js が Load (fetch -> 決定論 id 収集 -> extract -> validate + id cross-check) /
// Revalidate / Branch / Code (sonnet) / Audit / Polish / Backlog (source: issue) / Ship の
// 実行ループになることの行動検証。fail-close 分岐・phase 順・stopped 値 snapshot を自動検証する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "./run-workflow.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const buildJs = join(here, "..", "build.js");

// ---- fixtures ----

// Plan 節付き issue body。unitIds / testIds は決定論 id 収集の対象になるリテラル。
const bodyFor = (unitIds, testIds) =>
  [
    "Issue の背景説明。",
    "",
    "## Plan",
    "",
    ...unitIds.map((u) => `### ${u}: unit の見出し`),
    ...testIds.map((t) => `- ${t}: test scenario`),
    "",
    "test_command: echo test",
    "",
  ].join("\n");

// build の validate() + content 非空検査を通る抽出済み plan。
const makePlan = (overrides = {}) => ({
  dir: ".claude/workspace/planning/2026-07-03-sample",
  outcome: "sample outcome",
  decisions: [],
  assumptions: ["assumption-1"],
  units: [
    {
      id: "U-001",
      goal: "sample goal",
      files: ["sample.js"],
      contract: "sample contract",
      tests: [
        {
          id: "T-001",
          name: "sample spec statement",
          given: "sample given",
          when: "sample when",
          // BDD の given/when/then フィールドであり thenable ではない
          // oxlint-disable-next-line unicorn/no-thenable
          then: "sample then",
        },
      ],
      depends_on: [],
    },
  ],
  test_command: "echo test",
  preconditions: [{ path: "sample.js", pattern: "sampleSymbol" }],
  backlog_candidates: [],
  ...overrides,
});

// agent 呼び出しを schema の形で分類する。label 文字列への結合を避け、
// FETCH_SCHEMA {found, body} / EXTRACT_SCHEMA (units + preconditions) /
// REVALIDATE_SCHEMA {results} / SHIP {pr_url} を判別する。
const kindOf = (opts) => {
  const p = (opts && opts.schema && opts.schema.properties) || null;
  if (!p) return "plain";
  if ("found" in p && "body" in p) return "fetch";
  if ("units" in p) return "extract";
  if ("results" in p) return "revalidate";
  if ("pr_url" in p) return "ship";
  return "plain";
};

// happy path stub 一式。overrides の kind ごとに差し替える。
const makeStubs = ({
  body,
  plan,
  revalidate,
  agentOverrides = {},
  workflowOverrides = {},
} = {}) => ({
  agent: (prompt, opts) => {
    const kind = kindOf(opts);
    if (kind in agentOverrides) return agentOverrides[kind](prompt, opts);
    switch (kind) {
      case "fetch":
        return { found: true, body: body ?? bodyFor(["U-001"], ["T-001"]) };
      case "extract":
        return plan ?? makePlan();
      case "revalidate":
        return (
          revalidate ?? {
            results: [{ path: "sample.js", pattern: "sampleSymbol", exists: true, matches: true }],
          }
        );
      case "ship":
        return { committed: true, pr_url: "https://example.com/pr/1" };
      default:
        return "feat/sample-branch";
    }
  },
  workflow: (name, wfArgs) => {
    if (name in workflowOverrides) return workflowOverrides[name](wfArgs);
    if (name === "code")
      return { completed: ["U-001"], anomalies: [], tests_pass: true, gates_pass: true };
    if (name === "audit") return { findings: [], assignments: [] };
    if (name === "polish")
      return {
        codex_available: false,
        survivors: [],
        needs_context: [],
        cleanup: { tests_pass: true },
      };
    return {};
  },
});

const agentCallsOf = (calls, kind) => calls.agent.filter((c) => kindOf(c.opts) === kind);

// ---- T-012 ----
test("args 空は stopped: no-issue、Plan 節なし本文は stopped: no-plan で fail-close する", async () => {
  const empty = await runWorkflow(buildJs, { args: {}, stubs: makeStubs() });
  assert.equal(empty.result.stopped, "no-issue", "args 空で stopped: no-issue");
  assert.equal(empty.calls.workflow.length, 0, "no-issue 後に入れ子 workflow が走らない");
  assert.ok(
    empty.calls.phase.every((p) => p === "Load"),
    "no-issue 後に Load 以外の phase が走らない",
  );

  const noPlan = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ body: "Plan 見出しの無い issue 本文。\n\n## Context\n\n説明のみ。" }),
  });
  assert.equal(noPlan.result.stopped, "no-plan", "## Plan 見出し無しで stopped: no-plan");
  assert.equal(noPlan.calls.workflow.length, 0, "no-plan 後に入れ子 workflow が走らない");
  assert.equal(
    agentCallsOf(noPlan.calls, "extract").length,
    0,
    "Plan 見出し検査は extract agent より前に走る (決定論)",
  );
});

// ---- T-013 ----
test("構造欠陥と content 空 (contract / given) はいずれも stopped: invalid-plan になる", async () => {
  const variants = [
    { plan: makePlan({ units: [] }), expect: /units/ },
    {
      plan: makePlan({
        units: [{ ...makePlan().units[0], contract: "" }],
      }),
      expect: /contract/,
    },
    {
      plan: makePlan({
        units: [
          {
            ...makePlan().units[0],
            tests: [{ ...makePlan().units[0].tests[0], given: "" }],
          },
        ],
      }),
      expect: /given/,
    },
  ];
  for (const { plan, expect } of variants) {
    const { result } = await runWorkflow(buildJs, {
      args: { issue: "123" },
      stubs: makeStubs({ plan }),
    });
    assert.equal(result.stopped, "invalid-plan", `variant ${expect} で stopped: invalid-plan`);
    assert.ok(Array.isArray(result.blockers), "blockers が配列で返る");
    assert.ok(
      result.blockers.some((b) => expect.test(String(b))),
      `blockers に ${expect} を含むエラー文言が載る`,
    );
  }
});

// ---- T-014 ----
test("抽出での unit / test の silent drop は stopped: extraction-mismatch で決定論検出される", async () => {
  const body = bodyFor(["U-001", "U-002"], ["T-001", "T-002", "T-003"]);
  const base = makePlan().units[0];

  // case A: unit U-002 を silent drop (test id は全部返す)
  const unitDrop = makePlan({
    units: [
      {
        ...base,
        tests: [
          { ...base.tests[0], id: "T-001" },
          { ...base.tests[0], id: "T-002" },
          { ...base.tests[0], id: "T-003" },
        ],
      },
    ],
  });
  const a = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ body, plan: unitDrop }),
  });
  assert.equal(
    a.result.stopped,
    "extraction-mismatch",
    "unit drop で stopped: extraction-mismatch",
  );
  assert.ok(
    JSON.stringify(a.result.detail).includes("U-002"),
    "不一致 unit id U-002 が detail に載る",
  );

  // case B: test id T-003 を 1 件 silent drop (unit id は全部返す)
  const testDrop = makePlan({
    units: [
      { ...base, tests: [{ ...base.tests[0], id: "T-001" }] },
      {
        ...base,
        id: "U-002",
        tests: [{ ...base.tests[0], id: "T-002" }],
      },
    ],
  });
  const b = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ body, plan: testDrop }),
  });
  assert.equal(
    b.result.stopped,
    "extraction-mismatch",
    "test drop で stopped: extraction-mismatch",
  );
  assert.ok(
    JSON.stringify(b.result.detail).includes("T-003"),
    "不一致 test id T-003 が detail に載る",
  );
});

// ---- T-015 ----
test("Revalidate は 1 miss で stopped: plan-drift、全 pass で Branch へ進み、preconditions 空なら agent を呼ばない", async () => {
  // miss case: exists: false を 1 件含む
  const driftPlan = makePlan({
    preconditions: [
      { path: "sample.js", pattern: "sampleSymbol" },
      { path: "missing.js", pattern: "goneSymbol" },
    ],
  });
  const miss = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      plan: driftPlan,
      revalidate: {
        results: [
          { path: "sample.js", pattern: "sampleSymbol", exists: true, matches: true },
          { path: "missing.js", pattern: "goneSymbol", exists: false, matches: false },
        ],
      },
    }),
  });
  assert.equal(miss.result.stopped, "plan-drift", "1 miss で stopped: plan-drift");
  assert.ok(
    JSON.stringify(miss.result).includes("missing.js"),
    "drift 一覧に miss した path が載る",
  );
  assert.ok(!miss.calls.phase.includes("Branch"), "plan-drift 後に Branch へ進まない");

  // all-pass case: Branch phase に到達する
  const pass = await runWorkflow(buildJs, { args: { issue: "123" }, stubs: makeStubs() });
  assert.ok(pass.calls.phase.includes("Branch"), "全 pass で Branch phase に到達する");

  // 空 case: revalidate agent が呼ばれず Branch に到達する
  const empty = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ plan: makePlan({ preconditions: [] }) }),
  });
  assert.equal(
    agentCallsOf(empty.calls, "revalidate").length,
    0,
    "preconditions 空で revalidate agent が呼ばれない",
  );
  assert.ok(empty.calls.phase.includes("Branch"), "preconditions 空でも Branch phase に到達する");
});

// ---- T-016 ----
test("happy path の phase 順が Load → Revalidate → Branch → Code → Audit → Polish → Backlog → Ship で、code に model: sonnet が渡り challenge / think / research が呼ばれない", async () => {
  const { calls } = await runWorkflow(buildJs, { args: { issue: "123" }, stubs: makeStubs() });

  assert.deepEqual(
    calls.phase,
    ["Load", "Revalidate", "Branch", "Code", "Audit", "Polish", "Backlog", "Ship"],
    "phase 順が Load → Revalidate → Branch → Code → Audit → Polish → Backlog → Ship",
  );

  const codeCalls = calls.workflow.filter((c) => c.name === "code");
  assert.equal(codeCalls.length, 1, "workflow('code') が 1 回呼ばれる");
  assert.equal(codeCalls[0].args.model, "sonnet", "code に model: sonnet が渡る");
  assert.ok(
    !("preconditions" in codeCalls[0].args.plan),
    "code へ渡す plan から preconditions が strip される",
  );

  const names = new Set(calls.workflow.map((c) => c.name));
  assert.deepEqual(
    [...names].sort(),
    ["audit", "code", "polish"],
    "workflow capture に code / audit / polish のみが現れる",
  );
  for (const banned of ["challenge", "think", "research"]) {
    assert.ok(!names.has(banned), `workflow('${banned}') が呼ばれない`);
  }
});

// ---- T-017 ----
test("stopped 値集合の snapshot が 9 値と exact match し Explore agent が残っていない", () => {
  const source = readFileSync(buildJs, "utf8");
  const stopped = new Set();
  for (const m of source.matchAll(/stopped:\s*"([^"]+)"/g)) stopped.add(m[1]);
  assert.deepEqual(
    [...stopped].sort(),
    [
      "code-failed",
      "extraction-failed",
      "extraction-mismatch",
      "invalid-plan",
      "no-issue",
      "no-issue-body",
      "no-plan",
      "plan-drift",
      "revalidate-failed",
    ],
    "stopped リテラル集合が 9 値と exact match する",
  );
  const explore = source.match(/agentType:\s*"Explore"/g) || [];
  assert.equal(explore.length, 0, 'agentType: "Explore" が 0 件');
});

// ---- T-018 ----
// build は起票せず、scope 外候補を最終出力 (Ship の PR body prompt + 戻り値
// backlog_candidates) に surface する。ユーザーはここから /issue で起票する。
test("Backlog 候補が Ship の PR body prompt と戻り値 backlog_candidates に surface する", async () => {
  const plan = makePlan({
    backlog_candidates: [{ summary: "issue 由来の scope 外候補" }],
  });
  const { calls, result } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ plan }),
  });

  // 候補は Ship の PR body prompt に載る
  const shipCalls = agentCallsOf(calls, "ship");
  assert.equal(shipCalls.length, 1, "ship agent が 1 回呼ばれる");
  assert.match(
    shipCalls[0].prompt,
    /source['"]?\s*:\s*['"]?issue/,
    "ship prompt (PR body) に source: issue の候補が含まれる",
  );
  assert.ok(
    shipCalls[0].prompt.includes("issue 由来の scope 外候補"),
    "ship prompt (PR body) に extract 由来の候補 summary が含まれる",
  );

  // 候補は戻り値にも surface する
  assert.ok(Array.isArray(result.backlog_candidates), "戻り値に backlog_candidates 配列が載る");
  assert.ok(
    result.backlog_candidates.some(
      (c) => c.source === "issue" && c.summary === "issue 由来の scope 外候補",
    ),
    "backlog_candidates に source: issue の候補が載る",
  );
});

// ---- T-019 (manual acceptance、done 前必須) ----
test("実環境で Plan 節付き issue が Load → Revalidate → Branch → Code と進み、Plan 節なし issue が stopped: no-plan を返す (manual acceptance、done 前必須)", () => {
  // harness green だけで完了にしないための manual gate。実際に build workflow を
  // Plan 節付き / Plan 節なしの実 issue で起動し、前者の phase log が
  // Load → Revalidate → Branch → Code の順に出て後者が stopped: no-plan を返すことを
  // 確認したら U004_MANUAL_ACCEPTANCE=pass を付けてテストを実行する。
  assert.equal(
    process.env.U004_MANUAL_ACCEPTANCE,
    "pass",
    "manual acceptance 未実施。実 issue で build workflow を起動して確認後、U004_MANUAL_ACCEPTANCE=pass で再実行する",
  );
});
