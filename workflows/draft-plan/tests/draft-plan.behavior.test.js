// ADR-0086: draft-plan.js が Plan 節なし issue 本文から plan を生成し、critic-design gate を
// 通すことの行動検証。GO で {plan, verdict}、NO-GO で stopped、body 空で no-body を pin する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const draftPlanJs = join(here, "..", "..", "draft-plan.js");

const samplePlan = () => ({
  outcome: "sample outcome",
  decisions: [],
  assumptions: ["gen-assumption"],
  units: [
    {
      id: "U-001",
      goal: "sample goal",
      files: ["sample.js"],
      contract: "sample contract",
      tests: [{ id: "T-001", name: "sample spec statement" }],
    },
  ],
  test_command: "echo test",
  preconditions: [],
  backlog_candidates: [],
});

// generate は schema に units、critique は verdict を持つ。schema の形で分類する。
const kindOf = (opts) => {
  const p = (opts && opts.schema && opts.schema.properties) || {};
  if ("units" in p) return "generate";
  if ("verdict" in p) return "critique";
  return "plain";
};
// "critique" in opts で明示 null を「渡された」として扱い、?? による null 潰しを避ける。
const makeStubs = (opts = {}) => ({
  agent: (prompt, a) => {
    switch (kindOf(a)) {
      case "generate":
        return "plan" in opts ? opts.plan : samplePlan();
      case "critique":
        return "critique" in opts ? opts.critique : { verdict: "GO", weaknesses: [] };
      default:
        return "";
    }
  },
});

test("body 空は stopped: no-body で fail-close する", async () => {
  const { result } = await runWorkflow(draftPlanJs, { args: { body: "  " }, stubs: makeStubs() });
  assert.equal(result.stopped, "no-body", "body 空で stopped: no-body");
});

test("生成 plan が GO なら {plan, verdict} を返し、人間未レビュー注記が assumptions 先頭に載る", async () => {
  const { result, calls } = await runWorkflow(draftPlanJs, {
    args: { body: "Plan 節の無い issue 本文。", issueNumber: "42" },
    stubs: makeStubs(),
  });
  assert.equal(result.verdict, "GO", "GO verdict を返す");
  assert.equal(result.plan.units.length, 1, "生成 plan の units を返す");
  assert.ok(
    String(result.plan.assumptions[0]).includes("auto-generated"),
    "人間未レビューの注記が assumptions 先頭に固定される",
  );
  assert.ok(
    result.plan.assumptions.includes("gen-assumption"),
    "生成 plan 自身の assumptions も保持される",
  );
  // critique は 1 回だけ opus + xhigh で走る (Plan 節あり path の id クロスチェック相当)。
  const critiqueCall = calls.agent.find((c) => kindOf(c.opts) === "critique");
  assert.ok(critiqueCall, "critique agent が呼ばれる");
  assert.equal(critiqueCall.opts.model, "opus", "critique は opus 固定");
  assert.equal(critiqueCall.opts.effort, "xhigh", "critique は effort xhigh");
});

test("critic-design NO-GO なら stopped: generated-plan-rejected と weaknesses を返す", async () => {
  const { result } = await runWorkflow(draftPlanJs, {
    args: { body: "Plan 節の無い issue 本文。", issueNumber: "42" },
    stubs: makeStubs({ critique: { verdict: "NO-GO", weaknesses: ["unit 分解が不健全"] } }),
  });
  assert.equal(result.stopped, "generated-plan-rejected", "NO-GO で fail-close する");
  assert.ok(result.weaknesses.includes("unit 分解が不健全"), "weaknesses が surface する");
});

test("critic が死んでも (null) fail-open で plan を返す", async () => {
  const { result } = await runWorkflow(draftPlanJs, {
    args: { body: "Plan 節の無い issue 本文。", issueNumber: "42" },
    stubs: makeStubs({ critique: null }),
  });
  assert.notEqual(result.stopped, "generated-plan-rejected", "critic null は plan を止めない");
  assert.equal(result.verdict, "unavailable", "verdict は unavailable として返る");
});

test("静的 gate が JA / EN の draft-plan.js で pass する", () => {
  const targets = [
    join(root, ".ja", "workflows", "draft-plan.js"),
    join(root, "workflows", "draft-plan.js"),
  ];
  for (const file of targets) {
    execFileSync("node", ["--check", file], { cwd: root });
  }
  execFileSync("npx", ["oxlint", ...targets], { cwd: root });
});
