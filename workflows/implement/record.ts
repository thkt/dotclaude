#!/usr/bin/env node
/// <reference types="node" />
// Usage: record.ts   (implement run payload JSON on stdin)
//
// Append one implement run row to $HOME/.claude/history/implement-runs.jsonl.
//
// stdin:  JSON {issue, repo, branch, reason, run_id?, ...}. Every key is copied to the row verbatim.
// stdout: one line of JSON, {path, run_id}. The caller passes run_id back on the run's terminal
//         row, which joins the start row to the terminal row.
// exit 0 on success. exit 1 on an unparseable payload (nothing written).
//
// Resolved fields, added to the row:
//   run_id        uuid4 hex, minted only when the payload carries no non-empty string.
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
