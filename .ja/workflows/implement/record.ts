#!/usr/bin/env node
/// <reference types="node" />
// Usage: record.ts   (implement の run payload JSON を stdin で受ける)
//
// $HOME/.claude/history/implement-runs.jsonl に implement run を 1 行追記する。
//
// stdin:  JSON {issue, repo, branch, reason, run_id?, ...}。各キーはそのまま行にコピーする。
// stdout: JSON 1 行、{path, run_id}。呼び出し側は同じ run の終端行に run_id を渡し返し、
//         開始行と終端行を結び付ける。
// exit 0 は成功。exit 1 は payload が parse できないとき (何も書き込まない)。
//
// 解決して行に加えるフィールド:
//   run_id        uuid4 の hex。payload に空でない文字列が無いときだけ発行する。
//   generated_at  UTC ISO-8601
import { appendFileSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { historyPath, isoTimestamp, parsePayload } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const { payload, message } = parsePayload(raw);
  if (payload === null) {
    process.stderr.write(`${message}\n`);
    return 1;
  }

  const { run_id: suppliedRunId, ...rest } = payload;
  const runId =
    typeof suppliedRunId === "string" && suppliedRunId !== ""
      ? suppliedRunId
      : randomUUID().replace(/-/g, "");

  const runsPath = historyPath(homedir(), "implement-runs.jsonl");
  const row = { run_id: runId, ...rest, generated_at: isoTimestamp() };
  appendFileSync(runsPath, `${JSON.stringify(row)}\n`);

  process.stdout.write(`${JSON.stringify({ path: runsPath, run_id: runId })}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
