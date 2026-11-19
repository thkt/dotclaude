#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import * as command_scan from "../_lib/command_scan.ts";
import { deny, field, parse, readStdin } from "../_lib/hook_payload.ts";

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

export const HELP: ReadonlySet<string> = new Set(["--help", "-h"]);

export const GIT_ENV: ReadonlySet<string> = new Set(["GIT_DIR", "GIT_WORK_TREE"]);

export const READ_FLAGS: Readonly<Record<string, ReadonlySet<string>>> = {
  checkout: new Set(["-b", "-B"]),
  switch: new Set(["-c", "-C"]),
  rm: new Set(["--cached", "-n", "--dry-run"]),
  mv: new Set(["-n", "--dry-run"]),
  apply: new Set(["--check", "--stat", "--numstat", "--summary"]),
  rebase: new Set(["--show-current-patch"]),
};

export const WRITE_FLAGS: Readonly<Record<string, ReadonlySet<string>>> = {
  reset: new Set(["--hard", "--merge", "--keep"]),
  "read-tree": new Set(["-u"]),
};

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
    return rest.includes("--worktree") || !rest.includes("--staged");
  }
  return true;
}

export const PROBE_TIMEOUT_SECONDS = 10;

export const UNRESOLVED_PROBE =
  "git-sandbox-guard: この呼び出しがどのリポジトリへ届くかを判定できない。" +
  "git が PATH にあるか、対象リポジトリを読めるかを確認する。rev-parse の出力: ";

export class Unresolved extends Error {}

const NOT_A_REPOSITORY = /not a git repository|this operation must be run in a work tree/;

export function _toplevel(
  cwd: string,
  redirects: readonly string[],
  env: Readonly<Record<string, string>>,
): string | null {
  const result = spawnSync(
    "git",
    ["-C", cwd, ...redirects, "rev-parse", "--show-toplevel"],
    {
      encoding: "utf8",
      env: { ...process.env, ...env },
      timeout: PROBE_TIMEOUT_SECONDS * 1000,
    },
  );
  if (result.error) {
    const timedOut = (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT";
    throw new Unresolved(
      timedOut
        ? `rev-parse did not answer in ${PROBE_TIMEOUT_SECONDS}s`
        : result.error.message,
    );
  }
  const stdout = result.stdout ?? "";
  if (result.status === 0 && stdout.trim()) {
    return stdout.trim();
  }
  const stderr = result.stderr ?? "";
  if (NOT_A_REPOSITORY.test(stderr)) {
    return null;
  }
  throw new Unresolved(stderr.trim() || `rev-parse exited ${result.status}`);
}

export const UNRESOLVED =
  "git-sandbox-guard: 保護対象の設定ディレクトリを解決できないため、" +
  "このリポジトリが対象かどうかを判定できない。" +
  "CLAUDE_CONFIG_DIR が指すパスが存在するか、読み取れるかを確認する。" +
  "解決できないまま実行するなら dangerouslyDisableSandbox: true を付ける。";

export interface Target {
  readonly redirects: readonly string[];
  readonly env: ReadonlyArray<readonly [string, string]>;
}

function sameTarget(a: Target, b: Target): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function _redirects(tokens: readonly string[]): string[] {
  const [subcommand, rest] = command_scan.git_subcommand(tokens);
  if (subcommand === null) {
    return [];
  }
  return tokens.slice(1, tokens.length - rest.length - 1);
}

export function rewriting_targets(command: string): Target[] {
  const targets: Target[] = [];
  try {
    for (const [env, tokens] of command_scan.commands_with_env(command)) {
      if (tokens[0] !== "git" || !_rewrites_tree(tokens)) {
        continue;
      }
      const picked = Object.entries(env)
        .filter(([name]) => GIT_ENV.has(name))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) as Array<[string, string]>;
      const target: Target = { redirects: _redirects(tokens), env: picked };
      if (!targets.some((existing) => sameTarget(existing, target))) {
        targets.push(target);
      }
    }
  } catch {
    return [{ redirects: [], env: [] }];
  }
  return targets;
}

export function _guarded_root(): string | null {
  const named = process.env.CLAUDE_CONFIG_DIR || path.join(homedir(), ".claude");
  try {
    return realpathSync(named);
  } catch {
    return null;
  }
}

function main(): number {
  const raw = readStdin();
  if (!raw.includes("git")) {
    return 0;
  }

  const payload = parse(raw);
  if (field(payload.tool_input, "dangerouslyDisableSandbox") === true) {
    return 0;
  }

  const command = field(payload.tool_input, "command");
  if (typeof command !== "string" || !command) {
    return 0;
  }
  const targets = rewriting_targets(command);
  if (targets.length === 0) {
    return 0;
  }

  const cwd = typeof payload.cwd === "string" ? payload.cwd : process.cwd();
  const guarded = _guarded_root();
  for (const target of targets) {
    let top: string | null;
    try {
      top = _toplevel(cwd, target.redirects, Object.fromEntries(target.env));
    } catch (failure) {
      deny(`${UNRESOLVED_PROBE}${(failure as Error).message}`);
      return 0;
    }
    if (top === null) {
      continue;
    }
    if (guarded === null) {
      deny(UNRESOLVED);
      return 0;
    }
    if (top === guarded) {
      deny(REASON);
      return 0;
    }
  }
  return 0;
}

process.exit(main());
