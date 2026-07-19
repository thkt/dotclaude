// polish の diff fallback: scope 省略時は uncommitted な変更、無ければ base...HEAD (push 済み branch diff)。
// codex agent が返す diff_kind に応じて fix / cleanup の対象 diff が切り替わることをテストで固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const polishJs = join(here, "..", "..", "polish.js");

// Review -> Challenge -> Fix -> Cleanup を通す最小 stub。diff_kind だけ差し替える。
const agentStub = (diffKind) => (prompt, opts) => {
  const label = opts && opts.label;
  if (label === "codex") {
    return {
      available: true,
      has_changes: true,
      diff_kind: diffKind,
      findings: [{ id: "F1", title: "finding title", detail: "finding detail", severity: "P1" }],
    };
  }
  if (label === "challenge") {
    return { verdicts: [{ id: "F1", verdict: "confirmed" }] };
  }
  if (label === "fix") {
    return { fixed: ["F1 fixed"], stashed: [], tests_pass: true };
  }
  if (label === "validate") {
    return { edits: [], tests_pass: true, stashed: false };
  }
  return undefined;
};

const promptOf = (calls, label) => calls.agent.find((c) => c.opts && c.opts.label === label).prompt;

test("scope 省略時の Review prompt に branch fallback 判定と --base 実行が含まれる", async () => {
  const { calls } = await runWorkflow(polishJs, {
    args: {},
    stubs: { agent: agentStub("branch") },
  });
  const review = promptOf(calls, "codex");
  assert.match(review, /git rev-list --count main\.\.HEAD/, "rev-list による先行 commit 判定");
  assert.match(review, /codex review --base main/, "branch diff は --base で codex 実行");
});

test("diff_kind: branch のとき fix と cleanup の対象が base...HEAD になる", async () => {
  const { calls, result } = await runWorkflow(polishJs, {
    args: {},
    stubs: { agent: agentStub("branch") },
  });
  assert.match(promptOf(calls, "fix"), /git diff main\.\.\.HEAD/, "fix の対象は branch diff");
  assert.match(promptOf(calls, "simplify"), /main\.\.\.HEAD/, "cleanup の対象は branch diff");
  assert.equal(result.diff_kind, "branch", "返り値に diff_kind が出る");
});

test("diff_kind: uncommitted のとき fix の対象が git diff HEAD のままである", async () => {
  const { calls } = await runWorkflow(polishJs, {
    args: {},
    stubs: { agent: agentStub("uncommitted") },
  });
  assert.match(promptOf(calls, "fix"), /git diff HEAD/);
});

test("base 指定が Review / Fix の prompt に伝播する", async () => {
  const { calls } = await runWorkflow(polishJs, {
    args: { base: "develop" },
    stubs: { agent: agentStub("branch") },
  });
  assert.match(promptOf(calls, "codex"), /codex review --base develop/);
  assert.match(promptOf(calls, "fix"), /git diff develop\.\.\.HEAD/);
});
