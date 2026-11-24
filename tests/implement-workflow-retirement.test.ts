/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const REMOVED_FILES = [
  "workflows/implement.js",
  ".ja/workflows/implement.js",
  "workflows/implement/record.ts",
  ".ja/workflows/implement/record.ts",
  "workflows/implement/write-body.ts",
  ".ja/workflows/implement/write-body.ts",
  "workflows/implement/tests/implement.behavior.test.js",
  "workflows/implement/tests/record.test.ts",
  "workflows/implement/tests/write-body.test.ts",
  "skills/implement/scripts/host.ts",
  ".ja/skills/implement/scripts/host.ts",
  "skills/implement/scripts/sandbox_probe.ts",
  ".ja/skills/implement/scripts/sandbox_probe.ts",
  "skills/implement/tests/host.test.ts",
  "skills/implement/tests/sandbox-probe.test.ts",
  "skills/implement/references/stops.md",
  ".ja/skills/implement/references/stops.md",
];

const RETIRED_NAMES = [
  "implement/scripts/host.ts",
  "implement/scripts/sandbox_probe",
  "implement/references/stops.md",
  "implement/record",
  "implement/write-body",
  "implement.behavior",
];

const EXAMPLE_HOLDERS = [
  SELF_PATH,
  "tests/build-path-retirement.test.ts",
  "tests/retirement.test.ts",
];

const namesRetiredFile = (content: string) => RETIRED_NAMES.some((name) => content.includes(name));

test("none of the files the implement workflow retirement removed exists", () => {
  assert.equal(REMOVED_FILES.length, 17);
  const present = REMOVED_FILES.filter((path) => existsSync(join(REPO_ROOT, path)));
  assert.deepEqual(present, [], `removed files still on disk: ${present.join(", ")}`);
});

test("neither workflows/implement nor .ja/workflows/implement exists", () => {
  const present = ["workflows/implement", ".ja/workflows/implement"].filter((path) => existsSync(join(REPO_ROOT, path)));
  assert.deepEqual(present, [], `directories still on disk: ${present.join(", ")}`);
});

test("the retired-file predicate flags a line carrying each removed name and passes the same line once the name is removed", () => {
  for (const name of RETIRED_NAMES) assertDetectsAndMisses(namesRetiredFile, name);
});

test("no tracked file outside docs/decisions/, docs/research/ and the files holding the names as examples names a file the implement workflow retirement removed", () => {
  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    namesRetiredFile,
    EXAMPLE_HOLDERS,
  );
  assert.deepEqual(offenders, [], `files still naming a removed file: ${offenders.join(", ")}`);
});
