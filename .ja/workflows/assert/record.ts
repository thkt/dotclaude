#!/usr/bin/env node
/// <reference types="node" />
// Usage: record.ts   (assert の run payload JSON を stdin で受ける)
//
// $HOME/.claude/history/assert-runs.jsonl に assert run を 1 行追記する。
//
// stdin:  JSON {gate, gate_reason, build, tests, mode, issue_counts, dropped_findings}
//         各キーはそのまま行にコピーする。assert は 1 run 1 line (build と違い、行を
//         結び付ける run_id は無い) なので、行は payload が渡した以外の default を持たない。
// stdout: JSON 1 行、{path}。
// exit 0 は成功。exit 1 は payload が parse できないとき (何も書き込まない)。
//
// 解決して行に加えるフィールド:
//   generated_at  UTC ISO-8601
//
// 置き換え元の Python 版 assert recorder の TypeScript 移植。Contract: この CLI 自身の挙動。
// workflows/assert/tests/record.test.ts が、固定 fixture workflows/assert/tests/fixtures/record-cases.json
// に対してエンドツーエンドで検査する。
import { appendFileSync, readFileSync } from "node:fs";
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

  const runsPath = historyPath(homedir(), "assert-runs.jsonl");

  const row: Record<string, unknown> = {
    ...payload,
    generated_at: isoTimestamp(),
  };
  appendFileSync(runsPath, `${JSON.stringify(row)}\n`);

  process.stdout.write(`${JSON.stringify({ path: runsPath })}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
