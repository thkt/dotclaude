/// <reference types="node" />
// Behavior tests for skills/dr/scripts/dr_common.ts: the TS port of dr_common.py's fail,
// resolveDrDir, guardSkillDir, and splitFrontmatter, in the same shape
// skills/_lib/tests/harness-hash-digest.test.ts and harness-hash-cli.test.ts use -- pure
// functions asserted in-process, and the process.exit(1) side effect of fail() (and of
// guardSkillDir's failing branch, which calls fail() internally) asserted by spawning a
// throwaway subprocess so this test's own process never exits mid-run.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { guardSkillDir, resolveDrDir, splitFrontmatter, type GitTopLevelResult } from "../scripts/dr_common.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE_URL = pathToFileURL(join(HERE, "..", "scripts", "dr_common.ts")).href;

interface SubprocessRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs `expression` (a function body returning a promise, in scope of the imported module as
 * `m`) in a throwaway node subprocess, so a call that reaches fail()'s process.exit(1) cannot
 * end this test file's own process. */
function runInSubprocess(expression: string): SubprocessRun {
  const result = spawnSync(
    process.execPath,
    ["-e", `import(${JSON.stringify(MODULE_URL)}).then((m) => { ${expression} });`],
    { encoding: "utf8" },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const GIT_OK = (path: string): GitTopLevelResult => ({ status: 0, stdout: `${path}\n` });
const GIT_NON_ZERO: GitTopLevelResult = { status: 128, stdout: "" };
const GIT_SPAWN_FAILED: GitTopLevelResult = { status: null, stdout: "", error: new Error("ENOENT") };

test("T-196 splitFrontmatter treats only a --- on the first line as the opening fence and a later --- in the body never splits the file", () => {
  const opened = "---\nstatus: accepted\n---\nBody text\n";
  const [openedFrontmatter, openedBody] = splitFrontmatter(opened);
  assert.deepEqual(openedFrontmatter, ["status: accepted"]);
  assert.deepEqual(openedBody, ["Body text", ""]);

  const noFence = "# Title\n\nIntro text\n---\nkey: value\n---\nMore body\n";
  const [frontmatter, body] = splitFrontmatter(noFence);
  assert.deepEqual(frontmatter, [], "no line-1 fence means no frontmatter was split out");
  assert.deepEqual(body, noFence.split("\n"), "the whole file, --- lines included, stays body");
});

test("T-197 resolveDrDir prefers DR_DIR over the argument and the argument over the git top level, and returns null when git exits non-zero or fails to spawn", () => {
  assert.equal(
    resolveDrDir({ DR_DIR: "/from/env" }, "/from/arg", GIT_OK("/from/git")),
    "/from/env",
    "DR_DIR wins over both the argument and git",
  );
  assert.equal(
    resolveDrDir({}, "/from/arg", GIT_OK("/from/git")),
    "/from/arg",
    "the argument wins over git when DR_DIR is unset",
  );
  assert.equal(
    resolveDrDir({}, undefined, GIT_OK("/from/git")),
    join("/from/git", "docs", "decisions"),
    "the git top level is joined with docs/decisions when neither DR_DIR nor the argument is set",
  );
  assert.equal(
    resolveDrDir({}, undefined, GIT_NON_ZERO),
    null,
    "a non-zero git exit yields null instead of a fail() call",
  );
  assert.equal(
    resolveDrDir({}, undefined, GIT_SPAWN_FAILED),
    null,
    "a git spawn that never launched (status null + error) yields null the same as a non-zero exit",
  );
});

test("T-198 guardSkillDir fails with the hint when the directory carries SKILL.md and returns when it does not", () => {
  const withSkillMd = mkdtempSync(join(tmpdir(), "dr-common-guard-"));
  writeFileSync(join(withSkillMd, "SKILL.md"), "# a skill\n");
  try {
    const run = runInSubprocess(
      `m.guardSkillDir(${JSON.stringify(withSkillMd)}, "the hint text")`,
    );
    assert.equal(run.status, 1, `exit code (stderr: ${run.stderr})`);
    assert.match(run.stderr, /SKILL\.md/);
    assert.match(run.stderr, /the hint text/);
  } finally {
    rmSync(withSkillMd, { recursive: true, force: true });
  }

  const withoutSkillMd = mkdtempSync(join(tmpdir(), "dr-common-guard-"));
  try {
    assert.doesNotThrow(() => guardSkillDir(withoutSkillMd, "the hint text"));
  } finally {
    rmSync(withoutSkillMd, { recursive: true, force: true });
  }
});

test("T-199 fail writes each line to stderr and exits 1", () => {
  const run = runInSubprocess(`m.fail("line one", "line two")`);
  assert.equal(run.status, 1, `exit code (stderr: ${run.stderr})`);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "line one\nline two\n");
});
