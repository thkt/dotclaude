#!/usr/bin/env node
/// <reference types="node" />
// Usage: snapshot.ts   (audit payload JSON on stdin)
//
// audit の 1 実行を $HOME/.claude/history/audit-<YYYY-MM-DD-HHMMSS>.json に記録する。
//
// stdin:  JSON {scope, focus, pre_flight, raw_findings[], findings[], skipped[],
//         challenge_ran, verify_ran, tally, needs_context[], zero_reviewer_files[]}
//         各 raw_findings entry は最低限 {file, message} を持ち、triage を通った後は
//         {id, reviewer, verdict} も持つ。
//         キーは record にそのまま写す。無いキーは無いまま。
// stdout: JSON 1 行、{path, counts}。counts はこのプロセスが serialize した各配列の
//         要素数を持つ。
// exit 0 は成功。exit 1 は payload が parse 不能 (何も書かない)。
//
// record に追加される解決済みフィールド:
//   branch        git rev-parse --abbrev-ref HEAD ("unknown" にフォールバック)
//   generated_at  UTC ISO-8601
//
// 置き換え元の Python 版 audit recorder の TypeScript 移植。
// Contract: この CLI 自身の挙動。workflows/audit/tests/snapshot.test.ts が、固定 fixture
// workflows/audit/tests/fixtures/snapshot-cases.json に対してエンドツーエンドで検査する。
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { historyPath, isoTimestamp, parsePayload } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

export const COUNTED_ARRAYS = [
  "raw_findings",
  "findings",
  "skipped",
  "needs_context",
  "zero_reviewer_files",
] as const;

/** `git rev-parse --abbrev-ref HEAD`。非 0 終了時や spawn 自体のエラー (PATH に git が無い)
 * では "unknown" にフォールバックする。Python 版の git_branch を写す。
 * Python 版の subprocess.run(timeout=10) と同じく 10s の timeout で走らせる。 */
export function gitBranch(): string {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.error || result.status !== 0) return "unknown";
  const branch = result.stdout.trim();
  return branch || "unknown";
}

/** 無いキーは省かず 0 と数える。呼び出し元が毎回同じキー集合を読めるので、配列が丸ごと
 * 落ちた場合もフィールドの欠落でなく件数の不一致として出る。Python 版の
 * counted_arrays を写す。 */
export function countedArrays(record: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of COUNTED_ARRAYS) {
    const value = record[key];
    counts[key] = Array.isArray(value) ? value.length : 0;
  }
  return counts;
}

/** disk に書く record: payload 自身のキーを元の順序のまま持ち、続けて `branch`、
 * `generated_at` を加える。Python 版の build_record を写す。 */
export function buildRecord(
  payload: Record<string, unknown>,
  branch: string,
  generatedAt: string,
): Record<string, unknown> {
  return { ...payload, branch, generated_at: generatedAt };
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const { payload, message } = parsePayload(raw);
  if (payload === null) {
    process.stderr.write(`${message}\n`);
    return 1;
  }

  // 1 つの `now` が record の generated_at と record file 自身の timestamp 部分の両方に
  // 供給されるため、常に両者は一致する。Python 版の単一の `now` を写す。
  const now = new Date();
  const generatedAt = isoTimestamp(now);
  const stamp = generatedAt.replace(/:/g, "").replace("T", "-").replace("Z", "");

  const record = buildRecord(payload, gitBranch(), generatedAt);

  // historyPath は $HOME/.claude/history の存在を保証し full path を返す。
  // workflows/build/record.ts が自分の history file に使うのと同じ flow -- この recorder
  // との違いは `name` が固定の .jsonl 名ではなく run ごとに発行される点だけ。
  const outPath = historyPath(homedir(), `audit-${stamp}.json`);
  writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`);

  const output = { path: outPath, counts: countedArrays(record) };
  process.stdout.write(`${JSON.stringify(output)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
