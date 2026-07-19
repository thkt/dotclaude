// U-002: when some of the reviewers returned by the routing table stall (agent returns null)
// during adrift's per-DR scan, the stalled reviewer names are recorded in the per-DR result.
// The primary channel is the workflow return value result.skipped (WORKFLOWS.md). The per-DR
// serialization passed to the Report stage (report agent prompt) is pinned as the auxiliary
// channel alongside it.
// contract: follows workflows/audit.js's per-unit skip accounting (a skipped array whose
// reason is "no output / stall"); adrift adds per-item records to the per-DR result and fills
// the note on a partial stall, not only on a total wipeout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const adriftJs = join(here, "..", "..", "adrift.js");

// manifest "rust" resolves to 2 reviewers (reviewer-rust + reviewer-design) in the routing
// table. Making one (reviewer-rust) null = stall and the other (reviewer-design) alive
// (empty findings) produces a partial stall. extract is verifiable with non-empty candidates
// so the flow reaches the reviewer stage.
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
  if (label === "reviewer-design:0001") return { findings: [] }; // alive
  if (label === "report") return { written: true, report_path: "docs/audit/x.md" };
  return undefined;
};

test("一部の reviewer agent が null を返す時、per-DR 結果に stall した reviewer 名が記録される", async () => {
  const { result, calls } = await runWorkflow(adriftJs, {
    args: {},
    stubs: { agent: agentStub },
  });

  // Primary channel: the return value's result.skipped carries the per-DR stall at loss
  // granularity (DR id + reviewer name + reason)
  assert.deepEqual(
    result.skipped,
    [{ id: "0001", skipped: [{ reviewer: "reviewer-rust", reason: "no output / stall" }] }],
    "result.skipped に stall した reviewer が DR id 付きで記録される",
  );
  // A partial stall (some reviewer alive) does not count as unverifiable
  assert.deepEqual(result.unverifiable, [], "部分 stall の DR は verifiable のまま");

  // Auxiliary channel: the per-DR result serialized into the Report stage prompt carries the
  // same record
  const reportCall = calls.agent.find((c) => c.opts && c.opts.label === "report");
  assert.ok(reportCall, "Report 段の agent が呼ばれる");
  const matched = reportCall.prompt.match(
    /per-DR results are as follows\.\n([\s\S]*?)\n\nThe external DR references/,
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
