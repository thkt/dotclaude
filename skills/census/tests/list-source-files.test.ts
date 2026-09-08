/// <reference types="node" />
// Behavioral parity tests for skills/census/scripts/list-source-files.ts against the retired
// Python original, replayed from the frozen fixture
// skills/census/tests/fixtures/list-source-files-cases.json (built the same way U-001 built
// skills/outcome/tests/fixtures/validate-outcome-cases.json and
// skills/research/tests/fixtures/find-prior-research-cases.json: run the real
// /opt/homebrew/bin/python3 lister against a constructed tree and freeze its exit code and
// stdout). Reuses the shared runCli/withTempHome/fixture harness from
// workflows/_lib/tests/_cli-fixture.ts (skills/outcome/tests/validate-outcome.test.ts and
// skills/research/tests/find-prior-research.test.ts carry the sibling pattern), and
// hooks/_lib/shebang_scope.ts's trackedEntries for the git-index mode check (T-186) instead of
// a standalone statSync or spawn.
//
// stdout here is plain "<lines> <path>" text, not JSON (unlike validate-outcome and
// find-prior-research), so a case is compared with assert.equal on the full text rather than
// assertStdoutShape's JSON-aware comparison.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";
import { runCli, withTempHome } from "../../../workflows/_lib/tests/_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "list-source-files.ts");
// skills/census/tests -> skills/census -> skills -> repo root, the same climb
// skills/outcome/tests/validate-outcome.test.ts's REPO_ROOT makes from the same starting depth.
const REPO_ROOT = join(HERE, "..", "..", "..");

const PLACEHOLDER = "<root>";

// One frozen replay case, shaped like skills/outcome/tests/fixtures/validate-outcome-cases.json
// (U-001) generalized to a whole tree instead of one file: `files` maps every relative path
// under the temp root (directories included via "/" in the key) to its content, `argv` and
// `stdout` carry "<root>" tokens this test resolves to that temp root's absolute path.
interface ListSourceFilesCase {
  name: string;
  files: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "list-source-files-cases.json"), "utf8"),
) as ListSourceFilesCase[];

function fixture(name: string): ListSourceFilesCase {
  const found = CASES.find((entry) => entry.name === name);
  assert.ok(found, `fixture case ${name} exists in the loaded fixtures`);
  return found as ListSourceFilesCase;
}

/** Writes `files` (relative path -> content, directories implied by "/" in the key) under a
 * fresh temp root, returning that root's absolute path. */
function writeTree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "list-source-files-case-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const target = join(root, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

/** Runs one fixture case: writes its `files` under a fresh temp root, resolves the "<root>"
 * token in `argv` to that root's absolute path, and asserts the CLI's exit code and stdout
 * (with the same token resolved) against the case. */
function runCase(testCase: ListSourceFilesCase, home: string): void {
  const root = writeTree(testCase.files);
  try {
    const argv = testCase.argv.map((token) => (token === PLACEHOLDER ? root : token));
    const run = runCli(SCRIPT, home, "", argv, { cwd: REPO_ROOT });
    assert.equal(run.status, testCase.exit, `${testCase.name}: exit code (stderr: ${run.stderr})`);
    assert.equal(
      run.stdout,
      testCase.stdout.replaceAll(PLACEHOLDER, root),
      `${testCase.name}: stdout`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test(
  "T-183 every frozen case in list-source-files-cases.json reproduces the python lister's " +
    "exit code and stdout lines in order with root substituted",
  () => {
    assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
    withTempHome((home) => {
      for (const testCase of CASES) {
        runCase(fixture(testCase.name), home);
      }
    });
  },
);

test("T-184 no argument exits 2 with nothing on stdout and a usage line on stderr", () => {
  withTempHome((home) => {
    const run = runCli(SCRIPT, home, "", [], { cwd: REPO_ROOT });
    assert.equal(run.status, 2, `exit code (stderr: ${run.stderr})`);
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, "usage: list-source-files.ts <repo-root>\n");
  });
});

test("T-185 a file the process cannot read is skipped while the rest of the tree is still listed", () => {
  withTempHome((home) => {
    const root = mkdtempSync(join(tmpdir(), "list-source-files-unreadable-"));
    const unreadable = join(root, "secret.ts");
    const readable = join(root, "visible.ts");
    writeFileSync(unreadable, "a\nb\nc\n");
    writeFileSync(readable, "x\n");
    chmodSync(unreadable, 0o000);
    try {
      const run = runCli(SCRIPT, home, "", [root], { cwd: REPO_ROOT });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      assert.equal(run.stdout, `1 ${readable}\n`);
    } finally {
      chmodSync(unreadable, 0o644);
      rmSync(root, { recursive: true, force: true });
    }
  });
});

test("T-186 the script is tracked with mode 100755 in the git index and opens with #!/usr/bin/env node", () => {
  const entries = trackedEntries(["skills/census/scripts/list-source-files.ts"]);
  assert.equal(entries.length, 1, "the script is tracked exactly once in the git index");
  const [mode, absolutePath] = entries[0];
  assert.equal(mode, "100755", "git index mode");
  const firstLine = readFileSync(absolutePath, "utf8").split(/\r?\n/, 1)[0];
  assert.equal(firstLine, "#!/usr/bin/env node", "shebang line");
});
