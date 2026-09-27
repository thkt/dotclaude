/// <reference types="node" />
// Behavior tests for workflows/implement/record.ts. implement writes a start row and one
// terminal row per run, joined by the run_id the recorder mints on the first row, so the
// comparison against build-runs.jsonl reads both workflows with one jq query.
import assert from "node:assert/strict";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLines, runCli, withTempHome } from "../../_lib/tests/_cli-fixture.ts";
import { historyPath } from "../../_lib/cli.ts";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "record.ts");
const HISTORY_NAME = "implement-runs.jsonl";

test("a payload without run_id gets a minted 32-hex run_id, and stdout reports it with the history path", () => {
  withTempHome((home) => {
    const result = runCli(SCRIPT, home, JSON.stringify({ issue: "12", reason: "started" }));
    assert.equal(result.status, 0);
    const out = JSON.parse(result.stdout);
    assert.match(out.run_id, /^[0-9a-f]{32}$/);
    assert.equal(out.path, historyPath(home, HISTORY_NAME));
    const [row] = readLines(out.path).map((line) => JSON.parse(line));
    assert.equal(row.run_id, out.run_id);
    assert.equal(row.reason, "started");
    assert.match(row.generated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

test("a supplied run_id is kept, so the terminal row joins its start row", () => {
  withTempHome((home) => {
    const first = JSON.parse(runCli(SCRIPT, home, JSON.stringify({ reason: "started" })).stdout);
    runCli(
      SCRIPT,
      home,
      JSON.stringify({ run_id: first.run_id, reason: "verified_local", review_rounds: 2 }),
    );
    const rows = readLines(first.path).map((line) => JSON.parse(line));
    assert.deepEqual(
      rows.map((row) => [row.run_id, row.reason]),
      [
        [first.run_id, "started"],
        [first.run_id, "verified_local"],
      ],
    );
    assert.equal(rows[1].review_rounds, 2);
  });
});

test("an unparseable payload exits 1 and writes no row", () => {
  withTempHome((home) => {
    const result = runCli(SCRIPT, home, "not json");
    assert.equal(result.status, 1);
    assert.deepEqual(readLines(historyPath(home, HISTORY_NAME)), []);
  });
});
