/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_PATTERN = /(^|[^\w.-])pr-body\.py\b/;

function referencesRetiredPath(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-129 no tracked file outside docs/decisions/ and docs/research/ references pr-body.py as " +
    "a word, and the same predicate flags a fixture line carrying it",
  () => {
    assertDetectsAndMisses(referencesRetiredPath, "pr-body.py");

    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredPath,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      `no tracked file outside docs/decisions/ and docs/research/ references pr-body.py\n${offenders.join(", ")}`,
    );
  },
);
