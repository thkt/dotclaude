/// <reference types="node" />
// Fixture-freeze test for skills/ablate/scripts/usage_counts.py, per
// docs/wiki/fixture-freeze-before-port.md: skills/ablate/tests/fixtures/usage-counts-cases.json
// freezes the real python3 usage_counts.py's own argv -> exit/stdout, captured by running it
// against constructed transcript files. This unit only freezes the fixture -- no TypeScript port
// exists yet -- so T-346 replays it straight through python3.
//
// count_usage() (what main() calls) never reads a "now" -- only classify() does, and main()
// never calls classify() -- so T-347 checks the fixture's own transcript content directly: the
// boundary_crossing_transcript case must carry a transcript record on each side of
// MEASUREMENT_WINDOW_DAYS (skills/ablate/scripts/usage_counts.py's MEASUREMENT_WINDOW_DAYS = 90)
// counted back from NOW below, the fixed instant this fixture must be captured against.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import {
  loadTreeFixtures,
  replayTreeFixtures,
  runPythonCli,
} from "../../_lib/tests/_python-cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "usage_counts.py");

const CASES = loadTreeFixtures(join(HERE, "fixtures", "usage-counts-cases.json"));

// Mirrors skills/ablate/scripts/usage_counts.py's MEASUREMENT_WINDOW_DAYS constant, and the NOW
// this fixture's boundary_crossing_transcript case is captured relative to -- the same 2026-08-27
// date usage_counts_test.py's own MeasurementWindow/RareByDesign cases already use as `now`.
const MEASUREMENT_WINDOW_DAYS = 90;
const NOW = new Date("2026-08-27T00:00:00.000Z");

test("T-346 every frozen case reproduces the python script's exit code and stdout, replayed through the real CLI", () => {
  replayTreeFixtures(CASES, "usage-counts-case", (argv) => runPythonCli(SCRIPT, argv));
});

test("T-347 the usage-counts fixture carries a transcript entry on both sides of the measurement window boundary", () => {
  const entry = fixture(CASES, "boundary_crossing_transcript");
  const timestamps = Object.values(entry.files)
    .join("\n")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => (JSON.parse(line) as { timestamp?: string }).timestamp)
    .filter((value): value is string => typeof value === "string");
  assert.ok(timestamps.length > 0, "the case carries at least one transcript record");

  const daysBeforeNow = (iso: string): number =>
    (NOW.getTime() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);

  assert.ok(
    timestamps.some((iso) => daysBeforeNow(iso) <= MEASUREMENT_WINDOW_DAYS),
    "at least one transcript record falls inside the measurement window",
  );
  assert.ok(
    timestamps.some((iso) => daysBeforeNow(iso) > MEASUREMENT_WINDOW_DAYS),
    "at least one transcript record falls outside the measurement window",
  );
});
