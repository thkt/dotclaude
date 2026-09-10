/// <reference types="node" />
// PreToolUse hook: stop tree-rewriting git commands from running sandboxed in the Claude
// config directory. The TypeScript side of hooks/security/git_sandbox_guard.py (DR-0112's
// migration, unit U-007); REWRITES / HELP / GIT_ENV / READ_FLAGS / WRITE_FLAGS /
// READ_ARGUMENTS / REASON and _rewrites_tree carry the Python side's names and shapes.
//
// Scope: the probe (_toplevel's rev-parse spawn) and main() stay out of this unit -- U-007's
// contract covers only the judgment that never spawns the probe. A later unit ports them.

import * as command_scan from "../_lib/command_scan.ts";

// Subcommands that reach the working tree. Most move the index and leave the file behind under
// the sandbox; checkout-index and read-tree go the other way, writing the tree from an index
// the sandbox never blocked.
export const REWRITES: ReadonlySet<string> = new Set([
  "checkout",
  "switch",
  "restore",
  "pull",
  "merge",
  "rebase",
  "revert",
  "cherry-pick",
  "stash",
  "am",
  "apply",
  "clean",
  "reset",
  "rm",
  "mv",
  "sparse-checkout",
  "bisect",
  "checkout-index",
  "read-tree",
  "filter-branch",
]);

// Printing the usage reaches no file, whichever subcommand it is asked of.
export const HELP: ReadonlySet<string> = new Set(["--help", "-h"]);

// A shell prefix reaches the same repository `--git-dir` and `--work-tree` name, so a guard
// reading only the flags passes `GIT_DIR=<guarded>/.git git checkout main` through.
export const GIT_ENV: ReadonlySet<string> = new Set(["GIT_DIR", "GIT_WORK_TREE"]);

// Flags that keep a subcommand off the tree. checkout takes -b / -B and switch takes -c / -C,
// and creating a branch leaves every file where it is. -n / --dry-run only prints, --cached
// stops at the index, and git apply reads the patch without laying it down.
export const READ_FLAGS: Readonly<Record<string, ReadonlySet<string>>> = {
  checkout: new Set(["-b", "-B"]),
  switch: new Set(["-c", "-C"]),
  rm: new Set(["--cached", "-n", "--dry-run"]),
  mv: new Set(["-n", "--dry-run"]),
  apply: new Set(["--check", "--stat", "--numstat", "--summary"]),
  rebase: new Set(["--show-current-patch"]),
};

// The mirror of the above: these subcommands stop short of the tree unless a flag carries them
// into it. reset --soft and --mixed end at the index, and read-tree loads it without unpacking.
export const WRITE_FLAGS: Readonly<Record<string, ReadonlySet<string>>> = {
  reset: new Set(["--hard", "--merge", "--keep"]),
  "read-tree": new Set(["-u"]),
};

// A first argument that only reads. Every other step of these subcommands checks something out
// or rewrites which files are present.
export const READ_ARGUMENTS: Readonly<Record<string, ReadonlySet<string>>> = {
  stash: new Set(["list", "show", "drop", "clear"]),
  "sparse-checkout": new Set(["list"]),
  bisect: new Set(["log", "view", "visualize", "terms"]),
};

export const REASON =
  "git-sandbox-guard: このリポジトリで作業ツリーを書き換える git は sandbox 内で走らせない。" +
  "agents/ rules/ skills/ hooks/ commands/ workflows/ への書き込みが拒否され、" +
  "HEAD だけ進んで作業ツリーと食い違う。" +
  "dangerouslyDisableSandbox: true を付けて同じコマンドを実行し直す。" +
  "それも拒否されたら、ユーザーに `! <コマンド>` での実行を依頼する。";

/** Whether one git call rewrites the tree.
 *
 * -C names another repository, which this guard denies rather than resolves: the escape hatch
 * would be one flag away and the miss would be silent. */
export function _rewrites_tree(tokens: readonly string[]): boolean {
  const [subcommand, initialRest] = command_scan.git_subcommand(tokens);
  if (subcommand === null || !REWRITES.has(subcommand)) {
    return false;
  }

  const rest = command_scan.before_pathspec(initialRest);
  if (rest.some((a) => HELP.has(a))) {
    return false;
  }
  if (subcommand in READ_FLAGS) {
    return !rest.some((a) => READ_FLAGS[subcommand].has(a));
  }
  if (subcommand in WRITE_FLAGS) {
    return rest.some((a) => WRITE_FLAGS[subcommand].has(a));
  }
  if (subcommand in READ_ARGUMENTS) {
    return !(rest.length > 0 && READ_ARGUMENTS[subcommand].has(rest[0]));
  }
  if (subcommand === "clean") {
    return !command_scan.git_clean_only_lists(rest);
  }
  if (subcommand === "restore") {
    // --staged alone rewrites the index. Paired with --worktree it reaches the tree too.
    return rest.includes("--worktree") || !rest.includes("--staged");
  }
  return true;
}
