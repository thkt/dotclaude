/// <reference types="node" />
// In-process tests for skills/ablate/scripts/usage_counts.ts, the TS port of
// usage_counts.py's FIRE_EVENTS, ELEMENT_SUFFIXES, RARE_BY_DESIGN, MEASUREMENT_WINDOW_DAYS,
// element_path, _parse_date, _iter_fires, count_usage, classify and main.
// skills/ablate/tests/usage-counts-fixture.test.ts already froze
// skills/ablate/tests/fixtures/usage-counts-cases.json against the real python3
// usage_counts.py; T-354 below replays that same frozen fixture against the .ts port's
// count_usage directly, rather than hand-writing a second set of expected rows that could
// drift from it (docs/wiki/fixture-freeze-before-port.md), the same DRY choice
// skills/ablate/tests/enforcer-map.test.ts makes for enforcer_map.ts.
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { writeTree } from "../../_lib/tests/_python-cli-fixture.ts";
import { DELETE_CANDIDATE, NEEDS_HUMAN_JUDGMENT } from "../scripts/verdict.ts";
import { UNMEASURED } from "../scripts/arms.ts";
import {
  classify,
  count_usage,
  MEASUREMENT_WINDOW_DAYS,
  RARE_BY_DESIGN,
} from "../scripts/usage_counts.ts";
import type { UsageResult } from "../scripts/usage_counts.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

interface FixtureCase {
  name: string;
  files: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "usage-counts-cases.json"), "utf8"),
) as FixtureCase[];

test("T-354 count_usage tallies the fires inside the window and drops the ones outside it, driven by the frozen transcript", () => {
  // "the window" here is the set FIRE_EVENTS/ELEMENT_SUFFIXES recognize as one hook fire
  // naming a harness element: counts_fires_across_transcripts_and_drops_a_label_only_command
  // is the frozen fixture case that puts an element-shaped fire ("~/.claude/hooks/.../*.py")
  // and a label-only fire ("formatter", which names no element and so falls outside that set)
  // in the same transcript pair. Replaying it straight through the ported count_usage proves
  // the label-only one is dropped rather than tallied, and the element-shaped ones are.
  const entry = fixture(CASES, "counts_fires_across_transcripts_and_drops_a_label_only_command");
  const root = writeTree("usage-counts-count", entry.files);
  try {
    const expected = JSON.parse(entry.stdout) as UsageResult;
    const result = count_usage(root);
    assert.deepEqual(result, expected);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("T-355 a path in RARE_BY_DESIGN classifies as measured rather than as a delete candidate", () => {
  const [rarePath] = RARE_BY_DESIGN;
  const now = new Date("2026-08-27T00:00:00.000Z");

  // Zero fires and no last_used would read as unused for any other path -- RARE_BY_DESIGN's
  // first-row-wins check must still keep this one out of DELETE_CANDIDATE.
  const verdict = classify(rarePath, 0, null, now, MEASUREMENT_WINDOW_DAYS);

  assert.notEqual(verdict, DELETE_CANDIDATE);
  assert.equal(verdict, NEEDS_HUMAN_JUDGMENT);
});

test("T-356 classify takes the window as an argument, so a caller can drive both sides of the boundary without patching a module binding", () => {
  const path = "hooks/pre-bash/wiki_scene.py";
  const now = new Date("2026-08-27T00:00:00.000Z");
  // 238 days before `now` (usage_counts_test.py's MeasurementWindow case uses the same shape:
  // a last_used date that a narrow window reports stale and a wide window reports current).
  const lastUsed = "2026-01-01";

  assert.equal(classify(path, 5, lastUsed, now, 30), UNMEASURED);
  assert.equal(classify(path, 5, lastUsed, now, 300), NEEDS_HUMAN_JUDGMENT);
});
