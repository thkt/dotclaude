// U-003: code.js が任意 input.model を Red / Green 実装 agent にのみ伝播し (未指定時は opus)、
// 実装 agent が常に effort high で走ることの行動検証。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..", "..");
const codeJs = join(here, "..", "..", "code.js");

const plan = {
  test_command: "echo test",
  units: [
    {
      id: "U-1",
      goal: "sample goal",
      files: ["sample.js"],
      contract: "sample contract",
      depends_on: [],
      tests: [],
    },
  ],
};

// red / green は 1 回目に失敗を返して retry (red2 / green2) を発火させ、
// 4 呼び出し (red, red2, green, green2) すべてを capture させる stub。
const retryingAgentStub = (prompt, opts) => {
  const label = opts.label ?? "";
  if (label.startsWith("red2:"))
    return { red_confirmed: true, test_files: ["t.test.js"], notes: "" };
  if (label.startsWith("red:"))
    return {
      red_confirmed: false,
      test_files: [],
      notes: "passed unexpectedly",
    };
  if (label.startsWith("green2:")) return { green: true, notes: "" };
  if (label.startsWith("green:")) return { green: false, notes: "still failing" };
  if (label === "verify") return { tests_pass: true, gates_pass: true, output_tail: "" };
  throw new Error(`unexpected label: ${label}`);
};

const happyAgentStub = (prompt, opts) => {
  const label = opts.label ?? "";
  if (label.startsWith("red:"))
    return { red_confirmed: true, test_files: ["t.test.js"], notes: "" };
  if (label.startsWith("green:")) return { green: true, notes: "" };
  if (label === "verify") return { tests_pass: true, gates_pass: true, output_tail: "" };
  throw new Error(`unexpected label: ${label}`);
};

test("model 指定時に Red / Green とその retry の 4 呼び出しへ伝播し Verify は固定 sonnet のまま", async () => {
  const { calls } = await runWorkflow(codeJs, {
    // Verify の固定 sonnet と別の model を渡し、下の assertion が input.model の
    // 伝播と固定値を区別できるようにする。
    args: { plan, repo: "", model: "haiku" },
    stubs: { agent: retryingAgentStub },
  });

  const redGreen = calls.agent.filter((c) => /^(red|red2|green|green2):/.test(c.opts.label));
  assert.equal(redGreen.length, 4, "red / red2 / green / green2 の 4 呼び出しがある");
  for (const call of redGreen) {
    assert.equal(call.opts.model, "haiku", `${call.opts.label} の opts に model: "haiku" がある`);
    assert.equal(call.opts.effort, "high", `${call.opts.label} の opts に effort: "high" がある`);
  }

  const verify = calls.agent.find((c) => c.opts.label === "verify");
  assert.ok(verify, "verify 呼び出しがある");
  assert.equal(
    verify.opts.model,
    "sonnet",
    "verify の opts は input.model でなく固定 sonnet を持つ",
  );
});

test("model 未指定で Red / Green の opts が既定の opus と effort high を持ち完走する", async () => {
  const { result, calls } = await runWorkflow(codeJs, {
    args: { plan, repo: "" },
    stubs: { agent: happyAgentStub },
  });

  for (const call of calls.agent) {
    if (call.opts.label === "verify") {
      assert.equal(call.opts.model, "sonnet", "verify の opts は固定 sonnet を持つ");
      continue;
    }
    assert.equal(call.opts.model, "opus", `${call.opts.label} の opts が既定の opus を持つ`);
    assert.equal(call.opts.effort, "high", `${call.opts.label} の opts に effort: "high" がある`);
  }
  assert.deepEqual(result.completed, ["U-1"], "completed に unit id が入る");
  assert.equal(result.tests_pass, true, "verify の tests_pass がそのまま返る");
});

test("静的 gate が JA / EN の code.js と tests/*.js で pass する", () => {
  const targets = [
    join(root, ".ja", "workflows", "code.js"),
    join(root, "workflows", "code.js"),
    join(root, ".ja", "workflows", "_lib", "run-workflow.js"),
    join(root, "workflows", "_lib", "run-workflow.js"),
    join(root, ".ja", "workflows", "code", "tests", "code.model.test.js"),
    join(root, "workflows", "code", "tests", "code.model.test.js"),
  ];
  for (const file of targets) {
    execFileSync("node", ["--check", file], { cwd: root });
  }
  execFileSync("npx", ["oxlint", ...targets], { cwd: root });
});
