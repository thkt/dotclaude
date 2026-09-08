/// <reference types="node" />
// Behavioral parity tests for skills/research/scripts/find-prior-research.ts against the retired
// Python original, replayed from the frozen fixture
// skills/research/tests/fixtures/find-prior-research-cases.json (U-001). Reuses the shared
// runCli/withTempHome/fixture/assertStdoutShape harness from workflows/_lib/tests/_cli-fixture.ts
// (skills/outcome/tests/validate-outcome.test.ts carries the sibling pattern for
// skills/outcome/scripts/validate-outcome.ts), and hooks/_lib/shebang_scope.ts's trackedEntries
// for the git-index mode check (T-182) instead of a standalone statSync or spawn.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";
import {
  assertStdoutShape,
  fixture,
  runCli,
  withTempHome,
} from "../../../workflows/_lib/tests/_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "find-prior-research.ts");

// One frozen replay case, shaped like skills/research/tests/fixtures/find-prior-research-cases.json
// (U-001): `files` writes each entry into a fresh temp dir that becomes the run's cwd -- the
// python script defaults its search-dir argument to "", which Path("") resolves as the current
// directory -- and `argv` carries only the slug, the same way every frozen case leaves the
// search-dir argument off.
interface FindPriorResearchCase {
  name: string;
  files: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "find-prior-research-cases.json"), "utf8"),
) as FindPriorResearchCase[];

/** Runs one fixture case: writes its `files` under a fresh temp dir, runs the CLI with that dir
 * as cwd, and asserts the CLI's exit code and stdout against the case. */
function runCase(testCase: FindPriorResearchCase, home: string): void {
  const workDir = mkdtempSync(join(tmpdir(), "find-prior-research-case-"));
  try {
    for (const [fileName, content] of Object.entries(testCase.files)) {
      writeFileSync(join(workDir, fileName), content);
    }
    const run = runCli(SCRIPT, home, "", testCase.argv, { cwd: workDir });
    assert.equal(run.status, testCase.exit, `${testCase.name}: exit code (stderr: ${run.stderr})`);
    assertStdoutShape(run.stdout, testCase.stdout, {}, {}, testCase.name);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

test(
  "T-180 every frozen case in find-prior-research-cases.json reproduces the python scanner's " +
    "exit code and stdout JSON including the candidate order",
  () => {
    assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
    withTempHome((home) => {
      for (const testCase of CASES) {
        runCase(fixture(CASES, testCase.name), home);
      }
    });
  },
);

test("T-181 two candidates sharing the same count come back in file name order", () => {
  withTempHome((home) => {
    const workDir = mkdtempSync(join(tmpdir(), "find-prior-research-tie-"));
    try {
      // "apple-only" shares {apple} with the slug "apple-banana", and "banana-only" shares
      // {banana}: both count 1, so a shared-descending sort alone leaves the tie unresolved.
      // Writing "banana-only.md" first checks that the file-ascending tiebreak, not directory
      // arrival order, decides the order.
      writeFileSync(join(workDir, "banana-only.md"), "");
      writeFileSync(join(workDir, "apple-only.md"), "");
      const run = runCli(SCRIPT, home, "", ["apple-banana"], { cwd: workDir });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      const parsed = JSON.parse(run.stdout) as {
        candidates: Array<{ file: string; shared: number }>;
      };
      assert.deepEqual(parsed.candidates, [
        { file: "apple-only.md", shared: 1 },
        { file: "banana-only.md", shared: 1 },
      ]);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});

test(
  "T-182 the script is tracked with mode 100755 in the git index and opens with " +
    "#!/usr/bin/env node",
  () => {
    const entries = trackedEntries(["skills/research/scripts/find-prior-research.ts"]);
    assert.equal(entries.length, 1, "the script is tracked exactly once in the git index");
    const [mode, absolutePath] = entries[0];
    assert.equal(mode, "100755", "git index mode");
    const firstLine = readFileSync(absolutePath, "utf8").split(/\r?\n/, 1)[0];
    assert.equal(firstLine, "#!/usr/bin/env node", "shebang line");
  },
);
