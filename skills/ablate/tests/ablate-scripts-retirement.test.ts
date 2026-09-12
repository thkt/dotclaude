/// <reference types="node" />
// U-006: report.py, arms.py, verdict.py, dr_gate.py, enforcer_map.py and usage_counts.py
// (skills/ablate/scripts), plus harness_elements.py (skills/_lib), their .ja mirrors and the
// 8 skills/ablate/tests/*_test.py files are retired in favor of the .ts siblings the preceding
// units (U-001..U-005) already established. This file guards two sides of that retirement:
//
// T-482 guards the reason the retirement is safe to do at all -- POPULATION_GLOBS
// (skills/_lib/harness_elements.ts) widens skills/**/scripts/*.py to also count .ts, so once
// the .py scripts are gone the harness population still carries ablate's own script tree and
// ablate keeps measuring itself instead of dropping out of its own population.
//
// T-482 reads the .ts scripts actually present under skills/ablate/scripts/ from the
// filesystem rather than hardcoding the six names, the same choice harness-elements.test.ts's
// expectedElements() makes against its own fixture (docs/wiki/supply-list-single-source.md).
//
// T-483 is the retirement guard itself, same shape as skills/dr/tests/dr-scripts-retirement.test.ts's
// T-212 and skills/_lib/tests/review-score-retirement.test.ts's T-174: offendersAmong/trackedFiles/
// assertDetectsAndMisses from workflows/_lib/tests/_retirement.ts drive a full-tree scan, and
// only the helper's own defaults (docs/decisions/, .claude/workspace/research/) plus this file
// itself are excluded. Unlike those two callers, which check one representative name, T-483's
// own scenario name asks for the predicate to be exercised against each retired name in turn.
import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { enumerate_elements } from "../../_lib/harness_elements.ts";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/ablate/tests -> skills/ablate -> skills -> repo root, the same climb
// harness-hash-cli.test.ts's REPO_ROOT makes from the same starting point.
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

test(
  "T-482 the population the glob enumerates contains ablate's own .ts scripts, so the skill still measures itself",
  () => {
    const scriptsDir = join(REPO_ROOT, "skills", "ablate", "scripts");
    const ownScripts = globSync("*.ts", { cwd: scriptsDir })
      .map((name) => `skills/ablate/scripts/${name}`)
      .sort();
    assert.ok(
      ownScripts.length > 0,
      "skills/ablate/scripts holds at least one .ts script for the population to count",
    );

    const population = new Set(enumerate_elements(REPO_ROOT).map((element) => element.path));
    const missing = ownScripts.filter((path) => !population.has(path));
    assert.deepEqual(
      missing,
      [],
      `POPULATION_GLOBS omits ablate's own .ts scripts, so ablate no longer measures its own script tree: ${missing.join(", ")}`,
    );
  },
);

// A retired name used as a word (not part of a longer identifier), immediately followed by the
// literal ".py" extension -- e.g. "arms.py" or "scripts/verdict.py", but not "old_arms.py"
// (the [^\w.-] boundary before the name) nor "arms.py.bak" (the trailing \b still lets that
// through; callers that care skip it on inspection). Mirrors dr-scripts-retirement.test.ts's
// own PY_NEEDLE, generalized to the seven names this unit retires.
const RETIRED_NAMES = [
  "report",
  "arms",
  "verdict",
  "dr_gate",
  "enforcer_map",
  "usage_counts",
  "harness_elements",
];
const RETIRED_PATTERN = new RegExp(`(^|[^\\w.-])(${RETIRED_NAMES.join("|")})\\.py\\b`);

// The one predicate the absence scan below relies on, factored out so the positive control can
// drive it directly instead of re-deriving its own copy
// (docs/wiki/absence-test-positive-control-fixture.md).
function namesRetiredPyScript(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-483 no tracked file outside the historical directories names the retired .py as a word, and the same predicate flags a fixture line carrying each",
  () => {
    for (const name of RETIRED_NAMES) {
      assertDetectsAndMisses(namesRetiredPyScript, `${name}.py`);
    }

    // This test's own file names all seven retired scripts in comments to describe what it
    // checks; the historical directories are offendersAmong's own default.
    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      namesRetiredPyScript,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/ and .claude/workspace/research/ names " +
        `report.py, arms.py, verdict.py, dr_gate.py, enforcer_map.py, usage_counts.py or ` +
        `harness_elements.py\n${offenders.join(", ")}`,
    );
  },
);
