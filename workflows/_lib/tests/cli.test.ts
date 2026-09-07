/// <reference types="node" />
// Behavior tests for workflows/_lib/cli.ts: the stdin payload parse/guard pair ported from
// workflows/build/record.ts's `main`, the history-directory resolver that takes `home` as an
// explicit argument, and the second-precision UTC timestamp formatter.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { historyPath, isoTimestamp, parsePayload } from "../cli.ts";

function withTempHome<T>(fn: (home: string) => T): T {
  const home = mkdtempSync(join(tmpdir(), "cli-test-"));
  try {
    return fn(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test(
  "T-116 parsing text that is not JSON yields no payload and the message that starts with " +
    "the python recorder's prefix Error: unparseable payload:",
  () => {
    const result = parsePayload("not json at all");
    assert.equal(result.payload, null);
    assert.equal(typeof result.message, "string");
    assert.ok(
      result.message !== null && result.message.startsWith("Error: unparseable payload:"),
      `message does not start with the expected prefix: ${result.message}`,
    );
  },
);

test(
  "T-117 parsing JSON that is not an object yields no payload and the message " +
    "Error: payload must be a JSON object",
  () => {
    const result = parsePayload("[1, 2, 3]");
    assert.equal(result.payload, null);
    assert.equal(result.message, "Error: payload must be a JSON object");
  },
);

test(
  "T-118 the history path for a home and a file name is <home>/.claude/history/<name>, " +
    "and ensuring it creates that directory under a temp directory",
  () => {
    withTempHome((home) => {
      const path = historyPath(home, "build-runs.jsonl");
      assert.equal(path, join(home, ".claude", "history", "build-runs.jsonl"));
      const dir = join(home, ".claude", "history");
      assert.ok(existsSync(dir), `history dir was not created at ${dir}`);
      assert.ok(statSync(dir).isDirectory(), `${dir} exists but is not a directory`);
    });
  },
);

test("T-119 the UTC timestamp has second precision and ends with Z", () => {
  const timestamp = isoTimestamp(new Date("2026-09-08T12:34:56.789Z"));
  assert.equal(timestamp, "2026-09-08T12:34:56Z");
  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});
