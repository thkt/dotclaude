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
// TypeScript port of workflows/assert/record.py (Python 版). Contract: this CLI's own
// behavior, exercised end to end by workflows/assert/tests/record.test.ts against the frozen
// fixture workflows/assert/tests/fixtures/record-cases.json.
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
