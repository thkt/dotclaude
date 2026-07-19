// U-003: shake workflow の per-target 結果に degradation を記録する。
// T-002 smell stage が stall (agent が null を返す) した時、その stall を per-target 結果へ
//        記録し、smells が空でも genuine な stable 判定と区別できるようにする。
// T-003 pipeline で target が null に落ちた時、最終返り値に drop された target の id を残す。
// contract: workflows/shake.js の per-target 結果 shape (dimResults / smells / fix) に従い、
// workflows/adrift.js / workflows/audit.js の per-item stall accounting (reason "no output /
// stall" を持つ skipped 配列、drop された unit の id 列挙) に倣う。EN/JA どちらの shake.js も
// この structured field 値は英語で持つ (adrift.js の `reason: "no output / stall"` が両版で同一)
// ため、本 test は prompt の localized 文字列でなく返り値の構造トークンだけを検査し、
// EN 版と .ja 版で同一内容にする。
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const shakeJs = join(here, "..", "..", "shake.js");

// T-002 は run-workflow.js 注入の既定 pipeline (失敗 item をその位置に null で残す、本番契約の
// 写し) をそのまま使う。T-003 は「pipeline が target を null に落とした」状況を決定的に再現する
// ため、dropIds の target を stage に通さず null にする stub を stubs.pipeline で差し込む。
const dropPipeline = (dropIds) => async (items, stage1, stage2) => {
  const out = [];
  for (const it of items) {
    if (dropIds.includes(it.id)) {
      out.push(null);
      continue;
    }
    out.push(await stage2(await stage1(it), it));
  }
  return out;
};

const RUNS = 10;
const passRuns = () => ({
  ran: true,
  runs: Array.from({ length: RUNS }, () => ({ pass: true })),
  notes: "",
});
const fourDimCommands = { repeat: "cmd", order: "cmd", parallelism: "cmd", seed: "cmd" };

test("smell agent が null を返す時、per-target 結果が smell stage の stall を記録し stable 判定と区別できる", async () => {
  // 2 target。t-alpha は smell agent が stall (null)、t-beta は smell が生存 (smells 空)。
  // どちらも 4 dimension は全 pass = stable なので、script 分類はどちらも "stable" になる。
  // stall を記録しない現状では両者の per-target 結果は見分けられない。id は discriminator
  // トークン (stall / no output) を含まない中立名にし、id 自体への誤マッチを避ける。
  const agentStub = (prompt, opts) => {
    const label = opts && opts.label;
    if (label === "route") {
      return {
        ecosystem: "jest",
        targets: [
          { id: "t-alpha", file: "a.test.js", commands: fourDimCommands },
          { id: "t-beta", file: "b.test.js", commands: fourDimCommands },
        ],
        reason: "",
      };
    }
    if (label === "smell:t-alpha") return null; // stall
    if (label === "smell:t-beta") return { smells: [] }; // 生存・smell なし
    if (label && label.startsWith("shake:")) return passRuns(); // 全 dimension stable
    return undefined;
  };

  const { result } = await runWorkflow(shakeJs, { args: {}, stubs: { agent: agentStub } });
  assert.ok(result && Array.isArray(result.targets), "workflow が per-target 結果配列を返す");
  const stalled = result.targets.find((t) => t.id === "t-alpha");
  const stable = result.targets.find((t) => t.id === "t-beta");
  assert.ok(
    stalled && stable,
    "stall した target と genuine stable な target が両方 result に残る",
  );

  const stalledText = JSON.stringify(stalled);
  const stableText = JSON.stringify(stable);
  assert.ok(
    /stall|no output/i.test(stalledText),
    "smell stage が stall した target の per-target 結果に stall が記録される",
  );
  assert.ok(
    !/stall|no output/i.test(stableText),
    "genuine stable な target には stall marker が無く、stall と stable を区別できる",
  );
});

test("pipeline で target が null に落ちた時、最終返り値に drop された target の id が記録される", async () => {
  const agentStub = (prompt, opts) => {
    const label = opts && opts.label;
    if (label === "route") {
      return {
        ecosystem: "jest",
        targets: [
          { id: "t-keep", file: "keep.test.js", commands: fourDimCommands },
          { id: "t-drop", file: "drop.test.js", commands: fourDimCommands },
        ],
        reason: "",
      };
    }
    if (label === "smell:t-keep") return { smells: [] };
    if (label && label.startsWith("shake:t-keep:")) return passRuns();
    return undefined; // t-drop は pipeline で短絡され agent へ到達しない
  };

  const { result } = await runWorkflow(shakeJs, {
    args: {},
    stubs: { agent: agentStub, pipeline: dropPipeline(["t-drop"]) },
  });
  assert.ok(result && Array.isArray(result.targets), "workflow が結果オブジェクトを返す");
  const survivingIds = result.targets.map((t) => t.id);
  assert.deepEqual(survivingIds, ["t-keep"], "drop されなかった target だけが targets に残る");

  assert.ok(
    JSON.stringify(result).includes("t-drop"),
    "最終返り値に drop された target の id t-drop が記録される",
  );
});
