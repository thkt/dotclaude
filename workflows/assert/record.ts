#!/usr/bin/env node
/// <reference types="node" />
// Usage: record.ts   (assert run payload JSON on stdin)
//
// Append one assert run to $HOME/.claude/history/assert-runs.jsonl.
//
// stdin:  JSON {gate, gate_reason, build, tests, mode, issue_counts, dropped_findings}
//         Every key is copied to the row verbatim. assert is 1 run 1 line (unlike
//         build, no run_id joins rows), so the row carries no defaults beyond what
//         the payload supplies.
// stdout: one line of JSON, {path}.
// exit 0 on success. exit 1 on an unparseable payload (nothing written).
//
// Resolved fields, added to the row:
//   generated_at  UTC ISO-8601
//
// TypeScript port of the Python assert recorder it replaces. Contract: this CLI's own
// behavior, exercised end to end by workflows/assert/tests/record.test.ts against the frozen
// fixture workflows/assert/tests/fixtures/record-cases.json.
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
