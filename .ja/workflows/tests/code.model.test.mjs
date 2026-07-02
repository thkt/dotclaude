// U-003: code.js が任意 input.model を Red / Green 実装 agent にのみ伝播することの行動検証。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "./run-workflow.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const codeJs = join(here, "..", "code.js");

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
    return { red_confirmed: false, test_files: [], notes: "passed unexpectedly" };
  if (label.startsWith("green2:")) return { green: true, notes: "" };
  if (label.startsWith("green:")) return { green: false, notes: "still failing" };
  if (label === "verify") return { tests_pass: true, gates_pass: true, output_tail: "" };
  throw new Error(`unexpected label: ${label}`);
};

// red / green とも 1 回目で成功する stub。
const happyAgentStub = (prompt, opts) => {
  const label = opts.label ?? "";
  if (label.startsWith("red:"))
    return { red_confirmed: true, test_files: ["t.test.js"], notes: "" };
  if (label.startsWith("green:")) return { green: true, notes: "" };
  if (label === "verify") return { tests_pass: true, gates_pass: true, output_tail: "" };
  throw new Error(`unexpected label: ${label}`);
};

test("model 指定時に Red / Green とその retry の 4 呼び出しへ伝播し Verify へは渡らない", async () => {
  const { calls } = await runWorkflow(codeJs, {
    args: { plan, repo: "", model: "sonnet" },
    stubs: { agent: retryingAgentStub },
  });

  const redGreen = calls.agent.filter((c) => /^(red|red2|green|green2):/.test(c.opts.label));
  assert.equal(redGreen.length, 4, "red / red2 / green / green2 の 4 呼び出しがある");
  for (const call of redGreen) {
    assert.equal(call.opts.model, "sonnet", `${call.opts.label} の opts に model: "sonnet" がある`);
  }

  const verify = calls.agent.find((c) => c.opts.label === "verify");
  assert.ok(verify, "verify 呼び出しがある");
  assert.ok(!("model" in verify.opts), "verify の opts に model キーが無い");
});

test("model 未指定で agent opts に model キーが存在せず既存呼び出し形が完走する", async () => {
  const { result, calls } = await runWorkflow(codeJs, {
    args: { plan, repo: "" },
    stubs: { agent: happyAgentStub },
  });

  for (const call of calls.agent) {
    assert.ok(!("model" in call.opts), `${call.opts.label} の opts に model キーが無い`);
  }
  assert.deepEqual(result.completed, ["U-1"], "completed に unit id が入る");
  assert.equal(result.tests_pass, true, "verify の tests_pass がそのまま返る");
});

test("静的 gate が JA / EN の code.js と tests/*.mjs で pass する", () => {
  const targets = [
    join(root, ".ja", "workflows", "code.js"),
    join(root, "workflows", "code.js"),
    join(root, ".ja", "workflows", "tests", "run-workflow.mjs"),
    join(root, "workflows", "tests", "run-workflow.mjs"),
    join(root, ".ja", "workflows", "tests", "code.model.test.mjs"),
    join(root, "workflows", "tests", "code.model.test.mjs"),
  ];
  for (const file of targets) {
    execFileSync("node", ["--check", file], { cwd: root });
  }
  execFileSync("npx", ["oxlint", ...targets], { cwd: root });
});
