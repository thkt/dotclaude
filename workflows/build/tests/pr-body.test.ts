/// <reference types="node" />
// Behavior tests for workflows/build/pr-body.ts, the TypeScript port of the Python build
// workflow PR-body tail renderer. T-125 replays the frozen fixture in
// tests/fixtures/pr-body-cases.json, produced by running the Python renderer itself before it
// was retired (U-001), and compares the port's stdin/stdout/exit against it case by case, byte
// for byte. The replay itself (runCli, withTempHome, fixture) lives in
// workflows/_lib/tests/_cli-fixture.ts, shared with workflows/build/tests/record.test.ts.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture, runCli, withTempHome, type FixtureCase } from "../../_lib/tests/_cli-fixture.ts";
import { LABELS } from "../pr-body.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "pr-body.ts");
const SOURCE = readFileSync(SCRIPT, "utf8");
const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "pr-body-cases.json"), "utf8"),
) as FixtureCase[];

const ENGLISH_HEADER_SNIPPET = "Below is the build workflow's automated verification";
const JAPANESE_HEADER_SNIPPET = "下は build workflow の自動検証結果";

/** Writes $HOME/.claude/settings.json under `home` so pr-body's default-language lookup can
 * read it. `content` is written verbatim, so a caller can hand it unparseable text on purpose. */
function writeSettings(home: string, content: string): void {
  const dir = join(home, ".claude");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "settings.json"), content);
}

test("T-125 every frozen case in pr-body-cases.json reproduces the python renderer's exit code and its stdout markdown byte for byte", () => {
  for (const testCase of FIXTURES) {
    withTempHome((home) => {
      const result = runCli(SCRIPT, home, testCase.stdin);
      assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
      assert.equal(result.stdout, testCase.stdout, `${testCase.name}: stdout`);
    });
  }
});

test("T-126 an unparseable payload, a non-object payload, and a payload missing tests_pass or gates_pass each exit 1 with nothing on stdout and a stderr line starting with the python renderer's message prefix", () => {
  for (const name of [
    "invalid_json",
    "non_object_json",
    "missing_tests_pass",
    "missing_gates_pass",
  ]) {
    const testCase = fixture(FIXTURES, name);
    withTempHome((home) => {
      const result = runCli(SCRIPT, home, testCase.stdin);
      assert.equal(result.status, 1, `${name}: exit code`);
      assert.equal(result.stdout, "", `${name}: stdout`);
      assert.equal(result.stderr.startsWith("Error: "), true, `${name}: stderr prefix`);
    });
  }
});

test("T-127 a payload without language reads $HOME/.claude/settings.json for it and falls back to english when that file is absent or carries no string language", () => {
  const clean = fixture(FIXTURES, "CLEAN");

  withTempHome((home) => {
    writeSettings(home, JSON.stringify({ language: "japanese" }));
    const result = runCli(SCRIPT, home, clean.stdin);
    assert.equal(result.status, 0, "settings language honored: exit code");
    assert.equal(
      result.stdout.includes(JAPANESE_HEADER_SNIPPET),
      true,
      "settings language honored: renders in the language settings.json names",
    );
  });

  withTempHome((home) => {
    const result = runCli(SCRIPT, home, clean.stdin);
    assert.equal(result.status, 0, "settings.json absent: exit code");
    assert.equal(
      result.stdout.includes(ENGLISH_HEADER_SNIPPET),
      true,
      "settings.json absent: falls back to english",
    );
  });

  withTempHome((home) => {
    writeSettings(home, "not json");
    const result = runCli(SCRIPT, home, clean.stdin);
    assert.equal(result.status, 0, "settings.json unparseable: exit code");
    assert.equal(
      result.stdout.includes(ENGLISH_HEADER_SNIPPET),
      true,
      "settings.json unparseable: falls back to english",
    );
  });

  withTempHome((home) => {
    writeSettings(home, JSON.stringify({ language: 42 }));
    const result = runCli(SCRIPT, home, clean.stdin);
    assert.equal(result.status, 0, "settings.json language not a string: exit code");
    assert.equal(
      result.stdout.includes(ENGLISH_HEADER_SNIPPET),
      true,
      "settings.json language not a string: falls back to english",
    );
  });
});

test("T-128 the english and japanese label tables carry the same key set and every key is rendered by the source text", () => {
  assert.deepEqual(
    Object.keys(LABELS.english).sort(),
    Object.keys(LABELS.japanese).sort(),
    "a label added to one language is added to the other",
  );

  // A label whose producer is gone renders nothing, so no assertion on the output catches it.
  // Search only the source after the LABELS object's own close, so a key merely defined inside
  // the label table (rather than actually read by render()) does not count.
  const marker = "export const LABELS";
  const start = SOURCE.indexOf(marker);
  assert.ok(start >= 0, "LABELS block is present in source");
  const closeIndex = SOURCE.indexOf("};\n\n", start);
  assert.ok(closeIndex >= 0, "LABELS block has a locatable close");
  const body = SOURCE.slice(closeIndex);
  for (const key of Object.keys(LABELS.english)) {
    assert.ok(body.includes(key), `${key} is a label nothing renders`);
  }
});
