/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hookCommands } from "./_settings-hooks.ts";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_PYTHON = /(^|[^\w.-])recall_index(_test)?\.py\b/;

function referencesRetiredPython(content: string): boolean {
  return RETIRED_PYTHON.test(content);
}

test("T-247 no tracked file outside docs/decisions/ and docs/research/ references recall_index.py or recall_index_test.py as a word, and the same predicate flags a fixture line carrying it", () => {
  assertDetectsAndMisses(referencesRetiredPython, "recall_index.py");
  assertDetectsAndMisses(referencesRetiredPython, "recall_index_test.py");

  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPython,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming recall_index.py or recall_index_test.py (docs/decisions/ and ` +
      `docs/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

test("T-248 no SessionStart command in settings.json names recall_index.py", () => {
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, "settings.json"), "utf8"));
  const sessionStartCommandList = hookCommands(settings, "SessionStart");
  assert.equal(
    sessionStartCommandList.some((command) => RETIRED_PYTHON.test(command)),
    false,
    "settings.json SessionStart still names recall_index.py",
  );
});
