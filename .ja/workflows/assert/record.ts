#!/usr/bin/env node
/// <reference types="node" />
// Usage: record.ts   (assert run payload JSON on stdin)
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
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

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

  const historyDir = join(homedir(), ".claude", "history");
  const runsPath = join(historyDir, "assert-runs.jsonl");
  mkdirSync(historyDir, { recursive: true });

  const row: Record<string, unknown> = {
    ...payload,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  appendFileSync(runsPath, `${JSON.stringify(row)}\n`);

  process.stdout.write(`${JSON.stringify({ path: runsPath })}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
