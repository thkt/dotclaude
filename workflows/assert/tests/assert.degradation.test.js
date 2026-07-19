// U-004: assert workflow の adversarial stage stall を result.adversarial に記録する。
// T-004 adversarial agent が null を返した (stall) 時、result.adversarial が stall を示し、
//        adversarial が生存しつつテスト 0 件を書いた (genuine no-tests) 場合と区別できる。
// contract: workflows/assert.js の adversarialSummary shape (total / passed / failed /
// promoted / excluded) に従い、stall・未実行を示すフィールドを summary へ足す。adrift.js /
// shake.js の per-item stall accounting に倣い、structured token は英語 "no output / stall"
// で持つ (shake.js の smellScan と同じ)。EN 版と .ja 版でこの構造トークンは同一のため、本
// test は localized prose でなく返り値の構造トークンだけを検査し、EN/.ja で同一内容にする。
//
// stall marker は「stall した時だけ現れる文字列フィールド」を前提にする (shake.js の
// `...(shaken.smellScan ? { smellScan } : {})` と同じ pattern)。genuine no-tests には
// 当該フィールドが無いことを負側 assertion で要求するため、Green が `stall: false` の
// ような常時 present な boolean を足すと負側が誤って落ちる。stall は文字列トークンで、
// stall 時のみ emit する — これが本 test が Green に課す契約。
//
// adversarial stage は run 全体で 1 agent (per-target ではない) なので、区別の検証には
// 2 回の workflow 実行 (stall / genuine no-tests) を並べて比較する。bootstrap は
// worktree_ok / install ok / build pass を返して dynamicOk を真にし、adversarial agent が
// 実際に呼ばれる (= その null 返却が env skip でなく agent stall を表す) ようにする。
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const assertJs = join(here, "..", "..", "assert.js");

// dynamicOk を真にする bootstrap 返り値 (worktree_ok true / install ok / build pass)。
const bootOk = {
  codex_available: true,
  mode: "target",
  diff_kind: "",
  scope_files: ["src/foo.js"],
  outcome: "absent",
  worktree_ok: true,
  worktree_path: "/tmp/assert-wt",
  install: "ok",
  build: "pass",
  reason: "",
};

// adversarial 以外の全 stage を通す最小 agent stub。advReturn を adversarial stage の
// 返り値に差し込む (null = stall、{ ran: true, tests: [] } = genuine no-tests)。
const makeAgent = (advReturn) => (prompt, opts) => {
  const label = opts && opts.label;
  if (label === "bootstrap") return bootOk;
  if (label === "test-exec") return { outcome: "pass", passed: 1, failed: 0 };
  if (label === "adversarial") return advReturn;
  if (label === "codex-review") return { ran: true, findings: [] };
  if (label === "synthesize") return { issues: [], root_causes: [], report: "ok" };
  if (label === "cleanup") return {};
  return undefined;
};

test("adversarial agent が null を返す時、result.adversarial が stall を示しテスト 0 件と区別できる", async () => {
  const stallRun = await runWorkflow(assertJs, {
    args: {},
    stubs: { agent: makeAgent(null) }, // adversarial agent stall
  });
  const zeroRun = await runWorkflow(assertJs, {
    args: {},
    stubs: { agent: makeAgent({ ran: true, tests: [] }) }, // 生存・テスト 0 件
  });

  const stallAdv = stallRun.result && stallRun.result.adversarial;
  const zeroAdv = zeroRun.result && zeroRun.result.adversarial;
  assert.ok(stallAdv, "stall 時も result.adversarial が返る");
  assert.ok(zeroAdv, "genuine no-tests 時も result.adversarial が返る");

  const stallText = JSON.stringify(stallAdv);
  const zeroText = JSON.stringify(zeroAdv);

  assert.ok(
    /stall|no output/i.test(stallText),
    "adversarial agent が stall した時 result.adversarial に stall marker が記録される",
  );
  assert.ok(
    !/stall|no output/i.test(zeroText),
    "genuine no-tests には stall marker が無く、stall と 0 件を区別できる",
  );
});
