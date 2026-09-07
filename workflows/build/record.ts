#!/usr/bin/env node
/// <reference types="node" />
// Usage: record.ts   (build run payload JSON on stdin)
//
// Append one build run to $HOME/.claude/history/build-runs.jsonl.
//
// stdin:  JSON {issue, repo, branch, reason, plan_quality, run_id?, nested_reason?}
//         Every key is copied to the row verbatim. The five without a "?" are filled with
//         an empty default when absent, so every row reads with the same key set.
// stdout: one line of JSON, {path, run_id, started, stops, trigger_met, skipped_lines}.
//         The caller passes run_id back on the next row of the same build, which is how a
//         stop row joins its start row. started/stops/trigger_met/skipped_lines are counted
//         by re-reading RUNS_PATH after the append; a history the process cannot read back
//         (permissions, a race) drops those four keys but path and run_id are always printed.
// exit 0 on success. exit 1 on an unparseable payload (nothing written).
//
// Resolved fields, added to the row:
//   run_id        uuid4 hex, minted only when the payload carries none. A build can start
//                 and stop within the same second, so a timestamp cannot separate the two.
//   generated_at  UTC ISO-8601
//
// Window count, added to stdout only (not written to the row):
//   started       count of reason=="started" rows in the last WINDOW_SIZE such rows, read
//                 back from RUNS_PATH after this run's own append.
//   stops         count of plan_quality==true stop rows (reason != "started") whose run_id
//                 is one of those started rows, i.e. a stop inside the current window.
//   trigger_met   stops >= STOP_TRIGGER.
//   skipped_lines count of lines in RUNS_PATH that do not parse as a JSON object.
//
// TypeScript port of the Python build recorder it replaces. Contract: this CLI's own
// behavior, exercised end to end by workflows/build/tests/record.test.ts against the frozen
// fixture workflows/build/tests/fixtures/record-cases.json.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

// Plan-quality stops cluster in a run of recent builds rather than over all history, so the
// count is scoped to a trailing window of started runs instead of the whole file.
const WINDOW_SIZE = 20;
const STOP_TRIGGER = 3;

// A start row does not know its branch yet. Dropping the key would make the reader branch on
// the kind of row, so the defaults fill it instead.
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

/** Re-read `path` (the same path this run just appended to) and count plan-quality stops
 * inside the trailing window of started runs. Returns null when the file cannot even be read
 * back (permissions, removed mid-run); the caller then omits these keys from stdout rather
 * than failing the run over a count that is advisory only. */
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

  // A run_id enters the window once, when its started row is seen, so a later stop for
  // the same run_id can still land inside a window whose started row aged it out only
  // once WINDOW_SIZE more recent runs started after it. A missing key and a JSON null read
  // the same, as the Python version's dict.get did.
  const startedIds: unknown[] = [];
  for (const row of rows) {
    if (row.reason === "started") {
      startedIds.push(row.run_id ?? null);
      if (startedIds.length > WINDOW_SIZE) startedIds.shift();
    }
  }
  const windowIds = new Set(startedIds);

  let stops = 0;
  for (const row of rows) {
    if (
      row.reason !== "started" &&
      row.plan_quality === true &&
      windowIds.has(row.run_id ?? null)
    ) {
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
  // A build can start and stop within the same second, so a timestamp cannot separate the
  // two; the run_id is what joins a stop row back to its start row. Only a non-empty string
  // counts as supplied: the recorder is the sole producer of run_id and prints a string, and
  // the Python version's str() of an empty container minted a fresh id here as well.
  const runId =
    typeof suppliedRunId === "string" && suppliedRunId !== ""
      ? suppliedRunId
      : randomUUID().replace(/-/g, "");

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
  // A broad catch: path/run_id must reach stdout even on a surprise here.
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
