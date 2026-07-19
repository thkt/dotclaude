// U-002: adrift workflow の per-DR scan で、routing 表が返す複数 reviewer のうち一部が
// stall (agent が null を返す) した時、その stall した reviewer 名を per-DR 結果へ記録する。
// 一次チャネルは workflow 返り値 result.skipped (WORKFLOWS.md)。Report 段へ渡る per-DR
// 直列化 (report agent prompt) は補助チャネルとして併せて固定する。
// contract: workflows/audit.js の per-unit skip accounting (reason "no output / stall" を持つ
// skipped 配列) に倣い、adrift では per-DR 結果へ per-item 記録を足し、全滅時のみ埋まる
// note を部分 stall でも埋める。
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const adriftJs = join(here, "..", "..", "adrift.js");

// manifest "rust" は routing 表で reviewer 2 件 (reviewer-rust + reviewer-design) を返す。
// 一方 (reviewer-rust) を null = stall、他方 (reviewer-design) を生存 (findings 空) にすると
// 部分 stall になる。extract は verifiable かつ candidates 非空で reviewer 段まで到達させる。
const agentStub = (prompt, opts) => {
  const label = opts && opts.label;
  if (label === "detect") {
    return {
      found: true,
      dr_dir: "docs/decisions",
      drs: [{ id: "0001", file: "docs/decisions/0001-x.md", title: "X" }],
      manifest: "rust",
      dr_refs: [],
    };
  }
  if (label === "extract:0001") {
    return {
      status: "Accepted",
      verifiable: true,
      outcome_text: "decision body",
      symbols: ["foo"],
      candidates: [{ symbol: "foo", file: "src/a.rs", line: 3 }],
      notes: "",
    };
  }
  if (label === "reviewer-rust:0001") return null; // stall
  if (label === "reviewer-design:0001") return { findings: [] }; // 生存
  if (label === "report") return { written: true, report_path: "docs/audit/x.md" };
  return undefined;
};

test("一部の reviewer agent が null を返す時、per-DR 結果に stall した reviewer 名が記録される", async () => {
  const { result, calls } = await runWorkflow(adriftJs, {
    args: {},
    stubs: { agent: agentStub },
  });

  // 一次チャネル: 返り値の result.skipped が per-DR の stall を喪失粒度 (DR id + reviewer 名 +
  // reason) で持つ
  assert.deepEqual(
    result.skipped,
    [{ id: "0001", skipped: [{ reviewer: "reviewer-rust", reason: "no output / stall" }] }],
    "result.skipped に stall した reviewer が DR id 付きで記録される",
  );
  // 部分 stall (生存 reviewer あり) は unverifiable には数えない
  assert.deepEqual(result.unverifiable, [], "部分 stall の DR は verifiable のまま");

  // 補助チャネル: Report 段の prompt に直列化される per-DR 結果にも同じ記録が残る
  const reportCall = calls.agent.find((c) => c.opts && c.opts.label === "report");
  assert.ok(reportCall, "Report 段の agent が呼ばれる");
  const matched = reportCall.prompt.match(
    /Per-DR 結果は次のとおり。\n([\s\S]*?)\n\nExternal DR 参照/,
  );
  assert.ok(matched, "report prompt に per-DR 結果の直列化が含まれる");
  const perDr = JSON.parse(matched[1]);
  const entry = perDr.find((d) => d.id === "0001");
  assert.ok(entry, "per-DR 結果に対象 DR 0001 が含まれる");
  assert.deepEqual(
    entry.skipped,
    [{ reviewer: "reviewer-rust", reason: "no output / stall" }],
    "stall した reviewer 名 reviewer-rust が per-DR 結果に記録される",
  );
});
