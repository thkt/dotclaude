/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { editedFile, field, notification } from "../hook_payload.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
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

test("field returns the command string of a PreToolUse Bash payload", () => {
  const { payload } = fixture("pretooluse-bash");

  assert.equal(field(payload.tool_input, "command"), "echo hello world");
});

test("editedFile returns the written path of a PostToolUse Write payload", () => {
  const { payload } = fixture("posttooluse-write");

  assert.equal(editedFile(JSON.stringify(payload)), "/tmp/hook-payload-example.txt");
});

test("field returns null rather than undefined for a payload missing a key and for one whose tool_input is not a mapping", () => {
  const missingKey = fixture("missing-key");
  const typeMismatch = fixture("type-mismatch");
  const key = "file_path";

  assert.strictEqual(field(missingKey.payload.tool_input, key), null, "missing key");
  assert.strictEqual(field(typeMismatch.payload.tool_input, key), null, "type mismatch");
});

test("notification returns the envelope shape hooks/edit/rumdl_check.ts's notify call depends on, with the finding verbatim in both channels", () => {
  const message = "violation.md:2:1 [MD022] headings should be surrounded by blank lines";

  assert.deepEqual(notification(message, "PostToolUse"), {
    systemMessage: message,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: message,
    },
  });
});
