/// <reference types="node" />
// Fixture-freeze test for skills/ablate/scripts/report.py's build_report, per
// docs/wiki/fixture-freeze-before-port.md: skills/ablate/tests/fixtures/report-cases.json
// freezes the real python3 report.build_report()'s own return value, captured by running it
// (with skills/ablate/scripts and skills/_lib on sys.path, per report.py's own docstring)
// against a constructed temp repo tree, a pinned `now`, and
// skills/ablate/tests/fixtures/report-transcripts/ as TRANSCRIPTS_ROOT.
//
// report.py exposes no CLI (SKILL.md imports build_report/write_report directly, never
// shells out to it), so this replays through a small inline python3 driver instead of
// skills/_lib/tests/_python-cli-fixture.ts's argv-CLI-shaped runPythonCli/loadTreeFixtures --
// the same "spawn python3 -c against inline source" shape
// skills/ablate/tests/_python-public-names.ts's own PY_DRIVER already uses in this directory.
// runPythonCli/writeTree are still reused for the interpreter resolution and the temp-tree
// construction, so this differs from the shared helper only where build_report's shape
// (a function call, not an argv CLI) forces it to.
//
// write_report's generated filename is not part of what is frozen -- only build_report's
// return value is, per this unit's contract.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { CliRun } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { runPythonCli, writeTree } from "../../_lib/tests/_python-cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");
const LIB_DIR = join(HERE, "..", "..", "_lib");
const TRANSCRIPTS_ROOT = join(HERE, "fixtures", "report-transcripts");

// The pinned instant this fixture must be captured against -- the same 2026-08-27 date
// skills/ablate/tests/usage_counts_test.py's MeasurementWindow case and
// skills/ablate/tests/usage-counts-fixture.test.ts's own NOW already use, so a fire recorded
// in report-transcripts/seed.jsonl sits at the same distance from "now" on both sides of the
// module boundary this report draws on.
const NOW = "2026-08-27";

interface ReportFixtureCase {
  name: string;
  // The repo-root tree report.build_report(root, ...) scans (harness elements, DRs, ...).
  files: Record<string, string>;
  // build_report's second argument, exactly as python3 read it back from JSON.
  observations: Array<Record<string, unknown>>;
  exit: number;
  // json.dumps(report.build_report(...), ensure_ascii=False), byte-for-byte as python3
  // printed it -- never hand-typed (docs/wiki/fixture-freeze-before-port.md).
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "report-cases.json"), "utf8"),
) as ReportFixtureCase[];

// Puts scripts_dir/lib_dir on sys.path the way report.py's own docstring requires the caller
// to, points report.TRANSCRIPTS_ROOT at the shared fixture directory instead of the real
// ~/.claude/projects, and prints build_report()'s return value as JSON -- the one call each
// case below replays.
const PY_DRIVER = `
import json
import sys
from datetime import date
from pathlib import Path

scripts_dir, lib_dir, root, observations_path, transcripts_root, now_iso = sys.argv[1:7]
sys.path.insert(0, scripts_dir)
sys.path.insert(0, lib_dir)

import report

report.TRANSCRIPTS_ROOT = Path(transcripts_root)

with open(observations_path, encoding="utf-8") as f:
    observations = json.load(f)

result = report.build_report(Path(root), observations, now=date.fromisoformat(now_iso))
print(json.dumps(result, ensure_ascii=False))
`;

/** Builds `entry`'s tree and observations file under fresh temp directories and runs the
 * driver above against them, cleaning both up afterward whether the run succeeds or throws. */
function runReportDriver(entry: ReportFixtureCase): CliRun {
  const root = writeTree("report-fixture-case", entry.files);
  const obsDir = mkdtempSync(join(tmpdir(), "report-fixture-obs-"));
  try {
    const obsPath = join(obsDir, "observations.json");
    writeFileSync(obsPath, JSON.stringify(entry.observations));
    return runPythonCli("-c", [PY_DRIVER, SCRIPTS_DIR, LIB_DIR, root, obsPath, TRANSCRIPTS_ROOT, NOW]);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(obsDir, { recursive: true, force: true });
  }
}

test("T-471 every frozen case reproduces the python build_report dict for the same pinned now and transcript root", () => {
  assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
  for (const entry of CASES) {
    const run = runReportDriver(entry);
    assert.equal(run.status, entry.exit, `${entry.name}: python3 exit (stderr: ${run.stderr})`);
    assert.equal(run.stdout, entry.stdout, `${entry.name}: build_report() return value`);
  }
});

test("T-472 the fixture carries a case for each verdict the report can render", () => {
  const renderedVerdicts = new Set<string>();
  for (const entry of CASES) {
    const report = JSON.parse(entry.stdout) as { verdicts?: Record<string, string> };
    for (const verdict of Object.values(report.verdicts ?? {})) {
      renderedVerdicts.add(verdict);
    }
  }
  // The closed set report.py's Verdicts section can ever print: verdict.classify's own
  // UNMEASURED/DELETE_CANDIDATE/NEEDS_HUMAN_JUDGMENT, plus dr_gate.gate's HELD -- the outcome
  // it substitutes in place of a delete candidate a live DR still governs.
  assert.deepEqual(
    renderedVerdicts,
    new Set(["unmeasured", "delete-candidate", "needs-human-judgment", "held"]),
  );
});
