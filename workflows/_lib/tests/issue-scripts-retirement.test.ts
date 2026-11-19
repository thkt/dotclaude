/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const VALIDATE_ISSUE_BODY_PATTERN = /(^|[^\w.-])validate-issue-body\.py\b/;
const PICK_PLAN_PATTERN = /(^|[^\w.-])pick-plan\.py\b/;

function referencesRetiredScript(content: string): boolean {
  return VALIDATE_ISSUE_BODY_PATTERN.test(content) || PICK_PLAN_PATTERN.test(content);
}

test("no tracked file outside docs/decisions/ and docs/research/ references validate-issue-body.py or pick-plan.py as a word, and the same predicate flags a fixture line carrying each", () => {
  assertDetectsAndMisses(referencesRetiredScript, "validate-issue-body.py");
  assertDetectsAndMisses(referencesRetiredScript, "pick-plan.py");

  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredScript,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    "no tracked file outside docs/decisions/ and docs/research/ references " +
      `validate-issue-body.py or pick-plan.py\n${offenders.join(", ")}`,
  );
});
