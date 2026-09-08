#!/usr/bin/env node
/// <reference types="node" />
// Usage: bootstrap.ts <worktree-path>
//
// Detect the project type inside <worktree-path>, install dependencies, and run a build smoke
// test. Per-step timeouts (install 180s, build 600s) are enforced by the runner itself, so the
// result holds on platforms without timeout(1) (e.g. macOS).
//
// stdout: JSON {project_type, install, build, install_cmd, build_cmd, reason}
//   install: ok | fail | skip   (skip = project type has no dependency step)
//   build:   pass | fail | skipped
// exit 0 on a completed run (read the verdict from JSON); exit 1 on usage / path error.
//
// Gate routing: workflows/assert.js's envFail/dynamicOk constants decide the path -- #656. The
// trichotomy is encoded by (install, build) jointly, not by build alone:
//
//   install=fail    + build=skipped -> env failure        -> Ready (caveat) path
//   install=ok      + build=fail    -> build smoke broken -> NotReady
//   install=ok/skip + build=skipped -> no build concept    -> proceed normally
//   install=ok/skip + build=pass    -> clean               -> proceed normally
//
// A build timeout that fires after the build started is reported as build=fail: a hanging
// build is indistinguishable from a broken one, and treating it as environmental would let it
// reach Ready (caveat) (workflows/assert.js's envFail is defined from install/worktree alone
// and excludes build).
//
// TypeScript port of the Python assert bootstrap runner it replaces. Contract: this CLI's own
// behavior, exercised end to end by workflows/assert/tests/bootstrap.test.ts against the
// frozen fixture workflows/assert/tests/fixtures/bootstrap-cases.json.
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

const INSTALL_TIMEOUT = 180;
const BUILD_TIMEOUT = 600;

// First match in this order wins. This list itself is canonical; no external doc defines the
// order. Mirrors the retired Python bootstrap script's `PROJECT_MARKERS`.
const PROJECT_MARKERS: ReadonlyArray<readonly [marker: string, ptype: string]> = [
  ["package.json", "node"],
  ["Cargo.toml", "rust"],
  ["Makefile", "make"],
  ["Taskfile.yml", "task"],
  ["pyproject.toml", "python"],
  ["Gemfile", "ruby"],
];

// First matching lock file wins. Mirrors the retired Python bootstrap script's `NPM_LOCK_COMMANDS`.
const NPM_LOCK_COMMANDS: ReadonlyArray<readonly [lock: string, cmd: readonly string[]]> = [
  ["bun.lockb", ["bun", "install", "--frozen-lockfile"]],
  ["bun.lock", ["bun", "install", "--frozen-lockfile"]],
  ["pnpm-lock.yaml", ["pnpm", "install", "--frozen-lockfile"]],
  ["yarn.lock", ["yarn", "install", "--frozen-lockfile"]],
  ["package-lock.json", ["npm", "ci"]],
];
const NPM_INSTALL_DEFAULT: readonly string[] = ["npm", "install"];

// null means the type has no dependency step. Mirrors the retired Python bootstrap script's `INSTALL_COMMANDS`.
const INSTALL_COMMANDS: Record<string, readonly string[] | null> = {
  rust: ["cargo", "fetch"],
  make: null,
  task: null,
  python: ["pip", "install", "-e", "."],
  ruby: ["bundle", "install"],
};

// null means the type has no build concept (build=skipped, proceed). Mirrors the retired Python bootstrap script's
// `BUILD_COMMANDS`.
const BUILD_COMMANDS: Record<string, readonly string[] | null> = {
  rust: ["cargo", "build"],
  make: ["make", "build"],
  task: ["task", "build"],
  python: null,
  ruby: null,
};

/** Marks a runner result as "timed out" rather than a real exit code, so the timeout path
 * travels the same return type as a normal status -- an int sentinel would collide with a
 * real exit code. Mirrors the retired Python bootstrap script's `TIMED_OUT = object()`. */
export const TIMED_OUT: unique symbol = Symbol("bootstrap-timed-out");

/** Runs one command in `cwd`, returning its exit status, TIMED_OUT after `timeoutSeconds`, or
 * 127 when the binary is not found. The seam `run` calls through, so a test can inject a fake
 * in place of a real spawn. Mirrors the retired Python bootstrap script's `Runner = Callable[[Sequence[str], Path,
 * int], object]`. */
export type Runner = (
  cmd: readonly string[],
  cwd: string,
  timeoutSeconds: number,
) => number | typeof TIMED_OUT;

/** Spawns `cmd[0]` with `cmd.slice(1)` in `cwd`, capturing nothing (the caller reads only the
 * exit status). Mirrors the retired Python bootstrap script's `_real_runner`. */
function realRunner(cmd: readonly string[], cwd: string, timeoutSeconds: number): number | typeof TIMED_OUT {
  const result = spawnSync(cmd[0], cmd.slice(1), { cwd, timeout: timeoutSeconds * 1000 });
  if (result.error && (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    return TIMED_OUT;
  }
  if (result.error) {
    return 127;
  }
  return result.status ?? 127;
}

/** Whether `path` names a regular file, false for a directory or a nonexistent path. */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The project type marked by the first table entry in PROJECT_MARKERS order whose marker
 * file `worktree` carries, or null when none match. Mirrors the retired Python bootstrap script's
 * `detect_project_type`. */
export function detectProjectType(worktree: string): string | null {
  for (const [marker, ptype] of PROJECT_MARKERS) {
    if (isFile(join(worktree, marker))) {
      return ptype;
    }
  }
  return null;
}

/** The dependency-install command for `ptype` inside `worktree`, or null when the type has no
 * dependency step. Mirrors the retired Python bootstrap script's `install_command`. */
export function installCommand(worktree: string, ptype: string): readonly string[] | null {
  if (ptype === "node") {
    for (const [lock, cmd] of NPM_LOCK_COMMANDS) {
      if (isFile(join(worktree, lock))) {
        return cmd;
      }
    }
    return NPM_INSTALL_DEFAULT;
  }
  return INSTALL_COMMANDS[ptype] ?? null;
}

/** Whether `worktree`'s package.json declares a non-empty `scripts.build`. Mirrors
 * the retired Python bootstrap script's `_has_npm_build_script`: a missing or unparseable package.json, or a
 * scripts.build that is absent/empty, both read as false rather than throwing. */
function hasNpmBuildScript(worktree: string): boolean {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(worktree, "package.json"), "utf8"));
  } catch {
    return false;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return false;
  }
  const scripts = (raw as Record<string, unknown>).scripts;
  if (typeof scripts !== "object" || scripts === null || Array.isArray(scripts)) {
    return false;
  }
  return Boolean((scripts as Record<string, unknown>).build);
}

/** The build-smoke command for `ptype` inside `worktree`, or null when the type has no build
 * concept. Mirrors the retired Python bootstrap script's `build_command`. */
export function buildCommand(worktree: string, ptype: string): readonly string[] | null {
  if (ptype === "node") {
    return hasNpmBuildScript(worktree) ? ["npm", "run", "build"] : null;
  }
  return BUILD_COMMANDS[ptype] ?? null;
}

interface BootstrapResult {
  project_type: string | null;
  install: string;
  build: string;
  install_cmd: string | null;
  build_cmd: string | null;
  reason: string;
}

/** Detects the project type in `worktree`, installs dependencies, and runs the build smoke,
 * reporting every step's outcome in the returned object -- a step failure never throws, it
 * lands in the result. Mirrors the retired Python bootstrap script's `run`. */
export function run(worktree: string, runner: Runner = realRunner): BootstrapResult {
  const ptype = detectProjectType(worktree);
  const result: BootstrapResult = {
    project_type: ptype,
    install: "skip",
    build: "skipped",
    install_cmd: null,
    build_cmd: null,
    reason: "",
  };
  if (ptype === null) {
    result.reason = "project-type-unknown";
    return result;
  }

  const installCmd = installCommand(worktree, ptype);
  if (installCmd !== null) {
    result.install_cmd = installCmd.join(" ");
    const rc = runner(installCmd, worktree, INSTALL_TIMEOUT);
    if (rc === TIMED_OUT) {
      result.install = "fail";
      result.reason = "env:install-timeout";
      return result;
    }
    if (rc !== 0) {
      result.install = "fail";
      result.reason = `env:install-exit-${rc}`;
      return result;
    }
    result.install = "ok";
  }

  const buildCmd = buildCommand(worktree, ptype);
  if (buildCmd === null) {
    result.reason = "no-build-script";
    return result;
  }
  result.build_cmd = buildCmd.join(" ");
  const rc = runner(buildCmd, worktree, BUILD_TIMEOUT);
  if (rc === TIMED_OUT) {
    result.build = "fail";
    result.reason = "build-timeout";
    return result;
  }
  if (rc !== 0) {
    result.build = "fail";
    result.reason = `build-exit-${rc}`;
    return result;
  }
  result.build = "pass";
  return result;
}

/** Whether `path` names a directory, false for a file or a nonexistent path. */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Serializes `result` the way Python's `json.dumps` formats a flat dict -- a space after
 * every `:` and `,` -- so bootstrap.ts's stdout matches the retired Python bootstrap script's byte for byte;
 * `JSON.stringify`'s compact separators would not. Every field of `run`'s result is a string
 * or null, so per-value `JSON.stringify` (for its quoting/escaping) plus manual joining
 * covers the whole shape without reaching for a general pretty-printer. */
function toPythonJson(result: BootstrapResult): string {
  const parts = Object.entries(result).map(
    ([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`,
  );
  return `{${parts.join(", ")}}`;
}

/** argv dispatch mirroring the retired Python bootstrap script's `main`: exactly one `<worktree-path>` argument that
 * names a directory runs `run` and prints its JSON result; anything else prints the usage line
 * to stderr and exits 1. The usage line names this script's own current entry point
 * (bootstrap.ts), matching the header comment above -- the retired script no longer exists to
 * compare against, so keeping its name here would misdirect a caller (U-005). */
export function main(): number {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    process.stderr.write("Usage: bootstrap.ts <worktree-path>\n");
    return 1;
  }
  const [worktree] = args;
  if (!isDirectory(worktree)) {
    process.stderr.write(`Error: not a directory: ${worktree}\n`);
    return 1;
  }
  process.stdout.write(`${toPythonJson(run(worktree))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
