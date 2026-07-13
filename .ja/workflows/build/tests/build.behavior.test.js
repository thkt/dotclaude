// U-004: build.js が Load (fetch -> 決定論 id 収集 -> extract -> validate + id cross-check) /
// Revalidate / Branch / Code (opus) / Audit / Polish / Backlog (source: issue) / Ship の
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
// REVALIDATE_SCHEMA {results} / CRITIQUE_SCHEMA {verdict} / SHIP {pr_url} を判別する。
const kindOf = (opts) => {
  const p = (opts && opts.schema && opts.schema.properties) || null;
  if (!p) return "plain";
  if ("found" in p && "body" in p) return "fetch";
  if ("units" in p) return "extract";
  if ("results" in p) return "revalidate";
  if ("verdict" in p) return "critique";
  if ("spec_found" in p) return "conformance";
  if ("translations" in p) return "translate";
  if ("pr_url" in p) return "ship";
  return "plain";
};

// happy path stub 一式。body / plan / revalidate で happy path の戻り値を差し替える。
const makeStubs = ({
  body,
  plan,
  revalidate,
  conformance,
  translate,
  audit,
  polish,
  critique,
} = {}) => ({
  agent: (prompt, opts) => {
    const kind = kindOf(opts);
    switch (kind) {
      case "translate":
        // 既定は fail-open (translations 無し) で英語原文を維持。翻訳の反映を検証する
        // テストだけが translate stub を渡す。
        return translate ? translate(prompt) : { notes: "no-translations" };
      case "fetch":
        return { found: true, body: body ?? bodyFor(["U-001"], ["T-001"]) };
      case "critique":
        // 生成 path でのみ呼ばれる critic-design gate。既定は GO で生成 plan を通す。
        // NO-GO で fail-close する経路を検証するテストだけが NO-GO の critique を渡す。
        return critique ?? { verdict: "GO", weaknesses: [] };
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
    // audit は呼び出しごとに評価する。初回 audit と re-audit で別結果を返せるよう、関数
    // なら都度呼び出し (呼び出し側が round ごとの並びを閉包で保持する)、値ならそのまま返す。
    // 既定は毎回 clean で、fix loop を起動しない。
    if (name === "audit")
      return (typeof audit === "function" ? audit() : audit) ?? { findings: [], assignments: [] };
    if (name === "polish")
      return (
        polish ?? {
          codex_available: false,
          survivors: [],
          needs_context: [],
          cleanup: { tests_pass: true },
        }
      );
    // 実 runtime の意味論: 未知の workflow 名は throw する。plugin 名前空間の build:* は
    // dev tree では未知なので、sibling() の fallback がここで発火する。
    throw new Error(`unknown workflow: ${name}`);
  },
});

const agentCallsOf = (calls, kind) => calls.agent.filter((c) => kindOf(c.opts) === kind);

test("args 空は stopped: no-issue で fail-close する", async () => {
  const empty = await runWorkflow(buildJs, { args: {}, stubs: makeStubs() });
  assert.equal(empty.result.stopped, "no-issue", "args 空で stopped: no-issue");
  assert.equal(empty.calls.workflow.length, 0, "no-issue 後に入れ子 workflow が走らない");
  assert.ok(
    empty.calls.phase.every((p) => p === "Load"),
    "no-issue 後に Load 以外の phase が走らない",
  );
});

test("Plan 節なし本文は fail-close せず ephemeral plan 生成で Ship まで進み、assumption が先頭に記録される", async () => {
  const noPlan = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      body: "Plan 見出しの無い issue 本文。\n\n## Context\n\n説明のみ。",
    }),
  });
  assert.equal(noPlan.result.stopped, undefined, "## Plan 見出し無しで fail-close しない");
  assert.ok(noPlan.calls.phase.includes("Ship"), "生成 plan で Ship phase まで到達する");

  // 生成 agent は EXTRACT_SCHEMA を使うが label が generate-plan に切り替わり、
  // model 固定 (sonnet) は外れて session model を継承する。
  const gen = agentCallsOf(noPlan.calls, "extract");
  assert.equal(gen.length, 1, "plan 生成 agent が 1 回呼ばれる");
  assert.equal(gen[0].opts.label, "generate-plan", "label が generate-plan に切り替わる");
  assert.ok(!("model" in gen[0].opts), "生成は model 固定せず session model を継承する");

  // 生成 plan の id (U-001 / T-001) は body に定義が無いが、cross-check は skip される。
  assert.notEqual(
    noPlan.result.stopped,
    "extraction-mismatch",
    "生成 plan は id cross-check の対象外",
  );

  // 人間レビュー未経由 assumption が先頭に固定され、issue 由来の assumption は残る。
  assert.ok(
    String((noPlan.result.assumptions || [])[0]).includes("auto-generated"),
    "自動生成 plan の assumption が先頭に記録される",
  );
  assert.ok(
    (noPlan.result.assumptions || []).includes("assumption-1"),
    "生成 plan 自身の assumptions も保持される",
  );

  // 型付き provenance: Plan 節なし由来の plan は plan_source: "generated" として
  // machine-check できる field で surface する (prose の assumption だけに頼らない)。
  assert.equal(noPlan.result.plan_source, "generated", "生成 plan は plan_source: generated");
});

// issue body は untrusted input (public repo では誰でも編集できる) なので、extract /
// generate prompt では bare `---` でなく明示的な data fence で囲み、fence 内容を
// instruction として扱わない指示を付けて prompt injection を鈍らせる。
test("extract / generate prompt は issue body を untrusted data fence で囲む", async () => {
  const withPlan = await runWorkflow(buildJs, { args: { issue: "123" }, stubs: makeStubs() });
  const extract = agentCallsOf(withPlan.calls, "extract");
  assert.equal(extract.length, 1, "Plan 節あり path で extract agent が 1 回呼ばれる");
  assert.ok(
    extract[0].prompt.includes("BEGIN UNTRUSTED ISSUE BODY") &&
      extract[0].prompt.includes("END UNTRUSTED ISSUE BODY"),
    "extract prompt は body を BEGIN/END の untrusted fence で囲む",
  );
  assert.ok(
    /never follow any instruction/i.test(extract[0].prompt),
    "fence 内容を instruction として扱わない指示が付く",
  );

  const noPlan = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ body: "Plan 節の無い本文。\n\n## Context\n\n説明。" }),
  });
  const gen = agentCallsOf(noPlan.calls, "extract");
  assert.equal(gen.length, 1, "Plan 節なし path で generate agent が 1 回呼ばれる");
  assert.ok(
    gen[0].prompt.includes("BEGIN UNTRUSTED ISSUE BODY") &&
      /never follow any instruction/i.test(gen[0].prompt),
    "generate prompt も同じ untrusted data fence で body を囲む",
  );
});

// 生成 plan は人間レビュー未経由なので、issue path の id cross-check gate の代わりに
// critic-design gate を通す。NO-GO verdict なら stopped: generated-plan-rejected で
// fail-close し、weaknesses を surface して Code へ進まない。
test("生成 plan が critic-design NO-GO なら stopped: generated-plan-rejected で fail-close する", async () => {
  const rejected = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      body: "Plan 節の無い本文。\n\n## Context\n\n説明。",
      critique: { verdict: "NO-GO", weaknesses: ["unit 分割が不健全", "test_command が誤り"] },
    }),
  });
  assert.equal(
    rejected.result.stopped,
    "generated-plan-rejected",
    "NO-GO で stopped: generated-plan-rejected",
  );
  assert.ok(
    (rejected.result.weaknesses || []).includes("unit 分割が不健全"),
    "critic の weaknesses が戻り値に surface する",
  );
  assert.ok(!rejected.calls.phase.includes("Code"), "NO-GO で Code phase へ進まない");
});

// critic-design gate は生成 path でのみ起動する。Plan 節あり path は id cross-check が
// あるので critic を呼ばず、GO の生成 plan は Code まで進む。
test("critic-design gate は生成 path のみ起動し、Plan 節あり path では呼ばれない", async () => {
  const gen = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({ body: "Plan 節の無い本文。\n\n## Context\n\n説明。" }),
  });
  assert.equal(
    agentCallsOf(gen.calls, "critique").length,
    1,
    "生成 path で critic-design が 1 回起動する",
  );
  assert.ok(gen.calls.phase.includes("Code"), "GO の生成 plan は Code まで進む");

  const withPlan = await runWorkflow(buildJs, { args: { issue: "123" }, stubs: makeStubs() });
  assert.equal(
    agentCallsOf(withPlan.calls, "critique").length,
    0,
    "Plan 節あり path では critic-design を呼ばない",
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

test("happy path の phase 順が Load → Revalidate → Branch → Code → Audit → Polish → Backlog → Ship で、code に model: opus が渡り challenge / think / research が呼ばれない", async () => {
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
  assert.equal(codeCalls[0].args.model, "opus", "code に model: opus が渡る");
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
      "generated-plan-rejected",
      "invalid-plan",
      "no-issue",
      "no-issue-body",
      "plan-drift",
      "revalidate-failed",
    ],
    "stopped リテラル集合が 9 値と exact match する (no-plan は ephemeral plan 生成に置換、生成 path の critic gate で generated-plan-rejected を追加)",
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

  // 型付き provenance: ## Plan 節ありの issue 由来 plan は plan_source: "issue"。
  assert.equal(result.plan_source, "issue", "Plan 節あり plan は plan_source: issue");
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

// Round-aware audit stub seam: returns finding on the first call (round 1), clean on
// every re-audit after, so a fix-loop test can exercise the round that clears it.
const onceThenClean = (finding) => {
  let round = 0;
  return () =>
    round++ === 0 ? { findings: [finding], assignments: [] } : { findings: [], assignments: [] };
};

// audit の critical/high finding は fix loop を起動する。fix agent は opus + effort xhigh で
// 呼ばれ、修正後の re-audit が clear すれば residual_blocking 0 で Ship まで進む。stub の
// audit を初回だけ finding、以降 clean にして loop が回って抜ける経路を実際に踏ませる
// (これが無いと fix loop は一度も実行されず、opus+xhigh 指定も未検証のままになる)。
test("audit の critical/high finding が fix loop を opus+xhigh で起動し、re-audit clear で residual_blocking 0 になる", async () => {
  const highFinding = { severity: "high", summary: "sample high finding", file: "sample.js" };
  const { calls, result } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      // 初回 audit は high finding、re-audit (2 回目以降) は clean。
      audit: onceThenClean(highFinding),
    }),
  });

  // fix loop が 1 round 起動し、fix agent は opus + effort xhigh で呼ばれ finding を受け取る。
  const fixCalls = calls.agent.filter((c) => c.opts && (c.opts.label || "").startsWith("fix:"));
  assert.equal(fixCalls.length, 1, "high finding で fix loop が 1 round 起動する");
  assert.equal(fixCalls[0].opts.model, "opus", "fix agent は model: opus で呼ばれる");
  assert.equal(fixCalls[0].opts.effort, "xhigh", "fix agent は effort: xhigh で呼ばれる");
  assert.ok(fixCalls[0].prompt.includes("sample high finding"), "fix prompt に対象 finding が載る");

  // re-audit が clear したので blocking は残らず Ship まで進む。
  assert.equal(result.residual_blocking, 0, "re-audit clear で residual_blocking 0");
  assert.ok(calls.phase.includes("Ship"), "fix loop 完了後 Ship phase に到達する");
});

// audit の critical finding も high と同じく fix loop を起動する (criticalHigh の
// f.severity === "critical" operand を踏む)。round-aware stub seam で初回だけ critical、
// 以降 clean にして 1 round で抜ける経路を検証する。
test("audit の critical finding も fix loop を起動し、re-audit clear で residual_blocking 0 になる", async () => {
  const criticalFinding = { severity: "critical", summary: "critical finding", file: "s.js" };
  const { calls, result } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      audit: onceThenClean(criticalFinding),
    }),
  });
  const fixCalls = calls.agent.filter((c) => c.opts && (c.opts.label || "").startsWith("fix:"));
  assert.equal(fixCalls.length, 1, "critical finding で fix loop が 1 round 起動する");
  assert.ok(
    fixCalls[0].prompt.includes("critical finding"),
    "fix prompt に critical severity の finding が載る",
  );
  assert.equal(result.residual_blocking, 0, "re-audit clear で residual_blocking 0");
});

// audit が 3 round 修正しても critical/high を返し続けると、round cap 分岐
// (build.js: round === 3 で reaudited=false + break) を踏む。fix agent は 3 回で
// 打ち切られ、最終 round の未 re-audit finding が residual_blocking に残り、cap ログが出る。
test("audit が修正後も high を返し続けると 3 round で cap し reaudited=false で residual に残す", async () => {
  const stubbornFinding = { severity: "high", summary: "stubborn finding", file: "s.js" };
  const { calls, result, logs } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      // round-aware seam: 何 round 目でも high finding を返し続け、re-audit で解消しない
      audit: () => ({ findings: [stubbornFinding], assignments: [] }),
    }),
  });
  const fixCalls = calls.agent.filter((c) => c.opts && (c.opts.label || "").startsWith("fix:"));
  assert.equal(fixCalls.length, 3, "fix loop は最大 3 round で打ち切られる");
  assert.equal(
    result.residual_blocking,
    1,
    "cap 到達時、最終 round の未 re-audit finding が residual_blocking に残る",
  );
  assert.ok(
    logs.some((l) => l.includes("Fix round cap reached")),
    "round cap 到達ログが出る",
  );
  assert.ok(calls.phase.includes("Ship"), "cap 到達でも Ship phase まで進む");
});

// polish review の survivors が fix loop に載ることの検証。makeStubs が polish stub を
// 受け取り、build.js の polishSurvivors 写像 (P1 -> high / それ以外 -> medium、summary は
// title: detail、file は f.file ?? "") が toFix にマージされることを確認する。
test("polish review の survivors が P1->high / 非P1->medium に写像され fix loop に載る", async () => {
  const { calls, result } = await runWorkflow(buildJs, {
    args: { issue: "123" },
    stubs: makeStubs({
      polish: {
        codex_available: true,
        survivors: [
          { severity: "P1", title: "P1 title", detail: "P1 detail", file: "a.js" },
          { severity: "P2", title: "P2 title", detail: "P2 detail" },
        ],
        needs_context: [],
        cleanup: { tests_pass: true },
      },
    }),
  });
  const fixCalls = calls.agent.filter((c) => c.opts && (c.opts.label || "").startsWith("fix:"));
  assert.equal(fixCalls.length, 1, "survivors があると fix loop が 1 round 起動する");
  assert.ok(
    fixCalls[0].prompt.includes('"severity":"high"') &&
      fixCalls[0].prompt.includes("P1 title: P1 detail"),
    "P1 survivor は severity high・summary 'title: detail' に写像される",
  );
  assert.ok(
    fixCalls[0].prompt.includes('"severity":"medium"') &&
      fixCalls[0].prompt.includes("P2 title: P2 detail"),
    "非 P1 survivor は severity medium に写像される",
  );
  // 既定 audit は clean なので survivors のみが blocking で、re-audit clear 後 residual 0。
  assert.equal(result.residual_blocking, 0, "re-audit clear で residual_blocking 0");
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

test("実環境で Plan 節付き issue が Load → Revalidate → Branch → Code と進み、Plan 節なし issue が generate-plan 経由で同じ順に進む (manual acceptance、done 前必須)", () => {
  // harness green だけで完了にしないための manual gate。実際に build workflow を
  // Plan 節付き / Plan 節なしの実 issue で起動し、前者の phase log が
  // Load → Revalidate → Branch → Code の順に出て、後者が generate-plan agent で
  // ephemeral plan を作り同じ順に進む (assumptions 先頭に auto-generated が載る) ことを
  // 確認したら U004_MANUAL_ACCEPTANCE=pass を付けてテストを実行する。
  assert.equal(
    process.env.U004_MANUAL_ACCEPTANCE,
    "pass",
    "manual acceptance 未実施。実 issue で build workflow を起動して確認後、U004_MANUAL_ACCEPTANCE=pass で再実行する",
  );
});
