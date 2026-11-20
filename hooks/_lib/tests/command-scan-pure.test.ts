/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  before_pathspec,
  commands,
  flag_value,
  git_clean_only_lists,
  git_subcommand,
  starts_with,
  subcommand,
} from "../command_scan.ts";

test("T-269 subcommand and git_subcommand skip the valued flags their tables name and return the first non-flag token with the rest", () => {
  assert.deepEqual(git_subcommand(["git", "clean", "-fd"]), ["clean", ["-fd"]]);
  assert.deepEqual(git_subcommand(["git", "status"]), ["status", []]);
  assert.deepEqual(git_subcommand(["git", "-C", "/tmp", "clean"]), ["clean", []]);
  assert.deepEqual(git_subcommand(["git", "--no-pager", "log"]), ["log", []]);
  assert.deepEqual(git_subcommand(["git"]), [null, []]);
  assert.deepEqual(git_subcommand(["git", "-C", "/tmp"]), [null, []]);

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

  assert.deepEqual(before_pathspec(["-fd", "--", "-notes"]), ["-fd"]);
  assert.deepEqual(before_pathspec(["-h"]), ["-h"]);
  assert.deepEqual(before_pathspec([]), []);
});

test("T-272 git_clean_only_lists is true for a dry-run clean and false once a force flag appears", () => {
  assert.equal(git_clean_only_lists(["--dry-run"]), true);
  assert.equal(git_clean_only_lists(["-n"]), true);
  assert.equal(git_clean_only_lists(["-nd"]), true);
  assert.equal(git_clean_only_lists(["-fd"]), false);
  assert.equal(git_clean_only_lists([]), false);
  assert.equal(git_clean_only_lists(["-fd", "--", "-notes"]), false);
  assert.equal(git_clean_only_lists(["-fd", "--", "-n"]), false);
  assert.equal(git_clean_only_lists(["-n", "--", "-notes"]), true);
});

test("T-600 commands drops a comment up to its line end, including a line ending in a backslash, and splits the next line as a command", () => {
  const cases: Array<[string, string[][]]> = [
    ["# note\ngit push", [["git", "push"]]],
    ["echo hi # note\ngit push", [["echo", "hi"], ["git", "push"]]],
    ["echo a;# b\ngit push", [["echo", "a"], ["git", "push"]]],
    ["git status #x\ngit push", [["git", "status"], ["git", "push"]]],
    ["# c \\\ngit push", [["git", "push"]]],
    ["echo a # c \\\ngit push", [["echo", "a"], ["git", "push"]]],
    ["git push # last", [["git", "push"]]],
    ["echo 'x # y'\ngit push", [["echo", "x # y"], ["git", "push"]]],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual([...commands(input)], expected, JSON.stringify(input));
  }
});

test("T-603 commands splits the next line as a command after a blank line or a line ending in a separator, and keeps non-newline punctuation joined", () => {
  const cases: Array<[string, string[][]]> = [
    ["echo a\n\ngit push", [["echo", "a"], ["git", "push"]]],
    ["echo a;\ngit push", [["echo", "a"], ["git", "push"]]],
    ["echo a &&\ngit push", [["echo", "a"], ["git", "push"]]],
    ["echo a &\ngit push", [["echo", "a"], ["git", "push"]]],
    ["echo a |\ngrep b", [["echo", "a"], ["grep", "b"]]],
    ["\n\ngit push", [["git", "push"]]],
    ["# c\n\ngit push", [["git", "push"]]],
    ["echo alpha\n;echo beta", [["echo", "alpha"], ["echo", "beta"]]],
    ["echo hi ;; rm x", [["echo", "hi", ";;", "rm", "x"]]],
    ["a && b || c", [["a"], ["b"], ["c"]]],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual([...commands(input)], expected, JSON.stringify(input));
  }
});

test("T-606 commands skips a reserved word at the head of a command, in any order with env assignments and wrappers, and keeps one in argument position", () => {
  const cases: Array<[string, string[][]]> = [
    ["if true; then git push; fi", [["true"], ["git", "push"], ["fi"]]],
    ["if git push; then echo ok; fi", [["git", "push"], ["echo", "ok"], ["fi"]]],
    ["for r in a; do git push; done", [["for", "r", "in", "a"], ["git", "push"], ["done"]]],
    ["while true; do git push; done", [["true"], ["git", "push"], ["done"]]],
    ["until false; do git push; done", [["false"], ["git", "push"], ["done"]]],
    ["! git push", [["git", "push"]]],
    ["{ git push; }", [["git", "push"], ["}"]]],
    [
      "if x; then\ngit push\nelse\ngit push -f\nfi",
      [["x"], ["git", "push"], ["git", "push", "-f"], ["fi"]],
    ],
    [
      "if x; then echo a; elif y; then git push; fi",
      [["x"], ["echo", "a"], ["y"], ["git", "push"], ["fi"]],
    ],
    ["echo a | { git push; }", [["echo", "a"], ["git", "push"], ["}"]]],
    ["then sudo git push", [["git", "push"]]],
    ["echo then git push", [["echo", "then", "git", "push"]]],
    ["do-something git push", [["do-something", "git", "push"]]],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual([...commands(input)], expected, JSON.stringify(input));
  }
});

test("T-607 commands returns each parenthesis as its own command and splits the commands around it", () => {
  const cases: Array<[string, string[][]]> = [
    ["(git push)", [["("], ["git", "push"], [")"]]],
    ["(cd /b && git push)", [["("], ["cd", "/b"], ["git", "push"], [")"]]],
    ["(cd /b && true); git push", [["("], ["cd", "/b"], ["true"], [")"], ["git", "push"]]],
    ["(\ncd /b\n)\ngit push", [["("], ["cd", "/b"], [")"], ["git", "push"]]],
    ["echo $(git push)", [["echo", "$"], ["("], ["git", "push"], [")"]]],
    [
      "x=$(cd /b && git rev-parse HEAD); git push",
      [["("], ["cd", "/b"], ["git", "rev-parse", "HEAD"], [")"], ["git", "push"]],
    ],
    ["echo a | (cd /b; git push)", [["echo", "a"], ["("], ["cd", "/b"], ["git", "push"], [")"]]],
    [
      "(cd /b; (cd /c; git push); git push)",
      [["("], ["cd", "/b"], ["("], ["cd", "/c"], ["git", "push"], [")"], ["git", "push"], [")"]],
    ],
    ["f() { git push; }; f", [["f"], ["("], [")"], ["git", "push"], ["}"], ["f"]]],
    ["((i++)); git push", [["("], ["("], ["i++"], [")"], [")"], ["git", "push"]]],
    ['echo "(cd /b)"; git push', [["echo", "(cd /b)"], ["git", "push"]]],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual([...commands(input)], expected, JSON.stringify(input));
  }
});
