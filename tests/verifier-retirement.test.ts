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

const RETIRED_NAMES = ["revalidate.py", "verify-tests.py", "diff-files.py", "verify-pr.py"];
const RETIRED_PATTERN = new RegExp(
  `(^|[^\\w.-])(?:${RETIRED_NAMES.map((name) => name.replace(/[.-]/g, "\\$&")).join("|")})\\b`,
);

function referencesRetiredScript(content: string): boolean {
  return RETIRED_PATTERN.test(content);
}

test(
  "T-149 no tracked file outside docs/decisions/ and docs/research/ references " +
    "revalidate.py, verify-tests.py, " +
    "diff-files.py or verify-pr.py as a word, and the same predicate flags a fixture line " +
    "carrying one",
  () => {
    for (const name of RETIRED_NAMES) assertDetectsAndMisses(referencesRetiredScript, name);

    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      referencesRetiredScript,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      "no tracked file outside docs/decisions/ and docs/research/ references a retired " +
        `verifier script\n${offenders.join(", ")}`,
    );
  },
);
