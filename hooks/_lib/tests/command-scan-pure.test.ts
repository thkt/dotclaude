/// <reference types="node" />
// Ports the subcommand / git_subcommand / flag_value / starts_with / before_pathspec /
// git_clean_only_lists cases from hooks/_lib/tests/command_scan_test.py to the .ts side
// (DR-0112). These six take an already-tokenized command list and never touch shlex, so unlike
// hook-payload-parity.test.ts this file needs no python3 driver: the input/expected-output table
// below is the same one command_scan_test.py runs, read straight off its assertions.
import assert from "node:assert/strict";
import test from "node:test";
import {
  before_pathspec,
  flag_value,
  git_clean_only_lists,
  git_subcommand,
  starts_with,
  subcommand,
} from "../command_scan.ts";

test("T-269 subcommand and git_subcommand skip the valued flags their tables name and return the first non-flag token with the rest", () => {
  // git_subcommand cases, from TestGitSubcommand in command_scan_test.py.
  assert.deepEqual(git_subcommand(["git", "clean", "-fd"]), ["clean", ["-fd"]]);
  assert.deepEqual(git_subcommand(["git", "status"]), ["status", []]);
  // -C takes a value: skipping it wrong makes /tmp the subcommand instead of clean.
  assert.deepEqual(git_subcommand(["git", "-C", "/tmp", "clean"]), ["clean", []]);
  assert.deepEqual(git_subcommand(["git", "--no-pager", "log"]), ["log", []]);
  assert.deepEqual(git_subcommand(["git"]), [null, []]);
  assert.deepEqual(git_subcommand(["git", "-C", "/tmp"]), [null, []]);

  // subcommand() with a non-git valued-flags table, mirroring
  // hooks/security/npm_install_guard.py's VALUED_NPM_FLAGS usage: the same skipping has to
  // work for a table git_subcommand never reads.
  const npmValuedFlags = new Set(["--prefix", "-C", "--registry", "-w", "--workspace"]);
  assert.deepEqual(subcommand(["npm", "install"], npmValuedFlags), ["install", []]);
  assert.deepEqual(
    subcommand(["npm", "--prefix", "/tmp", "install"], npmValuedFlags),
    ["install", []],
  );
  assert.deepEqual(
    subcommand(["npm", "--registry", "https://example.invalid", "ci"], npmValuedFlags),
    ["ci", []],
  );
  assert.deepEqual(subcommand(["npm"], npmValuedFlags), [null, []]);
});

test("T-270 flag_value returns the value after the named flag and null when the flag is absent or carries no value", () => {
  const tokens = ["gh", "issue", "create", "--title", "[Bug] x", "--body-file", "/tmp/b.md"];
  assert.equal(flag_value(tokens, "--title"), "[Bug] x");
  assert.equal(flag_value(tokens, "--body-file"), "/tmp/b.md");
  assert.equal(flag_value(["gh", "--title=x"], "--title"), "x");
  assert.equal(flag_value(["gh", "issue", "create"], "--title"), null);
  assert.equal(flag_value(["gh", "--title"], "--title"), null);
});

test("T-271 starts_with matches a prefix by position and before_pathspec cuts the list at the -- separator", () => {
  const cmd = ["gh", "issue", "create", "--title", "x"];
  assert.equal(starts_with(cmd, ["gh", "issue", "create"]), true);
  assert.equal(starts_with(cmd, ["gh", "pr", "create"]), false);
  assert.equal(starts_with(["gh", "issue"], ["gh", "issue", "create"]), false);

  // before_pathspec: what follows -- is a pathspec, not a flag (command_scan.py's own
  // `git rm -- -h` / `git clean -fd -- -notes` docstring examples).
  assert.deepEqual(before_pathspec(["-fd", "--", "-notes"]), ["-fd"]);
  assert.deepEqual(before_pathspec(["-h"]), ["-h"]);
  assert.deepEqual(before_pathspec([]), []);
});

test("T-272 git_clean_only_lists is true for a dry-run clean and false once a force flag appears", () => {
  assert.equal(git_clean_only_lists(["--dry-run"]), true);
  assert.equal(git_clean_only_lists(["-n"]), true);
  // Short flags combine: the dry-run bit arrives inside -nd as well as alone.
  assert.equal(git_clean_only_lists(["-nd"]), true);
  assert.equal(git_clean_only_lists(["-fd"]), false);
  assert.equal(git_clean_only_lists([]), false);
  // A pathspec shaped like a flag, named past --, never clears the dry-run read.
  assert.equal(git_clean_only_lists(["-fd", "--", "-notes"]), false);
  assert.equal(git_clean_only_lists(["-fd", "--", "-n"]), false);
  assert.equal(git_clean_only_lists(["-n", "--", "-notes"]), true);
});
