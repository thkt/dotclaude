/// <reference types="node" />
// Ports the two new U-003 scenarios of skills/scribe/tests/ci_parity_test.py's parity suite to
// the .ts side: that file's own checks run under python3 and stay there (T-007/T-008/T-009/
// T-010, issue #531's Plan), but T-449/T-450 pin U-003's own contract -- the interpreter setup
// step DR-0116 chose (node, via actions/setup-node) and the gate step's move to
// `node hooks/_lib/scribe_gate.ts` -- and this repo's node --test glob
// (`skills/scribe/tests/*.test.ts`) is what actually discovers and runs them, the same reason
// hooks/_lib/tests/scribe-gate.test.ts exists as its own file rather than folding into the
// retired Python side's suite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/scribe/tests -> skills/scribe -> skills -> repo root, the same climb
// skills/scribe/tests/find-wiki-rule.test.ts's own REPO_ROOT constant makes.
const REPO_ROOT = join(HERE, "..", "..", "..");
const WORKFLOW = join(REPO_ROOT, ".github", "workflows", "scribe.yml");

function workflowText(): string {
  return readFileSync(WORKFLOW, "utf-8");
}

test(
  "T-449 the scribe workflow names an interpreter setup step before the gate step, read from scribe.yml",
  () => {
    const text = workflowText();
    const gateMatch = /id:\s*gate\b/.exec(text);
    assert.ok(gateMatch, "a step carries id: gate");
    const beforeGate = text.slice(0, gateMatch.index);
    assert.ok(
      beforeGate.includes("actions/setup-node"),
      "an interpreter setup step (actions/setup-node), the interpreter DR-0116 chose, " +
        "precedes the gate step",
    );
  },
);

test(
  "T-450 the gate step invokes the .ts file with an explicit node interpreter, read from scribe.yml",
  () => {
    // Absence of the retired Python original is hooks/_lib/tests/scribe-gate-retirement.test.ts's
    // job (a repo-wide scan that covers this workflow file too), not repeated here.
    const text = workflowText();
    assert.ok(
      text.includes("node hooks/_lib/scribe_gate.ts"),
      "the gate step launches hooks/_lib/scribe_gate.ts with an explicit node interpreter",
    );
  },
);
