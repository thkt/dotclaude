/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

function callsGitInitDirectly(content: string, path: string): boolean {
  if (!path.endsWith(".test.ts")) return false;
  if (!content.includes("git init")) return false;
  return !content.includes("withTempRepo");
}

const FIXTURE_PATH = "workflows/example/tests/example.test.ts";
const OFFENDING_FIXTURE_SOURCE =
  'import test from "node:test";\n' +
  'import { execSync } from "node:child_process";\n' +
  "\n" +
  'test("creates a repo", () => {\n' +
  '  execSync("git init -q");\n' +
  "});\n";
const CLEAN_FIXTURE_SOURCE = OFFENDING_FIXTURE_SOURCE.replace(
  'import test from "node:test";\n',
  'import test from "node:test";\n' + 'import { withTempRepo } from "./_git-repo.ts";\n',
);

test(
  "T-422 no tracked .test.ts runs git init without importing the helper, and the same " +
    "predicate flags a fixture source that does",
  () => {
    assert.equal(
      callsGitInitDirectly(OFFENDING_FIXTURE_SOURCE, FIXTURE_PATH),
      true,
      "positive control: a fixture .test.ts calling git init without the helper import is detected",
    );
    assert.equal(
      callsGitInitDirectly(CLEAN_FIXTURE_SOURCE, FIXTURE_PATH),
      false,
      "positive control: the same predicate misses a fixture that also names withTempRepo",
    );

    const offenders = offendersAmong(
      trackedFiles(REPO_ROOT),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      callsGitInitDirectly,
      [SELF_PATH],
    );
    assert.deepEqual(
      offenders,
      [],
      `tracked .test.ts files still calling git init directly instead of withTempRepo: ${offenders.join(", ")}`,
    );
  },
);
