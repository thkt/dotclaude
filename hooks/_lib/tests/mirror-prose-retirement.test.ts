/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SHEBANG, trackedEntries } from "../../_lib/shebang_scope.ts";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_PYTHON = /(^|[^\w.-])mirror_prose(_guard)?\.py\b/;

function referencesRetiredPython(content: string): boolean {
  return RETIRED_PYTHON.test(content);
}

test("T-375 no tracked file outside the historical directories names mirror_prose.py or mirror_prose_guard.py as a word, and the same predicate flags a fixture line carrying each", () => {
  assertDetectsAndMisses(referencesRetiredPython, "mirror_prose.py");
  assertDetectsAndMisses(referencesRetiredPython, "mirror_prose_guard.py");

  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPython,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming mirror_prose.py or mirror_prose_guard.py (docs/decisions/ and ` +
      `docs/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

test("T-374 mirror_prose_guard.ts is a tracked file that carries the exec bit and opens with the bun shebang", () => {
  const rel = "hooks/edit/mirror_prose_guard.ts";
  const trackedModes = new Map(
    trackedEntries("hooks/*.ts").map(([mode, absolutePath]) => [
      relative(REPO_ROOT, absolutePath),
      mode,
    ]),
  );

  assert.equal(trackedModes.get(rel), "100755", `${rel} must carry the exec bit`);
  assert.equal(
    readFileSync(join(REPO_ROOT, rel), "utf8").split(/\r?\n/, 1)[0],
    SHEBANG,
    `${rel} must open with the bun shebang`,
  );
});
