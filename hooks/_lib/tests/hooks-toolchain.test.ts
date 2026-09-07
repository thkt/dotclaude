/// <reference types="node" />
// Whether hooks/**'s .ts files sit inside the repository's type-check set and CI's Node tests
// step, and outside both oxlint's ignorePatterns and tsconfig's exclude. Each check runs the
// real tool (tsc, oxlint) and reads its own output, following workflows/tests/tsconfig-
// scope.test.js's listTypeCheckedFiles rather than reimplementing include/exclude/ignore
// resolution here.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../shebang_scope.ts";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const TSC_BIN = path.join(ROOT, "node_modules", ".bin", "tsc");
const TSCONFIG = path.join(ROOT, "tsconfig.json");
const OXLINT_BIN = path.join(ROOT, "node_modules", ".bin", "oxlint");

// hooks/_lib/tests/fixtures, mirrored from shebang_scope.ts's own (unexported) FIXTURES_ROOT:
// the literal a caller pathspec has to contain for trackedEntries to skip its default
// fixtures/-drop. This file's own derivation below deliberately keeps fixtures in scope --
// unlike shebang-ts.test.ts's shebang-check use, a fixture .ts here is a real tsc/oxlint subject
// (confirmed: both tools already process the three shebang/ fixtures today), not a violation to
// hide from a scan.
const FIXTURES_ROOT = "hooks/_lib/tests/fixtures";

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

// tsc compiles the whole project to answer this, so it runs once for the file rather than once
// per test. Mirrors workflows/tests/tsconfig-scope.test.js's listTypeCheckedFiles.
let typeCheckedFiles: string[] | undefined;
function listTypeCheckedFiles(): string[] {
  if (typeCheckedFiles) return typeCheckedFiles;
  assert.ok(
    existsSync(TSC_BIN),
    `${TSC_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  const output = execFileSync(TSC_BIN, ["-p", TSCONFIG, "--listFilesOnly"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  typeCheckedFiles = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix)
    .filter((file) => !file.includes("/node_modules/"));
  return typeCheckedFiles;
}

// oxlint's own file discovery, spawned once and cached the same way: reading its output is the
// real ignorePatterns resolution rather than a reimplementation of oxlint's globbing.
// --debug=files is oxlint's own option for printing the files a run would lint and then exiting
// (confirmed via `npx oxlint --help`).
let oxlintFiles: string[] | undefined;
function listOxlintFiles(): string[] {
  if (oxlintFiles) return oxlintFiles;
  assert.ok(
    existsSync(OXLINT_BIN),
    `${OXLINT_BIN} is missing: run the repository's install step (bun install) before this suite`,
  );
  const output = execFileSync(OXLINT_BIN, ["--debug=files", "."], {
    cwd: ROOT,
    encoding: "utf8",
  });
  oxlintFiles = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix);
  return oxlintFiles;
}

test("T-005 the tsc --listFilesOnly output carries hooks/_lib/hook_payload.ts", () => {
  const files = listTypeCheckedFiles();
  assert.ok(
    files.some((file) => file.endsWith("hooks/_lib/hook_payload.ts")),
    "hooks/_lib/hook_payload.ts is not in the type-check set",
  );
});

// The Python step is a find over the tree, so retiring a *_test.py drops it from CI on its own.
// Adding a .test.ts does not: the Node step names its globs one by one, and a ported test that
// no glob reaches leaves CI green having run nothing.
test("T-006 the Node tests step in .github/workflows/test.yml carries hooks/**/tests/*.test.ts", () => {
  const workflow = readFileSync(path.join(ROOT, ".github", "workflows", "test.yml"), "utf8");
  const step = workflow.slice(workflow.indexOf("- name: Node tests"));
  assert.ok(step.startsWith("- name: Node tests"), "the Node tests step is missing from test.yml");
  assert.match(step.slice(0, step.indexOf("- name:", 1)), /"hooks\/\*\*\/tests\/\*\.test\.ts"/);
});

// hooks/_lib/hook_payload.ts and its differential test already clear oxlint's ignorePatterns
// today (oxlint has no hooks/ entry to drop them with); the gap is tsconfig's include, which the
// tsc half below exercises through the real compiler instead of a re-implemented glob match.
// Kept as one assertion pair per file so a future ignorePatterns/exclude entry that reintroduces
// a hooks/ drop fails here rather than silently narrowing coverage again.
//
// TODO(U-004 contract): this is still the hand-picked pair from before the plan -- T-014 below
// pins the requirement that this becomes trackedEntries's own derivation of hooks/**/*.ts
// (fixtures included) instead of a literal list two files wide.
const HOOKS_TS_FILES = [
  "hooks/_lib/hook_payload.ts",
  "hooks/_lib/tests/hook-payload-parity.test.ts",
];

test("T-007 neither .oxlintrc.json's ignorePatterns nor tsconfig.json's exclude drops hooks/", () => {
  const oxlintSet = listOxlintFiles();
  const tscSet = listTypeCheckedFiles();
  for (const file of HOOKS_TS_FILES) {
    assert.ok(
      oxlintSet.some((entry) => entry.endsWith(file)),
      `oxlint's ignorePatterns dropped ${file}`,
    );
    assert.ok(
      tscSet.some((entry) => entry.endsWith(file)),
      `tsconfig's exclude (or a missing include) dropped ${file}`,
    );
  }
});

// The seam this unit (U-004) adds: HOOKS_TS_FILES above is meant to stop being a hand-picked
// literal and become whatever U-001's shared trackedEntries derives from the tracked tree (the
// same git ls-files -s read shebang_scope.ts's other exports already run through) -- so this
// test reads HOOKS_TS_FILES itself, not a second independent computation, and fails the moment
// the two diverge. Fixtures are deliberately in scope here (see FIXTURES_ROOT above): the
// pathspec below names FIXTURES_ROOT directly so trackedEntries's default fixtures/-drop (aimed
// at shebang-ts.test.ts's positive controls) does not apply to this toolchain-scope reading.
test("T-014 the hooks .ts set the toolchain scope check reads is derived from the tracked tree, is not empty, and contains every .ts this plan adds under hooks/", () => {
  assert.ok(HOOKS_TS_FILES.length > 0, "HOOKS_TS_FILES must not be empty");

  const derivedFromTrackedTree = trackedEntries(["hooks/**/*.ts", `${FIXTURES_ROOT}/**/*.ts`])
    .map(([, absolutePath]) => toPosix(path.relative(ROOT, absolutePath)))
    .sort();
  assert.deepEqual(
    [...HOOKS_TS_FILES].sort(),
    derivedFromTrackedTree,
    "HOOKS_TS_FILES must equal the tracked tree's hooks/**/*.ts set (fixtures included), " +
      "not a hand-picked subset of it",
  );

  // Every .ts this plan (U-001..U-004) adds under hooks/ -- U-003 added none (docs only).
  const planAddedFiles = [
    "hooks/_lib/shebang_scope.ts",
    "hooks/_lib/tests/shebang-scope.test.ts",
    "hooks/_lib/tests/shebang-ts.test.ts",
    "hooks/_lib/tests/fixtures/shebang/exec-bit-wrong-shebang.ts",
    "hooks/_lib/tests/fixtures/shebang/stale-env-bun.ts",
    "hooks/_lib/tests/fixtures/shebang/_lib/has-shebang.ts",
    "hooks/_lib/tests/bun-runtime.test.ts",
  ];
  const missing = planAddedFiles.filter((file) => !HOOKS_TS_FILES.includes(file));
  assert.deepEqual(
    missing,
    [],
    `HOOKS_TS_FILES is missing .ts files this plan adds under hooks/: ${missing.join(", ")}`,
  );
});
