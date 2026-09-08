/// <reference types="node" />
// Behavioral parity tests for skills/outcome/scripts/validate-outcome.ts against
// skills/outcome/scripts/validate-outcome.py, replayed from the frozen fixture
// skills/outcome/tests/fixtures/validate-outcome-cases.json (U-001). Reuses the shared
// runCli/withTempHome/fixture/assertStdoutShape harness from workflows/_lib/tests/_cli-fixture.ts
// instead of hand-rolling a second CLI-replay loop (skills/_lib/tests/harness-hash-cli.test.ts
// carries the sibling pattern for skills/_lib/harness_hash.ts, minted before this shared harness
// existed), and hooks/_lib/shebang_scope.ts's trackedEntries for the git-index mode check (T-179)
// instead of a standalone statSync or spawn.
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
const SCRIPT = join(HERE, "..", "scripts", "validate-outcome.ts");
// skills/outcome/tests -> skills/outcome -> skills -> repo root, the same climb
// skills/_lib/tests/harness-hash-cli.test.ts's REPO_ROOT makes from the same starting depth.
const REPO_ROOT = join(HERE, "..", "..", "..");

// One frozen replay case, shaped like skills/outcome/tests/fixtures/validate-outcome-cases.json
// (U-001): `files` writes each entry under a fresh temp dir before the run (absent for a case
// that names a real repo-tracked path directly, such as the shipped template, instead of a
// "<target-path>" placeholder); `argv` and `stdout` carry "<target-path>" tokens this test
// resolves to that temp dir's absolute path.
interface ValidateOutcomeCase {
  name: string;
  files?: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "validate-outcome-cases.json"), "utf8"),
) as ValidateOutcomeCase[];

const PLACEHOLDER = "<target-path>";

/** Runs one fixture case: writes its `files` under a fresh temp dir (when it carries one),
 * resolves the "<target-path>" token in `argv` to that dir's file, and asserts the CLI's exit
 * code and stdout against the case. A case with no `files` (the shipped-template case) runs
 * unresolved, with the repo root as cwd, against the literal repo-relative path it names. */
function runCase(testCase: ValidateOutcomeCase, home: string): void {
  let cwd = REPO_ROOT;
  let argv = testCase.argv;
  let placeholders: Record<string, string> = {};
  let workDir: string | undefined;
  try {
    if (testCase.files !== undefined) {
      workDir = mkdtempSync(join(tmpdir(), "validate-outcome-case-"));
      cwd = workDir;
      const [fileName, content] = Object.entries(testCase.files)[0] ?? ["OUTCOME.md", undefined];
      const targetPath = join(workDir, fileName);
      if (content !== undefined) writeFileSync(targetPath, content);
      argv = testCase.argv.map((token) => (token === PLACEHOLDER ? targetPath : token));
      placeholders = { [PLACEHOLDER]: targetPath };
    }
    const run = runCli(SCRIPT, home, "", argv, { cwd });
    assert.equal(run.status, testCase.exit, `${testCase.name}: exit code (stderr: ${run.stderr})`);
    assertStdoutShape(run.stdout, testCase.stdout, placeholders, {}, testCase.name);
  } finally {
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  }
}

test(
  "T-176 every frozen case in validate-outcome-cases.json reproduces the python validator's " +
    "exit code and stdout JSON with file resolved from the case's argv",
  () => {
    assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
    withTempHome((home) => {
      for (const testCase of CASES) {
        runCase(fixture(CASES, testCase.name), home);
      }
    });
  },
);

test(
  "T-177 the shipped template skills/outcome/templates/outcome.md exits 1 with a " +
    "placeholder_left error",
  () => {
    withTempHome((home) => {
      runCase(fixture(CASES, "bare_template_fails_until_filled"), home);
    });
  },
);

test("T-178 no argument exits 1 with nothing on stdout and a stderr line starting with Usage:", () => {
  withTempHome((home) => {
    const run = runCli(SCRIPT, home, "", [], { cwd: REPO_ROOT });
    assert.equal(run.status, 1, `exit code (stderr: ${run.stderr})`);
    assert.equal(run.stdout, "");
    assert.match(run.stderr, /^Usage:/);
  });
});

test("T-179 the script is tracked with mode 100755 in the git index and opens with #!/usr/bin/env node", () => {
  const entries = trackedEntries(["skills/outcome/scripts/validate-outcome.ts"]);
  assert.equal(entries.length, 1, "the script is tracked exactly once in the git index");
  const [mode, absolutePath] = entries[0];
  assert.equal(mode, "100755", "git index mode");
  const firstLine = readFileSync(absolutePath, "utf8").split(/\r?\n/, 1)[0];
  assert.equal(firstLine, "#!/usr/bin/env node", "shebang line");
});
