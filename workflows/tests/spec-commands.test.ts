import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const read = (relativePath: string): string => readFileSync(join(ROOT, relativePath), "utf8");

function nodeTestsStepGlobs(workflowSource: string): string[] {
  const stepMatch = workflowSource.match(/- name: Node tests\n\s+run: >\n([\s\S]*?)\n\n/);
  assert.ok(stepMatch, 'test.yml carries no "Node tests" step in the run: > shape this test expects');
  return [...(stepMatch as RegExpMatchArray)[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

test("T-437 every glob the CI Node tests step names appears in the SPEC's verification command, read from test.yml rather than restated", () => {
  const globs = nodeTestsStepGlobs(read(".github/workflows/test.yml"));
  assert.ok(globs.length > 0, "no glob was extracted from the CI Node tests step");
  const spec = read("docs/SPEC.md");
  for (const glob of globs) {
    assert.ok(
      spec.includes(glob),
      `test.yml's Node tests step names "${glob}", which docs/SPEC.md's verification commands do not carry`,
    );
  }
});
