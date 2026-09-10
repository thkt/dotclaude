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

// Every tracked .ts under hooks/, fixtures included: a fixture .ts is a real tsc / oxlint
// subject here. Spawned inside a test like the two listings above, so a missing git fails T-007
// and T-014 by name rather than the whole file.
let hooksTsFiles: string[] | undefined;
function listHooksTsFiles(): string[] {
  hooksTsFiles ??= trackedEntries("hooks/*.ts")
    .map(([, absolutePath]) => toPosix(path.relative(ROOT, absolutePath)))
    .sort();
  return hooksTsFiles;
}

test("T-007 neither .oxlintrc.json's ignorePatterns nor tsconfig.json's exclude drops hooks/", () => {
  const oxlintSet = listOxlintFiles();
  const tscSet = listTypeCheckedFiles();
  for (const file of listHooksTsFiles()) {
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

// An empty derivation would let T-007 pass having checked nothing, and a derivation that
// drops a known file would let tsc / oxlint scope narrow unnoticed, so the set is pinned by
// content (docs/wiki/count-comparison-masks-filtered-set-drift.md).
test("T-014 the hooks .ts set the toolchain scope check reads is derived from the tracked tree, is not empty, and contains every .ts this plan adds under hooks/", () => {
  const hooksTs = listHooksTsFiles();
  assert.ok(hooksTs.length > 0, "the derived hooks/*.ts set is empty");

  const planAddedFiles = [
    "hooks/_lib/shebang_scope.ts",
    "hooks/_lib/tests/shebang-scope.test.ts",
    "hooks/_lib/tests/shebang-ts.test.ts",
    "hooks/_lib/tests/fixtures/shebang/exec-bit-wrong-shebang.ts",
    "hooks/_lib/tests/fixtures/shebang/stale-env-bun.ts",
    "hooks/_lib/tests/fixtures/shebang/_lib/has-shebang.ts",
    "hooks/_lib/tests/bun-runtime.test.ts",
    "hooks/_lib/rust_target.ts",
    "hooks/_lib/tests/rust-target.test.ts",
    "hooks/_lib/textlint.ts",
    "hooks/_lib/tests/textlint.test.ts",
    "hooks/edit/rust_pre_edit.ts",
    "hooks/edit/rust_post_edit.ts",
    "hooks/edit/tests/rust-edit.test.ts",
    "hooks/edit/textlint_fix.ts",
    "hooks/edit/tests/textlint-fix.test.ts",
    "hooks/edit/rumdl_check.ts",
    "hooks/edit/tests/rumdl-check.test.ts",
    "hooks/edit/tests/edit-tooling-retirement.test.ts",
    "hooks/_lib/tests/security-hooks-retirement.test.ts",
    "hooks/_lib/gh_filing.ts",
    "hooks/_lib/tests/gh-filing.test.ts",
    "hooks/pre-bash/client_identifier_gate.ts",
    "hooks/pre-bash/tests/client-identifier-gate.test.ts",
    "hooks/pre-bash/package_manager_rewrite.ts",
    "hooks/pre-bash/tests/package-manager-rewrite.test.ts",
    "hooks/pre-bash/body_proofread.ts",
    "hooks/pre-bash/tests/body-proofread-target.test.ts",
    "hooks/pre-bash/tests/body-proofread-notify.test.ts",
    "hooks/pre-bash/tests/pre-bash-hooks-retirement.test.ts",
    "hooks/_lib/mirror_prose.ts",
    "hooks/_lib/tests/mirror-prose.test.ts",
    "hooks/_lib/tests/mirror-prose-python.test.ts",
    "hooks/edit/mirror_prose_guard.ts",
    "hooks/edit/tests/mirror-prose-guard.test.ts",
    "hooks/_lib/tests/mirror-prose-retirement.test.ts",
    "hooks/pre-bash/issue_body_gate.ts",
    "hooks/pre-bash/tests/issue-body-gate-template.test.ts",
    "hooks/pre-bash/tests/issue-body-gate-validator.test.ts",
    "hooks/pre-bash/wiki_scene.ts",
    "hooks/pre-bash/tests/wiki-scene-find.test.ts",
    "hooks/pre-bash/tests/wiki-scene-runtime.test.ts",
    "hooks/pre-bash/tests/pre-bash-skill-hooks-retirement.test.ts",
  ];
  const missing = planAddedFiles.filter((file) => !hooksTs.includes(file));
  assert.deepEqual(
    missing,
    [],
    `the derived hooks/*.ts set is missing .ts files this plan adds: ${missing.join(", ")}`,
  );
});
