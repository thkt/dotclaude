// U-005: code.js の red-failed 終端 return が why で理由を伝える。
// T-005 red agent が null を返す時、stopped が red-failed の返り値に why が含まれる。
// contract: workflows/code.js の unit-failed 終端 return (why "the implement agent returned
// no result") に従い、red-failed の終端 return へ同型の why を追加する。why の文字列値は
// EN/JA で localized される (EN "the ... returned no result" / JA "... が結果を返さなかった")
// ため、本 test は文字列内容でなく why の存在・型と stopped トークン ("red-failed") だけを
// 検査し、EN 版と .ja 版で同一内容にする。
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const codeJs = join(here, "..", "..", "code.js");

// tests を持つ unit は Red -> Green 経路を通る。red agent が null を返すと red2 は呼ばれず
// (red && !red.red_confirmed が短絡)、if (!red) が red-failed の終端 return を発火させる。
const plan = {
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

// red: label で null を返し、red agent が結果を返さない状況を再現する。
const redNullStub = (prompt, opts) => {
  const label = opts.label ?? "";
  if (label.startsWith("red:")) return null;
  throw new Error(`unexpected label: ${label}`);
};

test("red agent が null を返す時、stopped が red-failed の返り値に why が含まれる", async () => {
  const { result } = await runWorkflow(codeJs, {
    args: { plan, repo: "" },
    stubs: { agent: redNullStub },
  });
  assert.equal(result.stopped, "red-failed", "red が null なら red-failed で停止する");
  assert.ok(result.why, "red-failed の返り値に why が含まれる");
  assert.equal(typeof result.why, "string", "why は理由を伝える文字列");
});
