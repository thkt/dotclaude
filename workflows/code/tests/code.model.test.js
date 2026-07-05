// U-003: behavior test that code.js propagates an optional input.model only to the
// Red / Green implementation agents.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
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

// red / green fail on the first call to fire the retries (red2 / green2), so all
// 4 calls (red, red2, green, green2) get captured.
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
    // A model distinct from Verify's fixed sonnet, so the assertions below can
    // tell input.model propagation apart from the fixed value.
    args: { plan, repo: "", model: "haiku" },
    stubs: { agent: retryingAgentStub },
  });

  const redGreen = calls.agent.filter((c) => /^(red|red2|green|green2):/.test(c.opts.label));
  assert.equal(redGreen.length, 4, "red / red2 / green / green2 calls are all present");
  for (const call of redGreen) {
    assert.equal(call.opts.model, "haiku", `${call.opts.label} opts carries model: "haiku"`);
  }

  const verify = calls.agent.find((c) => c.opts.label === "verify");
  assert.ok(verify, "verify call is present");
  assert.equal(
    verify.opts.model,
    "sonnet",
    "verify opts carries the fixed sonnet, not input.model",
  );
});

test("model 未指定で Red / Green の opts に model キーが存在せず既存呼び出し形が完走する", async () => {
  const { result, calls } = await runWorkflow(codeJs, {
    args: { plan, repo: "" },
    stubs: { agent: happyAgentStub },
  });

  for (const call of calls.agent) {
    if (call.opts.label === "verify") {
      assert.equal(call.opts.model, "sonnet", "verify opts carries the fixed sonnet");
      continue;
    }
    assert.ok(!("model" in call.opts), `${call.opts.label} opts has no model key`);
  }
  assert.deepEqual(result.completed, ["U-1"], "completed contains the unit id");
  assert.equal(result.tests_pass, true, "verify tests_pass is returned as-is");
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
