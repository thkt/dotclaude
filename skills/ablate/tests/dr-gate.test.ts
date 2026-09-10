/// <reference types="node" />
// In-process tests for skills/ablate/scripts/dr_gate.ts, replaying the observation table
// skills/ablate/tests/dr_gate_test.py drives against dr_gate.py (dr_gate.py stays live as
// report.py's import source until that slice retires the Python side; see dr_gate.ts's
// header). This unit runs the assertions against the TypeScript side alone -- a dual-language
// name comparison, if one is planned, belongs in a later unit, not here.
//
// A confirmation record is a line reading `Confirmed unmet: {date}` inside the DR file, the
// same convention dr_gate_test.py documents: no DR in the repository carries a
// machine-checkable field for it, and issue #485's Scope excludes rewriting DR bodies.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DELETE_CANDIDATE } from "../scripts/verdict.ts";
import { HELD, gate } from "../scripts/dr_gate.ts";

const CANDIDATE_PATH = "skills/sample/scripts/example.py";

// Governs CANDIDATE_PATH (the path appears in the Decision Outcome body), carries a
// Reassessment Triggers section, but no confirmation record.
const DR_UNCONFIRMED = `# DR-0001 Sample decision

## Decision Outcome

Chosen option governs \`${CANDIDATE_PATH}\`.

## More Information

### Reassessment Triggers

- The upstream dependency changes its API.
`;

// Same DR, with a confirmation record stating the triggers were checked and found unmet.
const DR_CONFIRMED_UNMET = `# DR-0001 Sample decision

## Decision Outcome

Chosen option governs \`${CANDIDATE_PATH}\`.

## More Information

### Reassessment Triggers

- The upstream dependency changes its API.

Confirmed unmet: 2026-08-20
`;

// Does not mention CANDIDATE_PATH anywhere, so it governs a different element entirely.
const DR_UNRELATED = `# DR-0002 Unrelated decision

## Decision Outcome

Chosen option governs \`skills/other/scripts/unrelated.py\`.

## More Information

### Reassessment Triggers

- Some other condition.
`;

/** A throwaway docs/decisions/ tree holding one DR file, mirroring dr_gate_test.py's
 * tempfile.TemporaryDirectory() + _write() fixture setup. */
function makeRoot(drFilename: string, drText: string): string {
  const root = mkdtempSync(join(tmpdir(), "dr-gate-test-"));
  const drDir = join(root, "docs", "decisions");
  mkdirSync(drDir, { recursive: true });
  writeFileSync(join(drDir, drFilename), drText, "utf8");
  return root;
}

test("T-340 a path governed by a DR whose triggers are not confirmed unmet comes back held", () => {
  const root = makeRoot("0001-sample.md", DR_UNCONFIRMED);
  try {
    const result = gate(CANDIDATE_PATH, DELETE_CANDIDATE, root);
    assert.equal(result, HELD);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("T-341 a path whose governing DR records the confirmed-unmet marker comes back as a delete candidate", () => {
  const root = makeRoot("0001-sample.md", DR_CONFIRMED_UNMET);
  try {
    const result = gate(CANDIDATE_PATH, DELETE_CANDIDATE, root);
    assert.equal(result, DELETE_CANDIDATE);
    assert.notEqual(result, HELD);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("T-342 a path with no governing DR falls through to the verdict it was given", () => {
  // A DR directory exists and holds a DR, but none of them mention this path: the lookup
  // itself must come back empty, not merely "directory absent".
  const root = makeRoot("0002-unrelated.md", DR_UNRELATED);
  try {
    const result = gate(CANDIDATE_PATH, DELETE_CANDIDATE, root);
    assert.equal(result, DELETE_CANDIDATE);
    assert.notEqual(result, HELD);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
