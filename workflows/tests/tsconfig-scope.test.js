// What tsconfig.json puts in the type-check set, read by running tsc rather than by
// reimplementing its include/exclude resolution here. --listFilesOnly is tsc's own option for
// printing the files a compile would take and then exiting (confirmed via `tsc --help --all`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..", "..");
const TSC_BIN = path.join(ROOT, "node_modules", ".bin", "tsc");
const TSCONFIG = path.join(ROOT, "tsconfig.json");
// The fixture both tests read. Committed rather than written per run: the sandbox denies
// writes under workflows/, so creating it at test time fails with EPERM.
const FIXTURE = "workflows/tests/fixtures/tsconfig-scope-fixture.ts";
// T-254's positive control: one committed .ts per directory, each untouched by an import, for
// the same EPERM reason FIXTURE above is committed rather than written at test time.
const TESTS_FIXTURE = "tests/fixtures/tsconfig-scope-fixture.ts";
const AGENTS_FIXTURE = "agents/_lib/tests/fixtures/tsconfig-scope-fixture.ts";

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

// tsc compiles the whole project to answer this, so it runs once for the file rather than
// once per test.
let cached;
function listTypeCheckedFiles() {
  if (cached) return cached;
  assert.ok(
    existsSync(TSC_BIN),
    `${TSC_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  const output = execFileSync(TSC_BIN, ["-p", TSCONFIG, "--listFilesOnly"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  cached = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix)
    .filter((file) => !file.includes("/node_modules/"));
  return cached;
}

test("T-001 the type-check set contains no .ts under skills/*/test/cases", () => {
  const files = listTypeCheckedFiles();
  // Positive control first: without it, a resolution that returns nothing at all satisfies the
  // emptiness assertion below and the test reports success on a broken config.
  assert.ok(
    files.some((file) => file.endsWith(FIXTURE)),
    `the resolution returned no ${FIXTURE}, so an empty result below would prove nothing`,
  );
  const skillsTestCaseFiles = files.filter((file) => /\/skills\/[^/]+\/test\/cases\//.test(file));
  assert.deepEqual(skillsTestCaseFiles, []);
});

test("T-002 the type-check set contains the .ts under workflows", () => {
  const files = listTypeCheckedFiles();
  // The fixture by name, not a count: any workflows/ file would satisfy a count while the
  // fixture itself had dropped out of the include.
  assert.ok(
    files.some((file) => file.endsWith(FIXTURE)),
    `${FIXTURE} is not in the type-check set`,
  );
});

test("T-044 the type-check set contains workflows/_lib/run-workflow.ts and workflows/_lib/codex-run.ts", () => {
  const files = listTypeCheckedFiles();
  for (const target of ["workflows/_lib/run-workflow.ts", "workflows/_lib/codex-run.ts"]) {
    assert.ok(
      files.some((file) => file.endsWith(target)),
      `${target} is not in the type-check set`,
    );
  }
});

test("T-254 the type-check set contains every tracked .ts under the tests and agents directories, compared as a set of names against git ls-files", () => {
  // Names, not tsc's absolute paths: listTypeCheckedFiles() reports files rooted at ROOT, and
  // git ls-files already reports repo-relative names, so the file's own name is the join point.
  const checkedNames = new Set(
    listTypeCheckedFiles().map((file) => toPosix(path.relative(ROOT, file))),
  );
  // `tests/*.ts`, not `tests/**/*.ts`: git's default pathspec matching lets `*` cross `/`, so
  // the `**` form requires a literal `/` after it and never matches a file sitting directly
  // under tests/. That silently cut the tracked set from 9 names to 1 -- the depth-2 fixture --
  // leaving the eight renamed tests, the reason this check exists, out of the comparison.
  const tracked = execFileSync("git", ["ls-files", "tests/*.ts", "agents/*.ts"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  // Positive control: without a real tracked file under each directory, an empty `tracked`
  // makes the loop below vacuously pass on a config that never resolves tests/**/*.ts or
  // agents/**/*.ts at all.
  for (const fixture of [TESTS_FIXTURE, AGENTS_FIXTURE]) {
    assert.ok(
      tracked.includes(fixture),
      `${fixture} is not tracked by git, so this test proves nothing`,
    );
  }
  for (const name of tracked) {
    assert.ok(checkedNames.has(name), `${name} is tracked but missing from the type-check set`);
  }
});

// T-254 puts tests/**/*.ts and agents/**/*.ts in the type-check set; the Node tests step
// names its globs one by one, so a file tsc now compiles still does not run in CI until this
// step names it too.
test("T-255 the Node tests step in .github/workflows/test.yml carries tests/*.test.ts and agents/**/tests/*.test.ts", () => {
  const workflow = readFileSync(path.join(ROOT, ".github", "workflows", "test.yml"), "utf8");
  const step = workflow.slice(workflow.indexOf("- name: Node tests"));
  assert.ok(step.startsWith("- name: Node tests"), "the Node tests step is missing from test.yml");
  const stepBody = step.slice(0, step.indexOf("- name:", 1));
  assert.match(stepBody, /"tests\/\*\.test\.ts"/);
  assert.match(stepBody, /"agents\/\*\*\/tests\/\*\.test\.ts"/);
});
