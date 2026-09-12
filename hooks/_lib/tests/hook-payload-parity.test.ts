/// <reference types="node" />
// Differential tests for hooks/_lib/hook_payload.ts against hooks/_lib/hook_payload.py: for the
// same payload the two must read out the same value (contract: docs/decisions/0112-adopt-
// typescript-for-helper-scripts.md's Success Criteria, "the CLI contract does not change across
// the migration; the first slice confirms it with a differential test diffing the Python and
// TypeScript outputs"). The read path is what this slice diffs: field and editedFile, the two
// every consumer reaches for. notify and deny write to stdout rather than returning, so each
// one's parity moves with the first consumer that switches to it. hooks/lifecycle/recall_index.ts
// already switched to this module's parse; hooks/edit/rumdl_check.ts (unit U-005) is notify's
// first switched consumer, so this file adds notify's parity case alongside it. deny has no
// switched consumer yet. Every other hook still imports the Python side, so this test keeps
// guarding both while they move over one at a time.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { editedFile, field, notification } from "../hook_payload.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS_LIB_DIR = join(HERE, "..");
const FIXTURES_PATH = join(HERE, "fixtures", "hook-payloads.json");

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

// A one-shot driver rather than a CLI: hook_payload.py has no __main__, so this is the smallest
// way to call its named exports from outside the process. It mirrors the functions
// hook_payload.ts exposes and hook_payload.py also carries (field, edited_file, notify; deny
// stays out until a consumer switches to it too). notify prints its envelope straight to
// stdout rather than returning it, so the driver captures that print with redirect_stdout and
// hands the parsed line back as `result`, the same shape the other branches return directly.
const PY_DRIVER = `
import contextlib
import io
import json
import sys

sys.path.insert(0, sys.argv[1])
import hook_payload as hp

spec = json.loads(sys.stdin.read())
fn = spec["fn"]
if fn == "field":
    result = hp.field(spec["container"], spec["key"])
elif fn == "edited_file":
    result = hp.edited_file(spec["text"])
elif fn == "notify":
    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        hp.notify(spec["message"], hook_event_name=spec["hookEventName"])
    result = json.loads(captured.getvalue())
else:
    raise SystemExit(f"unknown fn: {fn}")
print(json.dumps({"result": result}))
`;

type PythonSpec =
  | { fn: "field"; container: unknown; key: string }
  | { fn: "edited_file"; text: string }
  | { fn: "notify"; message: string; hookEventName: string };

function runPython(spec: PythonSpec): unknown {
  const result = spawnSync("python3", ["-c", PY_DRIVER, HOOKS_LIB_DIR], {
    input: JSON.stringify(spec),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return (JSON.parse(result.stdout) as { result: unknown }).result;
}

test("T-001 both implementations return the same command string for a PreToolUse Bash payload", () => {
  const { payload } = fixture("T-001-pretooluse-bash");
  const container = payload.tool_input;
  const key = "command";
  const expected = "echo hello world";

  const tsResult = field(container, key);
  const pyResult = runPython({ fn: "field", container, key });

  assert.equal(tsResult, expected, "hook_payload.ts");
  assert.equal(pyResult, expected, "hook_payload.py");
  assert.equal(tsResult, pyResult, "hook_payload.ts and hook_payload.py must agree");
});

test("T-002 both implementations return the same edited path for a PostToolUse Write payload", () => {
  const { payload } = fixture("T-002-posttooluse-write");
  const text = JSON.stringify(payload);
  const expected = "/tmp/hook-payload-parity-example.txt";

  const tsResult = editedFile(text);
  const pyResult = runPython({ fn: "edited_file", text });

  assert.equal(tsResult, expected, "hook_payload.ts");
  assert.equal(pyResult, expected, "hook_payload.py");
  assert.equal(tsResult, pyResult, "hook_payload.ts and hook_payload.py must agree");
});

test("T-003 both implementations return the same default for a payload missing a key and for one whose type differs", () => {
  const missingKey = fixture("T-003-missing-key");
  const typeMismatch = fixture("T-003-type-mismatch");
  const key = "file_path";

  const tsMissing = field(missingKey.payload.tool_input, key);
  const pyMissing = runPython({ fn: "field", container: missingKey.payload.tool_input, key });
  assert.equal(tsMissing, null, "hook_payload.ts: missing key");
  assert.equal(pyMissing, null, "hook_payload.py: missing key");
  assert.equal(tsMissing, pyMissing, "missing key: both implementations must agree");

  const tsMismatch = field(typeMismatch.payload.tool_input, key);
  const pyMismatch = runPython({ fn: "field", container: typeMismatch.payload.tool_input, key });
  assert.equal(tsMismatch, null, "hook_payload.ts: type mismatch");
  assert.equal(pyMismatch, null, "hook_payload.py: type mismatch");
  assert.equal(tsMismatch, pyMismatch, "type mismatch: both implementations must agree");
});

test("T-004 the comparison runs over at least one payload and both implementations return a non-empty value for every one", () => {
  const fixtures = loadFixtures();
  assert.ok(fixtures.length > 0, "the fixture file must carry at least one payload");

  for (const { id, payload } of fixtures) {
    const tsResult = field(payload, "tool_name");
    const pyResult = runPython({ fn: "field", container: payload, key: "tool_name" });

    assert.ok(typeof tsResult === "string" && tsResult.length > 0, `${id}: hook_payload.ts`);
    assert.ok(typeof pyResult === "string" && pyResult.length > 0, `${id}: hook_payload.py`);
    assert.equal(tsResult, pyResult, `${id}: both implementations must agree`);
  }
});

test("T-005 both implementations write the same notify envelope for a PostToolUse finding, the shape hooks/edit/rumdl_check.ts's notify call now depends on", () => {
  const message = "violation.md:2:1 [MD022] headings should be surrounded by blank lines";
  const hookEventName = "PostToolUse";

  const tsResult = notification(message, hookEventName);
  const pyResult = runPython({ fn: "notify", message, hookEventName });

  assert.deepEqual(tsResult, pyResult, "hook_payload.ts and hook_payload.py must agree");
  assert.equal(
    (tsResult as { systemMessage: string }).systemMessage,
    message,
    "the human channel must carry the finding verbatim",
  );
});
