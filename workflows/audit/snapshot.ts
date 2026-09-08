#!/usr/bin/env node
/// <reference types="node" />
// Usage: snapshot.ts   (audit payload JSON on stdin)
//
// Record one audit run to $HOME/.claude/history/audit-<YYYY-MM-DD-HHMMSS>.json.
//
// stdin:  JSON {scope, focus, pre_flight, raw_findings[], findings[], skipped[],
//         challenge_ran, verify_ran, tally, needs_context[], zero_reviewer_files[]}
//         each raw_findings entry carries at least {file, message}, plus {id, reviewer,
//         verdict} once the triage pass has run.
//         Every key is copied to the record verbatim; absent keys stay absent.
// stdout: one line of JSON, {path, counts}. counts holds the element count of each
//         array this process serialized.
// exit 0 on success. exit 1 on an unparseable payload (nothing written).
//
// Resolved fields, added to the record:
//   branch        git rev-parse --abbrev-ref HEAD (falls back to "unknown")
//   generated_at  UTC ISO-8601
//
// TypeScript port of the Python audit recorder it replaces.
// Contract: this CLI's own behavior, exercised end to end by
// workflows/audit/tests/snapshot.test.ts against the frozen fixture
// workflows/audit/tests/fixtures/snapshot-cases.json.
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

/** `git rev-parse --abbrev-ref HEAD`, falling back to "unknown" on a non-zero exit or a
 * spawn error (git missing from PATH), mirroring the Python version's git_branch.
 * Runs with a 10s timeout, same as the Python version's subprocess.run(timeout=10). */
export function gitBranch(): string {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.error || result.status !== 0) return "unknown";
  const branch = result.stdout.trim();
  return branch || "unknown";
}

/** An absent key counts 0 rather than being omitted, so the caller reads the same key set
 * every run and a dropped array is a count mismatch instead of a missing field. Mirrors
 * the Python version's counted_arrays. */
export function countedArrays(record: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of COUNTED_ARRAYS) {
    const value = record[key];
    counts[key] = Array.isArray(value) ? value.length : 0;
  }
  return counts;
}

/** The record written to disk: the payload's own keys in order, then `branch`, then
 * `generated_at`. Mirrors the Python version's build_record. */
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

  // One `now` feeds both the record's generated_at and the record file's own timestamp
  // component, so the two always agree, mirroring the Python version's single `now`.
  const now = new Date();
  const generatedAt = isoTimestamp(now);
  const stamp = generatedAt.replace(/:/g, "").replace("T", "-").replace("Z", "");

  const record = buildRecord(payload, gitBranch(), generatedAt);

  // historyPath ensures $HOME/.claude/history exists and returns the full path, the same
  // flow workflows/build/record.ts uses for its own history file -- the only difference is
  // this recorder's `name` is minted per run instead of a fixed .jsonl name.
  const outPath = historyPath(homedir(), `audit-${stamp}.json`);
  writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`);

  const output = { path: outPath, counts: countedArrays(record) };
  process.stdout.write(`${JSON.stringify(output)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
