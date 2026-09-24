/// <reference types="node" />
// Behavior tests for skills/ablate/references/measurement-criteria.md's "Rule to triggering
// task" table. U-001 gave skills/_lib/harness_elements.ts's classify() a skill-reference
// branch; this unit adds one trigger-task row per skill-reference element to the table so
// Phase 2 can measure those elements the same way it already measures always-loaded and
// path-triggered ones. These tests read the table itself, not a parser module, because no
// production code in this repo consumes the table programmatically -- Phase 2 reads it as
// prose (skills/ablate/SKILL.md's Phase 2).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const MEASUREMENT_CRITERIA_PATH = join(HERE, "..", "references", "measurement-criteria.md");

// The five skills/<name>/references/<file>.md pages that carry their own "Examples" heading
// (Code Examples / Examples / Pattern Examples), found by grepping every skill-reference
// element skills/_lib/harness_elements.ts's enumerate_elements() classifies as skill-reference
// for a `^#+ .*Examples?\b` heading. Hardcoded here rather than re-run through classify() and
// a heading grep at test time, because the table this unit writes is a curated, fixed set
// (skills/ablate/references/measurement-criteria.md's own "Why a fixed task set" section), not
// a live re-derivation.
const EXAMPLES_BEARING_PATHS = [
  "skills/use-context-reviewer-readability/references/ai-antipatterns.md",
  "skills/use-context-reviewer-readability/references/control-flow.md",
  "skills/use-context-reviewer-testability/references/pure-functions.md",
  "skills/use-context-root-cause-analysis/references/hypothesis-examples.md",
  "skills/use-context-reviewer-silence/references/detection-patterns.md",
] as const;

interface TriggerRow {
  rule: string;
  classification: string;
  triggerTaskId: string;
  task: string;
}

/** Strips one layer of matching leading/trailing backticks (the Rule and Trigger Task ID
 * columns wrap their value in a single backtick pair; the Task column never does). */
function stripBackticks(cell: string): string {
  return cell.replace(/^`/, "").replace(/`$/, "");
}

/** Parses the "## Rule to triggering task" table's data rows out of measurement-criteria.md.
 * Not a general markdown-table parser: it assumes the exact 4-column shape (Rule,
 * Classification, Trigger task ID, Task) the file's own header row declares, the same
 * narrow-hand-parsing choice harness_elements.ts's header comment makes for frontmatter
 * shapes (rules/PRINCIPLES.md Reuse Ordering). */
function readTriggerTable(): TriggerRow[] {
  const lines = readFileSync(MEASUREMENT_CRITERIA_PATH, "utf8").split("\n");
  const headerIndex = lines.findIndex((line) => line.trim().startsWith("| Rule "));
  assert.ok(
    headerIndex !== -1,
    "measurement-criteria.md carries no 'Rule to triggering task' table header",
  );
  const rows: TriggerRow[] = [];
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) {
      break;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 4) {
      break;
    }
    const [ruleCell, classification, triggerCell, ...taskParts] = cells;
    rows.push({
      rule: stripBackticks(ruleCell),
      classification,
      triggerTaskId: stripBackticks(triggerCell),
      task: taskParts.join("|"),
    });
  }
  return rows;
}

test("Every element path named in the measurement-criteria trigger table exists in the repository", () => {
  const rows = readTriggerTable();
  const skillReferenceRows = rows.filter((row) => row.classification === "skill-reference");
  const namedPaths = new Set(skillReferenceRows.map((row) => row.rule));

  for (const expectedPath of EXAMPLES_BEARING_PATHS) {
    assert.ok(
      namedPaths.has(expectedPath),
      `${expectedPath} is not named as a skill-reference row in the trigger table`,
    );
  }
  for (const row of skillReferenceRows) {
    assert.ok(
      existsSync(join(REPO_ROOT, row.rule)),
      `${row.rule} does not exist in the repository`,
    );
  }
});

test("Each of the five Examples-bearing reference files has exactly one trigger task row classified as skill-reference", () => {
  const rows = readTriggerTable();
  for (const path of EXAMPLES_BEARING_PATHS) {
    const matches = rows.filter(
      (row) => row.rule === path && row.classification === "skill-reference",
    );
    assert.equal(
      matches.length,
      1,
      `expected exactly one skill-reference row for ${path}, found ${matches.length}`,
    );
  }
});
