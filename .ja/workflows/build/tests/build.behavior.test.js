// U-004: build.js が Load (fetch -> 決定論 id 収集 -> extract -> validate + id cross-check) /
// Revalidate / Branch / Code (sonnet) / Audit / Polish / Backlog (source: issue) / Ship の
// 実行ループになることの行動検証。fail-close 分岐・phase 順・stopped 値 snapshot を自動検証する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const buildJs = join(here, "..", "..", "build.js");

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
  if ("spec_found" in p) return "conformance";
  if ("translations" in p) return "translate";
  if ("pr_url" in p) return "ship";
  return "plain";
};

// happy path stub 一式。body / plan / revalidate で happy path の戻り値を差し替える。
const makeStubs = ({ body, plan, revalidate, conformance, translate } = {}) => ({
  agent: (prompt, opts) => {
    const kind = kindOf(opts);
    switch (kind) {
      case "translate":
        // 既定は fail-open (translations 無し) で英語原文を維持。翻訳の反映を検証する
        // テストだけが translate stub を渡す。
        return translate ? translate(prompt) : { notes: "no-translations" };
      case "fetch":
        return { found: true, body: body ?? bodyFor(["U-001"], ["T-001"]) };
      case "extract":
        return plan ?? makePlan();
      case "revalidate":
        return (
          revalidate ?? {
            results: [
              {
                path: "sample.js",
                pattern: "sampleSymbol",
                exists: true,
                matches: true,
              },
            ],
          }
        );
      case "conformance":
        return conformance ?? { spec_found: false, findings: [] };
      case "ship":
        return { committed: true, pr_url: "https://example.com/pr/1" };
      default:
        return "feat/sample-branch";
    }
  },
  workflow: (name) => {
    if (name === "code")
      return {
        completed: ["U-001"],
        anomalies: [],
        tests_pass: true,
        gates_pass: true,
      };
    if (name === "audit") return { findings: [], assignments: [] };
    if (name === "polish")
      return {
        codex_available: false,
        survivors: [],
        needs_context: [],
        cleanup: { tests_pass: true },
      };
    // 実 runtime の意味論: 未知の workflow 名は throw する。plugin 名前空間の build:* は
    // dev tree では未知なので、sibling() の fallback がここで発火する。
    throw new Error(`unknown workflow: ${name}`);
  },
});

const agentCallsOf = (calls, kind) => calls.agent.filter((c) => kindOf(c.opts) === kind);

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
    stubs: makeStubs({
      body: "Plan 見出しの無い issue 本文。\n\n## Context\n\n説明のみ。",
    }),
  });
  assert.equal(noPlan.result.stopped, "no-plan", "## Plan 見出し無しで stopped: no-plan");
  assert.equal(noPlan.calls.workflow.length, 0, "no-plan 後に入れ子 workflow が走らない");
  assert.equal(
    agentCallsOf(noPlan.calls, "extract").length,
    0,
    "Plan 見出し検査は extract agent より前に走る (決定論)",
  );
});

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

test("契約 prose 中の T-NNN 参照は定義でないので cross-check に載らず extraction-mismatch にならない", async () => {
  // contract 文の「既存の T-106 は変更しない」は参照であって定義ではない。
  // 定義された受け入れテストは T-109 のみで、抽出も T-109 のみを返す。
  const body = [
    "## Plan",
    "",
    "Outcome: sample outcome",
    "test_command: echo test",
    "",
    "### U-001: unit の見出し",
    "",
    "- contract: 既存の T-106 とプロダクションコードは変更しない",
    "",
    "受け入れテスト。",
    "",
    "- T-109: test scenario",
    "",
  ].join("\n");
  const base = makePlan().units[0];
  const plan = makePlan({
    units: [{ ...base, tests: [{ ...base.tests[0], id: "T-109" }] }],
  });
  const r = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ body, plan }),
  });
  assert.notEqual(
    r.result.stopped,
    "extraction-mismatch",
    "prose 参照 T-106 を欠落テストと誤検出しない",
  );
});

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
          {
            path: "sample.js",
            pattern: "sampleSymbol",
            exists: true,
            matches: true,
          },
          {
            path: "missing.js",
            pattern: "goneSymbol",
            exists: false,
            matches: false,
          },
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
  const pass = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs(),
  });
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

test("happy path の phase 順が Load → Revalidate → Branch → Code → Audit → Polish → Backlog → Ship で、code に model: sonnet が渡り challenge / think / research が呼ばれない", async () => {
  const { calls } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs(),
  });

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

  // sibling() が build:X を先に試して dev tree では throw → X に fallback するので、
  // capture には plugin 名と bare 名の両方が現れる。
  const names = new Set(calls.workflow.map((c) => c.name));
  assert.deepEqual(
    [...names].sort(),
    ["audit", "build:audit", "build:code", "build:polish", "code", "polish"],
    "workflow capture に code / audit / polish (+ build: 名前空間の試行) のみが現れる",
  );
  for (const banned of ["challenge", "think", "research"]) {
    assert.ok(!names.has(banned), `workflow('${banned}') が呼ばれない`);
  }
});

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

// build は起票せず、scope 外候補を戻り値 backlog_candidates にのみ surface する。
// PR body には出さない (レビュー対象でないため)。ユーザーは戻り値から /issue で起票する。
test("Backlog 候補は PR body に出さず戻り値 backlog_candidates にのみ surface する", async () => {
  const plan = makePlan({
    backlog_candidates: [{ summary: "issue 由来の scope 外候補" }],
  });
  const { calls, result } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ plan }),
  });

  // 候補は Ship の PR body prompt には載らない
  const shipCalls = agentCallsOf(calls, "ship");
  assert.equal(shipCalls.length, 1, "ship agent が 1 回呼ばれる");
  assert.ok(
    !shipCalls[0].prompt.includes("issue 由来の scope 外候補"),
    "ship prompt (PR body) に backlog 候補 summary が載らない",
  );

  // 候補は戻り値にのみ surface する
  assert.ok(Array.isArray(result.backlog_candidates), "戻り値に backlog_candidates 配列が載る");
  assert.ok(
    result.backlog_candidates.some(
      (c) => c.source === "issue" && c.summary === "issue 由来の scope 外候補",
    ),
    "backlog_candidates に source: issue の候補が載る",
  );
});

// reviewer-conformance の Spec 軸 findings は品質軸 (toFix / residualBlocking / blocking
// count) と混ぜず、独立軸として Ship の PR body payload と戻り値 conformance_findings に
// surface する。混ぜていれば fix loop が起動し residual_blocking が 0 でなくなる。
test("conformance findings が独立軸として surface し fix loop / residual_blocking に混ざらない", async () => {
  const { calls, result } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      conformance: {
        spec_found: true,
        findings: [
          {
            category: "missing",
            spec_line: "T-003 rejects negative",
            location: "pay.js:12",
            detail: "no test for T-003",
          },
        ],
      },
    }),
  });

  // 候補は Ship の PR body payload (shipPayload JSON) に載る
  const shipCalls = agentCallsOf(calls, "ship");
  assert.equal(shipCalls.length, 1, "ship agent が 1 回呼ばれる");
  assert.ok(
    shipCalls[0].prompt.includes("no test for T-003"),
    "ship prompt (PR body payload) に conformance finding の detail が載る",
  );

  // 戻り値の conformance_findings に件数が surface する
  assert.equal(result.conformance_findings, 1, "戻り値 conformance_findings が 1");

  // 独立軸: conformance finding は fix loop を起動せず、blocking count にも混ざらない
  const fixCalls = calls.agent.filter((c) => c.opts && (c.opts.label || "").startsWith("fix:"));
  assert.equal(fixCalls.length, 0, "conformance finding は fix loop を起動しない");
  assert.equal(result.residual_blocking, 0, "conformance finding は blocking count に混ざらない");
});

// tail の情報系セクション (assumptions / 未解決 finding / conformance / anomaly) の
// 自由記述は reviewer が英語で吐くので、Ship 直前に対象言語へ翻訳 + 圧縮する。
// 訳文が shipPayload に反映され、ship prompt (PR body payload) に載ることを検証する。
test("translate-tail の訳文が shipPayload に反映され ship prompt に載る", async () => {
  const plan = makePlan({
    assumptions: ["assume in EN"],
  });
  const { calls } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      plan,
      conformance: {
        spec_found: true,
        findings: [
          { category: "missing", spec_line: "L1", location: "a.js:1", detail: "conf in EN" },
        ],
      },
      // 入力配列は prompt の最終行 (言語マーカーに依存しない)。各 {id,text} の text を
      // JA<...> でラップし、id を付けて返す。
      translate: (prompt) => {
        const arr = JSON.parse(prompt.trim().split("\n").pop());
        return { translations: arr.map((o) => ({ id: o.id, text: `JA<${o.text}>` })) };
      },
    }),
  });

  // translate agent は slots が非空 (assumption + conformance) なので 1 回呼ばれる
  const translateCalls = agentCallsOf(calls, "translate");
  assert.equal(translateCalls.length, 1, "translate-tail agent が 1 回呼ばれる");

  // 訳文が ship prompt (shipPayload JSON) に載り、英語原文は残らない
  const shipCalls = agentCallsOf(calls, "ship");
  assert.equal(shipCalls.length, 1, "ship agent が 1 回呼ばれる");
  assert.ok(
    shipCalls[0].prompt.includes("JA<conf in EN>"),
    "ship prompt に翻訳済み conformance detail が載る",
  );
  assert.ok(
    shipCalls[0].prompt.includes("JA<assume in EN>"),
    "ship prompt に翻訳済み assumption が載る",
  );
});

// 訳が id 順を入れ替えて返っても、消費側は id で突合して正しい slot へ書き戻す。
test("translate-tail の訳が順序入れ替えでも id で正しい slot に反映される", async () => {
  const plan = makePlan({
    assumptions: ["assume A"],
  });
  const { calls } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      plan,
      conformance: {
        spec_found: true,
        findings: [{ category: "missing", spec_line: "L1", location: "a.js:1", detail: "conf B" }],
      },
      // id を保ったまま順序を反転して返す (位置ベースなら取り違える)
      translate: (prompt) => {
        const arr = JSON.parse(prompt.trim().split("\n").pop());
        return { translations: arr.map((o) => ({ id: o.id, text: `JA<${o.text}>` })).reverse() };
      },
    }),
  });

  const shipCalls = agentCallsOf(calls, "ship");
  assert.equal(shipCalls.length, 1, "ship agent が 1 回呼ばれる");
  assert.ok(
    shipCalls[0].prompt.includes("JA<conf B>"),
    "順序反転でも conformance detail に自分の訳が載る",
  );
  assert.ok(
    shipCalls[0].prompt.includes("JA<assume A>"),
    "順序反転でも assumption に自分の訳が載る",
  );
});

// 訳の id が入力と一致しない (欠落・取り違え) とき、消費側は fail-open で英語原文を
// 維持し PR を block しない。
test("translate-tail の訳 id が入力と一致しないなら英語原文で ship を継続する", async () => {
  const { calls } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      conformance: {
        spec_found: true,
        findings: [
          { category: "missing", spec_line: "L1", location: "a.js:1", detail: "conf in EN" },
        ],
      },
      // slot 0 の訳が無く、存在しない id 5 の訳を返す (取り違え)
      translate: () => ({ translations: [{ id: 5, text: "only one" }] }),
    }),
  });

  const shipCalls = agentCallsOf(calls, "ship");
  assert.equal(shipCalls.length, 1, "ship agent が 1 回呼ばれる");
  assert.ok(
    shipCalls[0].prompt.includes("conf in EN"),
    "id 不一致時は英語原文の conformance detail が ship prompt に残る",
  );
  assert.ok(!shipCalls[0].prompt.includes("only one"), "id 不一致の訳は採用されない");
});

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
