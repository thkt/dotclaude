/// <reference types="node" />
// checked/run/TIMEOUT_SECONDS: ports the retired Python hook_harness module (issue #626), the
// same way workflows/_lib/tests/_brace.ts is the shared, `_`-prefixed, .ja-mirror-less helper
// other tests in its layer import from. The last Python hook tests that imported the retired
// module retired alongside it, so this file is the harness's only implementation now.
//
// Each scenario below drives a small positive-control fixture under fixtures/harness/
// (docs/wiki/absence-test-positive-control-fixture.md) rather than a real hook, so the
// assertion is about `checked`/`run`'s own behavior and not about what a particular hook does.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checked, run, TIMEOUT_SECONDS } from "./_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures", "harness");
const FAIL_FIXTURE = path.join(FIXTURES, "fail-with-stderr.ts");
const DUMP_ENV_FIXTURE = path.join(FIXTURES, "dump-env.ts");
const ECHO_STDIN_FIXTURE = path.join(FIXTURES, "echo-stdin.ts");

test("T-240 a hook that exits non-zero makes checked throw an error naming the hook and carrying its stderr", () => {
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

test("T-241 the env passed to checked replaces the process environment instead of extending it", () => {
  // A sentinel absent from the real process env, and PATH -- present in every real process env
  // -- both have to land the same way: the sentinel present, PATH gone, because the given env
  // is the whole child environment rather than an addition to the inherited one.
  assert.ok(process.env.PATH, "PATH must be present in this test process for the check below");

  const stdout = run(DUMP_ENV_FIXTURE, "", { HARNESS_SENTINEL: "only-this" });
  const receivedEnv: Record<string, string> = JSON.parse(stdout);

  // On darwin, __CF_USER_TEXT_ENCODING lands in every child process's env at launch even when
  // the exec environment is truly empty (verified with `env -i <node binary>`, bypassing
  // spawnSync entirely) -- macOS injects it independent of what env checked is given, so it is
  // not evidence of extend-vs-replace. Every var a real extend bug would leak (PATH, HOME, ...)
  // is still asserted below.
  delete receivedEnv.__CF_USER_TEXT_ENCODING;

  assert.deepEqual(receivedEnv, { HARNESS_SENTINEL: "only-this" });
});

test("T-242 an object payload reaches the hook as its JSON text and a string payload reaches it verbatim", () => {
  const objectPayload = { tool_name: "Bash", tool_input: { command: "echo hi" } };
  assert.equal(run(ECHO_STDIN_FIXTURE, objectPayload), JSON.stringify(objectPayload));

  const stringPayload = "raw string payload, not JSON: {not valid";
  assert.equal(run(ECHO_STDIN_FIXTURE, stringPayload), stringPayload);
});

test("T-266 the harness kills a hook at the same 60 seconds the retired Python module allowed", () => {
  // The two harnesses run the same hooks from the same settings, so a hook that fits one
  // budget and not the other would pass a test run and stall a real session.
  assert.equal(TIMEOUT_SECONDS, 60);
});
