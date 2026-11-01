/// <reference types="node" />
// Golden tests for hooks/_lib/hook_payload.ts's read path, pinning field, editedFile and
// notification against literal expected values. This file began as a differential suite
// diffing hook_payload.ts against hook_payload.py (contract: docs/decisions/0112-adopt-
// typescript-for-helper-scripts.md's Success Criteria, "the CLI contract does not change across
// the migration; the first slice confirms it with a differential test diffing the Python and
// TypeScript outputs"). That contract is discharged: every hook now imports the .ts side, and
// hook_payload.py retires with this unit (DR-0121). The literal expectations below are the ones
// the differential suite had already written by hand and cross-checked against the Python
// reference while it existed, so dropping the Python half removes a comparison, not a pin.
//
// This stays the only direct check of field's null contract (hook_payload.ts:47-51 states that
// null, rather than undefined, is deliberate). No other tracked test calls field: the files
// that name hook_payload.ts either copy it into a temp tree
// (hooks/pre-bash/tests/client-identifier-gate.test.ts) or assert it is in the type-check set
// (hooks/_lib/tests/hooks-toolchain.test.ts). notification's envelope is pinned end to end by
// hooks/edit/tests/rumdl-check.test.ts as well, and editedFile only by the truthiness check in
// hooks/_lib/tests/mirror-prose.test.ts, so the value checks here carry both.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { editedFile, field, notification } from "../hook_payload.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = join(HERE, "fixtures", "hook-payloads.json");
const SELF_PATH = fileURLToPath(import.meta.url);

interface Fixture {
  id: string;
  payload: Record<string, unknown>;
}

function loadFixtures(): Fixture[] {
  return JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as Fixture[];
}

function fixture(id: string): Fixture {
  const found = loadFixtures().find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`no fixture named ${id}`);
  }
  return found;
}

test("T-001 field returns the command string of a PreToolUse Bash payload", () => {
  const { payload } = fixture("T-001-pretooluse-bash");

  assert.equal(field(payload.tool_input, "command"), "echo hello world");
});

test("T-002 editedFile returns the written path of a PostToolUse Write payload", () => {
  const { payload } = fixture("T-002-posttooluse-write");

  assert.equal(editedFile(JSON.stringify(payload)), "/tmp/hook-payload-parity-example.txt");
});

test("T-540 field returns null rather than undefined for a payload missing a key and for one whose tool_input is not a mapping", () => {
  const missingKey = fixture("T-540-missing-key");
  const typeMismatch = fixture("T-540-type-mismatch");
  const key = "file_path";

  // strictEqual separates null from undefined, which is the whole point of the contract: a
  // consumer branching on `=== null` would take the wrong branch on undefined.
  assert.strictEqual(field(missingKey.payload.tool_input, key), null, "missing key");
  assert.strictEqual(field(typeMismatch.payload.tool_input, key), null, "type mismatch");
});

test("T-004 every fixture payload yields a non-empty tool_name", () => {
  const fixtures = loadFixtures();
  assert.ok(fixtures.length > 0, "the fixture file must carry at least one payload");

  for (const { id, payload } of fixtures) {
    const result = field(payload, "tool_name");
    assert.ok(typeof result === "string" && result.length > 0, id);
  }
});

test("T-541 notification returns the envelope shape hooks/edit/rumdl_check.ts's notify call depends on, with the finding verbatim in both channels", () => {
  const message = "violation.md:2:1 [MD022] headings should be surrounded by blank lines";

  // Captured from hook_payload.py's own notify before it retired, so the envelope this asserts
  // is the one the Python side produced rather than a restatement of the TypeScript output.
  assert.deepEqual(notification(message, "PostToolUse"), {
    systemMessage: message,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: message,
    },
  });
});

// The unit's own outcome: the suite no longer reaches for the retired Python module. Checked
// against this file's source because the claim is about what the file may invoke, and a run that
// happens not to spawn a process would pass whether or not the driver were still here.
//
// The needles are assembled from fragments rather than written whole, so this file's own
// assertion does not match itself. That is the opposite problem from
// docs/wiki/absence-test-positive-control-fixture.md's rule against building a fixture from the
// constant under search, so the positive control below is built from the same fragments the
// predicate uses and would catch a fragment typo by failing to detect.
const FORBIDDEN = [`${"child"}_process`, `${"spawn"}Sync`, `${"py"}thon3`];

const namesForbidden = (source: string): string[] =>
  FORBIDDEN.filter((needle) => source.includes(needle));

test("T-542 this file names no process-spawning import or python interpreter, and the same predicate flags a source line carrying each", () => {
  assert.deepEqual(namesForbidden(readFileSync(SELF_PATH, "utf8")), []);

  for (const needle of FORBIDDEN) {
    assert.deepEqual(
      namesForbidden(`import { x } from "node:${needle}";`),
      [needle],
      `the predicate missed ${needle}`,
    );
  }
});
