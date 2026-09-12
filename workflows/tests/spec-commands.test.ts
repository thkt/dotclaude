// The CI workflow's Node tests step is the executed contract; docs/SPEC.md's Quality gates
// table and "What to touch" confirmation column describe it in prose. Reading the step's globs
// from .github/workflows/test.yml here, instead of retyping them, keeps this test from going
// stale the way the doc did: a glob added to the step needs no matching edit here to stay
// checked, only in SPEC.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const read = (relativePath: string): string => readFileSync(join(ROOT, relativePath), "utf8");

// The Node tests step's `run: >` block, as the lines between its own header and the next blank
// line. Parsed as text rather than through a YAML library: no YAML parser is among this
// repository's own dependencies (package.json carries none), and every glob the step names is a
// quoted literal a regex reads directly.
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
