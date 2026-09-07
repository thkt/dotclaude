#!/usr/bin/env node
/// <reference types="node" />
// Usage: record.ts   (build run payload JSON on stdin)
//
// $HOME/.claude/history/build-runs.jsonl に build run を 1 行追記する。
//
// stdin:  JSON {issue, repo, branch, reason, plan_quality, run_id?, nested_reason?}
//         各キーはそのまま行にコピーする。"?" の付かない 5 つは、無ければ空の default で
//         埋める。どの行も同じキー集合で読めるようにするため。
// stdout: JSON 1 行、{path, run_id, started, stops, trigger_met, skipped_lines}。
//         呼び出し側は同じ build の次の行に run_id を渡し返す。それが stop 行を start 行へ
//         結び付ける仕組みになる。started/stops/trigger_met/skipped_lines は、追記後に
//         RUNS_PATH を読み直して数える。読み直せない history (権限、競合) はこの 4 キーを
//         落とすが、path と run_id は常に出力する。
// exit 0 は成功。exit 1 は payload が parse できないとき (何も書き込まない)。
//
// 解決して行に加えるフィールド:
//   run_id        uuid4 の hex。payload に無いときだけ発行する。build は同じ秒の中で
//                 start して stop しうるため、timestamp では両者を区別できない。
//   generated_at  UTC ISO-8601
//
// Window count、stdout にのみ加える (行には書かない):
//   started       直近 WINDOW_SIZE 件の reason=="started" 行の件数。この run 自身の追記後に
//                 RUNS_PATH を読み直して数える。
//   stops         plan_quality==true の stop 行 (reason != "started") のうち、run_id が
//                 それらの started 行のいずれかである件数。つまり現在の window 内の stop。
//   trigger_met   stops >= STOP_TRIGGER。
//   skipped_lines RUNS_PATH の行のうち JSON object として parse できなかった行数。
//
// workflows/build/record.py (Python 版) の TypeScript 移植。Contract: この CLI 自身の挙動。
// workflows/build/tests/record.test.ts が、固定 fixture workflows/build/tests/fixtures/record-cases.json
// に対してエンドツーエンドで検査する。
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

// Plan-quality の stop は全履歴ではなく直近の build の連なりに固まって出るため、count は
// ファイル全体ではなく直近の started run の trailing window に絞る。
const WINDOW_SIZE = 20;
const STOP_TRIGGER = 3;

// start 行はまだ自分の branch を知らない。キーを落とすと読み手が行の種類で分岐することに
// なるため、代わりに default で埋める。
const DEFAULTS: Record<string, unknown> = {
  issue: "",
  repo: "",
  branch: "",
  reason: "",
  plan_quality: false,
};

interface WindowCounts {
  started: number;
  stops: number;
  trigger_met: boolean;
  skipped_lines: number;
}

/** `path` (この run が今しがた追記した path そのもの) を読み直し、直近の started run の
 * trailing window 内にある plan-quality stop を数える。読み直しさえできないとき
 * (権限、run 途中での削除) は null を返す。呼び出し側はこの count を advisory 扱いとし、
 * run を失敗させる代わりに stdout からこれらのキーを省く。 */
export function countPlanQualityStops(path: string): WindowCounts | null {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return null;
  }

  const rows: Record<string, unknown>[] = [];
  let skippedLines = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      skippedLines += 1;
      continue;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      skippedLines += 1;
      continue;
    }
    rows.push(parsed as Record<string, unknown>);
  }

  // run_id は自分の started 行が現れた時点で window に 1 度だけ入る。同じ run_id の後の stop は、
  // その started 行が window から外れるまで (それより WINDOW_SIZE 件多く後の run が start する
  // まで) window 内に留まりうる。
  const startedIds: unknown[] = [];
  for (const row of rows) {
    if (row.reason === "started") {
      startedIds.push(row.run_id);
      if (startedIds.length > WINDOW_SIZE) startedIds.shift();
    }
  }
  const windowIds = new Set(startedIds);

  let stops = 0;
  for (const row of rows) {
    if (row.reason !== "started" && row.plan_quality === true && windowIds.has(row.run_id)) {
      stops += 1;
    }
  }

  return {
    started: startedIds.length,
    stops,
    trigger_met: stops >= STOP_TRIGGER,
    skipped_lines: skippedLines,
  };
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  let loaded: unknown;
  try {
    loaded = JSON.parse(raw);
  } catch (error) {
    process.stderr.write(
      `Error: unparseable payload: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }
  if (typeof loaded !== "object" || loaded === null || Array.isArray(loaded)) {
    process.stderr.write("Error: payload must be a JSON object\n");
    return 1;
  }
  const payload = loaded as Record<string, unknown>;

  const { run_id: suppliedRunId, ...rest } = payload;
  // build は同じ秒の中で start して stop しうるため、timestamp では両者を区別できない。
  // stop 行を自分の start 行へ結び付けるのは run_id である。
  const runId = suppliedRunId ? String(suppliedRunId) : randomUUID().replace(/-/g, "");

  const historyDir = join(homedir(), ".claude", "history");
  const runsPath = join(historyDir, "build-runs.jsonl");
  mkdirSync(historyDir, { recursive: true });

  const row: Record<string, unknown> = {
    run_id: runId,
    ...DEFAULTS,
    ...rest,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  appendFileSync(runsPath, `${JSON.stringify(row)}\n`);

  const output: Record<string, unknown> = { path: runsPath, run_id: runId };
  // 広く catch する: ここで想定外が起きても path/run_id は stdout に届かせる。
  let counts: WindowCounts | null;
  try {
    counts = countPlanQualityStops(runsPath);
  } catch {
    counts = null;
  }
  if (counts !== null) {
    Object.assign(output, counts);
  }
  process.stdout.write(`${JSON.stringify(output)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
