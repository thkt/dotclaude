/// <reference types="node" />
// In-process tests for skills/ablate/scripts/reference_match.ts. Each finding and planted
// defect is built by hand; no claude process is started.
import assert from "node:assert/strict";
import test from "node:test";
import { is_hit, type Finding, type PlantedDefect } from "../scripts/reference_match.ts";

// A planted defect fixture: the #744 corpus that plants a real defect into a real reference
// file does not exist yet, so these constants stand in for the shape it will hand this
// module -- a file and an inclusive line range.
const DEFECT: PlantedDefect = {
  file: "skills/use-context-reviewer-readability/references/ai-antipatterns.md",
  line_start: 40,
  line_end: 50,
};

test("T-505 A finding whose line range overlaps the planted range counts as a hit", () => {
  const finding: Finding = { file: DEFECT.file, line: "45-55" };
  assert.equal(is_hit(finding, DEFECT), true);
});

test("T-506 A finding whose line lists several locations counts as a hit when one of them falls in the planted range", () => {
  const finding: Finding = { file: DEFECT.file, line: "12, 46" };
  assert.equal(is_hit(finding, DEFECT), true);
});

test("T-507 A finding whose only overlapping location sits in its evidence counts as a hit", () => {
  const finding: Finding = {
    file: DEFECT.file,
    line: "5",
    evidence: "Line 44 calls JSON.parse without a try/catch.",
  };
  assert.equal(is_hit(finding, DEFECT), true);
});

test("T-508 A finding on the same file outside the planted range does not count as a hit", () => {
  const finding: Finding = { file: DEFECT.file, line: "5-10" };
  assert.equal(is_hit(finding, DEFECT), false);
});
