/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_NAMES = [
  "conventions/WORKFLOWS.md",
  "claude-run.ts",
  "## Workflow contract",
  "## Workflow 契約",
];

const namesRetiredDoc = (content: string) => RETIRED_NAMES.some((name) => content.includes(name));

test("the retired-doc predicate flags a line carrying each retired name and passes the same line once the name is removed", () => {
  for (const name of RETIRED_NAMES) assertDetectsAndMisses(namesRetiredDoc, name);
});

test("git tracks neither rules/conventions/WORKFLOWS.md nor .ja/rules/conventions/WORKFLOWS.md, while it tracks rules/conventions/MIRROR.md", () => {
  const files = trackedFiles(REPO_ROOT);
  assert.ok(files.includes("rules/conventions/MIRROR.md"), "git does not track rules/conventions/MIRROR.md");
  const leftovers = ["rules/conventions/WORKFLOWS.md", ".ja/rules/conventions/WORKFLOWS.md"].filter((path) =>
    files.includes(path),
  );
  assert.deepEqual(leftovers, [], `git still tracks: ${leftovers.join(", ")}`);
});

test("no tracked file outside docs/decisions/, docs/research/ and this test names the workflow conventions file, claude-run.ts, or the SPEC's workflow contract heading", () => {
  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    namesRetiredDoc,
    [SELF_PATH],
  );
  assert.deepEqual(offenders, [], `files still naming a retired doc: ${offenders.join(", ")}`);
});

const RETIRED_WORKFLOW_WORDS = ["implement workflow", "workflows/_lib/", "Workflows Layer"];

const namesRetiredWorkflow = (content: string) => RETIRED_WORKFLOW_WORDS.some((word) => content.includes(word));

test("the retired-workflow predicate flags a line carrying each retired word and passes the same line once the word is removed", () => {
  for (const word of RETIRED_WORKFLOW_WORDS) assertDetectsAndMisses(namesRetiredWorkflow, word);
});

test("no tracked .md or .json file outside docs/decisions/ and docs/research/ names the implement workflow, workflows/_lib/, or the Workflows Layer, and the scan reaches README.md and .claude-plugin/marketplace.json", () => {
  const docs = trackedFiles(REPO_ROOT).filter((path) => path.endsWith(".md") || path.endsWith(".json"));
  for (const path of ["README.md", ".claude-plugin/marketplace.json"]) {
    assert.ok(docs.includes(path), `the scan does not reach ${path}`);
  }
  const offenders = offendersAmong(docs, (path) => readFileSync(join(REPO_ROOT, path), "utf8"), namesRetiredWorkflow);
  assert.deepEqual(offenders, [], `files still describing the retired workflow: ${offenders.join(", ")}`);
});
