// The agent tool's schema guarantees the shape of a Red / Green result, not the type of each
// field. A string such as "false" is truthy, so `if (!red.red_confirmed)` would let it through.
// code.js checks the type before trusting the value and returns stopped: "result-type-mismatch"
// (issue #367).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.ts";

const here = dirname(fileURLToPath(import.meta.url));
const codeJs = join(here, "..", "..", "code.js");

const tddPlan = {
  test_command: "echo test",
  units: [
    {
      id: "U-1",
      goal: "sample goal",
      files: ["sample.js"],
      contract: "sample contract",
      tests: [{ id: "T-001", name: "sample spec statement" }],
    },
  ],
};

// An undefined label throws, so an unexpected call cannot return undefined and pass unnoticed.
const stubWith = (responses) => (prompt, opts) => {
  const label = opts.label ?? "";
  if (label === "verify") return { tests_pass: true, gates_pass: true, output_tail: "" };
  if (typeof responses[label] === "function") return responses[label]();
  throw new Error(`unexpected label: ${label}`);
};

test("T-015 a red_confirmed that is not a boolean returns stopped", async () => {
  const { result } = await runWorkflow(codeJs, {
    args: { plan: tddPlan, repo: "/abs/target-repo" },
    stubs: {
      agent: stubWith({
        "red:U-1": () => ({
          red_confirmed: "false",
          test_files: [],
          notes: "",
          evidence: [],
        }),
        "green:U-1": () => ({ green: true, notes: "", deferred: [] }),
      }),
    },
  });

  assert.equal(
    result.stopped,
    "result-type-mismatch",
    "a non-boolean red_confirmed stops the run instead of being coerced by truthiness",
  );
  assert.equal(typeof result.why, "string", "the stopped return states why in a string");
  assert.ok(result.why.length > 0, "why is not empty");
  assert.ok(
    !(result.completed || []).includes("U-1"),
    "the unit never reaches completed when its type is wrong",
  );
});

test("T-016 a green that is not a boolean returns stopped", async () => {
  const { result } = await runWorkflow(codeJs, {
    args: { plan: tddPlan, repo: "/abs/target-repo" },
    stubs: {
      agent: stubWith({
        "red:U-1": () => ({
          red_confirmed: true,
          test_files: ["t.test.js"],
          notes: "",
          evidence: [],
        }),
        "green:U-1": () => ({ green: "true", notes: "", deferred: [] }),
      }),
    },
  });

  assert.equal(
    result.stopped,
    "result-type-mismatch",
    "a non-boolean green stops the run instead of being coerced by truthiness",
  );
  assert.equal(typeof result.why, "string", "the stopped return states why in a string");
  assert.ok(result.why.length > 0, "why is not empty");
  assert.ok(
    !(result.completed || []).includes("U-1"),
    "the unit never reaches completed when its type is wrong",
  );
});
