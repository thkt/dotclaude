/// <reference types="node" />
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checked, run } from "./_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures", "harness");
const FAIL_FIXTURE = path.join(FIXTURES, "fail-with-stderr.ts");
const DUMP_ENV_FIXTURE = path.join(FIXTURES, "dump-env.ts");
const ECHO_STDIN_FIXTURE = path.join(FIXTURES, "echo-stdin.ts");

test("a hook that exits non-zero makes checked throw an error naming the hook and carrying its stderr", () => {
  assert.throws(
    () => checked(FAIL_FIXTURE, ""),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /fail-with-stderr\.ts/);
      assert.match(error.message, /boom from fail-with-stderr fixture/);
      return true;
    },
  );
});

test("the env passed to checked replaces the process environment instead of extending it", () => {
  assert.ok(process.env.PATH, "PATH must be present in this test process for the check below");

  const stdout = run(DUMP_ENV_FIXTURE, "", { HARNESS_SENTINEL: "only-this" });
  const receivedEnv: Record<string, string> = JSON.parse(stdout);

  delete receivedEnv.__CF_USER_TEXT_ENCODING;

  assert.deepEqual(receivedEnv, { HARNESS_SENTINEL: "only-this" });
});

test("an object payload reaches the hook as its JSON text and a string payload reaches it verbatim", () => {
  const objectPayload = { tool_name: "Bash", tool_input: { command: "echo hi" } };
  assert.equal(run(ECHO_STDIN_FIXTURE, objectPayload), JSON.stringify(objectPayload));

  const stringPayload = "raw string payload, not JSON: {not valid";
  assert.equal(run(ECHO_STDIN_FIXTURE, stringPayload), stringPayload);
});
