/// <reference types="node" />
// Behavior tests for workflows/assert/bootstrap.ts, the TypeScript port of the Python assert
// bootstrap runner it replaces.
//
// T-164 replays the frozen fixture in tests/fixtures/bootstrap-cases.json, produced by running
// the Python bootstrap runner itself before it was retired (U-001) with the script's own name
// masked as `<script>` in the usage line, through the real CLI
// (runCli, PATH cleared -- none of the three frozen cases starts a subprocess, so cwd and env
// pass through unset). The fixture's `<worktree-path>` placeholder is resolved to a real
// temporary directory before the argv is built, and back into the expected stdout/stderr
// before the comparison -- the same role assertStdoutShape's placeholder map plays for a
// minted uuid or timestamp, spelled out here because the placeholder sits in a plain string,
// not a fixture row.
//
// T-165 and T-166 exercise detectProjectType/installCommand/buildCommand directly against real
// temporary directories -- the table-order precedence and the node lock/build-script rules
// the retired Python bootstrap script's own table comments document as canonical.
//
// T-167 exercises the three-way gate split (workflows/assert.js's envFail/dynamicOk read
// (install, build) jointly, not build alone -- #656) through `run` with an injected Runner, the
// same seam-replacement style workflows/assert/tests/worktree.test.ts's T-161 uses for
// create/cleanup: a fake runner keyed on the command being run, no real subprocess.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runCli, withTempHome, type FixtureCase } from "../../_lib/tests/_cli-fixture.ts";
import {
  buildCommand,
  detectProjectType,
  installCommand,
  run,
  TIMED_OUT,
  type Runner,
} from "../bootstrap.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "bootstrap.ts");
// The usage line is the one string the retired Python printed that names the script itself, so
// the capture carries it masked and each side resolves it to its own entry point: the retired
// runner printed its own python file name, this one prints bootstrap.ts, and carrying the
// retired name forward would misdirect a caller (U-005).
const SCRIPT_PLACEHOLDER = "<script>";
const WORKTREE_PLACEHOLDER = "<worktree-path>";

interface BootstrapFixtureCase extends FixtureCase {
  stderr: string;
}

const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "bootstrap-cases.json"), "utf8"),
) as BootstrapFixtureCase[];

test("T-164 every frozen case in bootstrap-cases.json reproduces the python script's exit code, stdout and stderr, with the worktree path compared by placeholder", () => {
  for (const testCase of FIXTURES) {
    withTempHome((home) => {
      const usesWorktree = (testCase.argv ?? []).includes(WORKTREE_PLACEHOLDER);
      let worktreePath = "";
      if (usesWorktree) {
        worktreePath = join(home, "worktree");
        if (testCase.name !== "nonexistent_path") {
          mkdirSync(worktreePath, { recursive: true });
        }
      }
      const argv = (testCase.argv ?? []).map((arg) =>
        arg === WORKTREE_PLACEHOLDER ? worktreePath : arg,
      );
      const result = runCli(SCRIPT, home, testCase.stdin, argv);
      assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
      const expectedStdout = usesWorktree
        ? testCase.stdout.replaceAll(WORKTREE_PLACEHOLDER, worktreePath)
        : testCase.stdout;
      const expectedStderr = (
        usesWorktree
          ? testCase.stderr.replaceAll(WORKTREE_PLACEHOLDER, worktreePath)
          : testCase.stderr
      ).replaceAll(SCRIPT_PLACEHOLDER, "bootstrap.ts");
      assert.equal(result.stdout, expectedStdout, `${testCase.name}: stdout`);
      assert.equal(result.stderr, expectedStderr, `${testCase.name}: stderr`);
    });
  }
});

test("T-165 the project type is the first marker in the table order that the worktree carries, and a worktree with no marker reports project-type-unknown", () => {
  withTempHome((home) => {
    const dir = mkdtempSync(join(home, "markers-"));
    writeFileSync(join(dir, "Makefile"), "");
    writeFileSync(join(dir, "Cargo.toml"), "");
    assert.equal(
      detectProjectType(dir),
      "rust",
      "Cargo.toml (rust) precedes Makefile (make) in table order, so rust wins",
    );
  });

  withTempHome((home) => {
    const dir = mkdtempSync(join(home, "no-markers-"));
    assert.equal(
      detectProjectType(dir),
      null,
      "a worktree with no marker file has no detected type",
    );
    const result = run(dir);
    assert.equal(result.project_type, null, "no-marker run: project_type stays null");
    assert.equal(result.reason, "project-type-unknown", "no-marker run: reason names the gap");
  });
});

test("T-166 the node install command is the first matching lock file's command and falls back to npm install, and the node build command is present only when package.json declares a build script", () => {
  withTempHome((home) => {
    const dir = mkdtempSync(join(home, "node-locks-"));
    writeFileSync(join(dir, "package-lock.json"), "{}");
    writeFileSync(join(dir, "yarn.lock"), "");
    assert.deepEqual(
      installCommand(dir, "node"),
      ["yarn", "install", "--frozen-lockfile"],
      "yarn.lock precedes package-lock.json in NPM_LOCK_COMMANDS order",
    );
  });

  withTempHome((home) => {
    const dir = mkdtempSync(join(home, "node-no-lock-"));
    assert.deepEqual(
      installCommand(dir, "node"),
      ["npm", "install"],
      "no lock file present falls back to npm install",
    );
  });

  withTempHome((home) => {
    const dir = mkdtempSync(join(home, "node-build-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { build: "tsc" } }));
    assert.deepEqual(
      buildCommand(dir, "node"),
      ["npm", "run", "build"],
      "a declared build script yields npm run build",
    );
  });

  withTempHome((home) => {
    const dir = mkdtempSync(join(home, "node-no-build-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: {} }));
    assert.equal(
      buildCommand(dir, "node"),
      null,
      "package.json without a build script has no build command",
    );
  });
});

/** A node worktree with a build script and no lock file, so both installCommand and
 * buildCommand resolve to a non-null command and the injected Runner in T-167 sees both
 * invocations. */
function makeNodeWorktree(base: string): string {
  const dir = mkdtempSync(join(base, "node-worktree-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { build: "noop" } }));
  return dir;
}

test("T-167 install fail leaves build skipped for the env-failure path, install ok with build fail is a broken build smoke, and a build timeout reports build fail rather than an env failure", () => {
  withTempHome((home) => {
    const dir = makeNodeWorktree(home);
    const installFailRunner: Runner = (cmd) => (cmd.join(" ") === "npm install" ? 1 : 0);
    const result = run(dir, installFailRunner);
    assert.equal(result.install, "fail", "install-fail: install status");
    assert.equal(result.build, "skipped", "install-fail: build is left skipped (env-failure path)");
    assert.equal(result.reason, "env:install-exit-1", "install-fail: reason carries the exit code");
  });

  withTempHome((home) => {
    const dir = makeNodeWorktree(home);
    const buildFailRunner: Runner = (cmd) => (cmd.join(" ") === "npm run build" ? 1 : 0);
    const result = run(dir, buildFailRunner);
    assert.equal(result.install, "ok", "install-ok-build-fail: install status");
    assert.equal(result.build, "fail", "install-ok-build-fail: build status (broken build smoke)");
    assert.equal(
      result.reason,
      "build-exit-1",
      "install-ok-build-fail: reason carries the exit code",
    );
  });

  withTempHome((home) => {
    const dir = makeNodeWorktree(home);
    const buildTimeoutRunner: Runner = (cmd) => (cmd.join(" ") === "npm run build" ? TIMED_OUT : 0);
    const result = run(dir, buildTimeoutRunner);
    assert.equal(result.install, "ok", "build-timeout: install still ok");
    assert.equal(result.build, "fail", "build-timeout: build reported as fail, not an env failure");
    assert.equal(
      result.reason,
      "build-timeout",
      "build-timeout: reason names the timeout, not env:*",
    );
  });
});
