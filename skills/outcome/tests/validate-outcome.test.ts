/// <reference types="node" />
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
} from "../../_lib/tests/_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "validate-outcome.ts");
const REPO_ROOT = join(HERE, "..", "..", "..");

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
