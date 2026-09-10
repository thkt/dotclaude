#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PreToolUse hook: stop tree-rewriting git commands from running sandboxed in the Claude
// config directory. The TypeScript replacement for the retired git_sandbox_guard Python hook
// (DR-0112's migration, units U-007, U-008 and U-009); REWRITES / HELP / GIT_ENV / READ_FLAGS /
// WRITE_FLAGS / READ_ARGUMENTS / REASON / _rewrites_tree (U-007), PROBE_TIMEOUT_SECONDS /
// UNRESOLVED_PROBE / Unresolved / _toplevel (U-008), and Target / rewriting_targets /
// _redirects / _guarded_root / UNRESOLVED / main (U-009, which wires the pieces the first two
// units left disconnected) carry the Python side's names and shapes.
//
// Failure mode: fail-closed. A line the lexer cannot tokenize, or a probe that cannot answer,
// is denied rather than let through.
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import * as command_scan from "../_lib/command_scan.ts";
import { deny, field, parse } from "../_lib/hook_payload.ts";

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

// --- probe (U-008): which repository one git call reaches ------------------------------------
//
// Ports the retired Python hook's PROBE_TIMEOUT_SECONDS / UNRESOLVED_PROBE and the rev-parse
// call inside _toplevel. subprocess.run(timeout=...) raises TimeoutExpired on a stall;
// spawnSync never throws for that, it sets `error` and returns `status: null` instead, so
// _toplevel has to read `error` itself and turn it into the same Unresolved the Python side
// raised. The same function also carries the GIT_DIR / GIT_WORK_TREE environment-assignment
// path: `env` is merged into the child's environment the way Python's `dict(os.environ, **env)`
// was.

/** rev-parse stalls on a network filesystem or a repository being repacked, and a PreToolUse
 * hook that waits on it blocks the user's command with no fallback. */
export const PROBE_TIMEOUT_SECONDS = 10;

export const UNRESOLVED_PROBE =
  "git-sandbox-guard: この呼び出しがどのリポジトリへ届くかを判定できない。" +
  "git が PATH にあるか、対象リポジトリを読めるかを確認する。rev-parse の出力: ";

/** The probe could not answer which repository a call reaches. */
export class Unresolved extends Error {}

// git's own wording for the one failure that means "this is not a repository".
const NOT_A_REPOSITORY = /not a git repository|this operation must be run in a work tree/;

/** The working tree one git call reaches, or null when git answers that there is none.
 *
 * Every other failure -- including a probe that never answers -- raises Unresolved: a probe
 * that could not run says nothing about where the call lands, and reading that as "not the
 * guarded one" would turn the guard off. */
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
  // spawnSync never throws on a stall the way subprocess.run(timeout=...) does -- it sets
  // `error` and returns `status: null` instead, so a stall (or any other failure to run git at
  // all) is read from `error` here and turned into the same Unresolved the Python side raised
  // from its `except subprocess.TimeoutExpired`.
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

// --- wiring (U-009): commands to targets, the guarded config directory, and main -------------

// Not a silent pass: reading "cannot tell" as "not protected" turns the guard off exactly when
// the environment is misconfigured.
export const UNRESOLVED =
  "git-sandbox-guard: 保護対象の設定ディレクトリを解決できないため、" +
  "このリポジトリが対象かどうかを判定できない。" +
  "CLAUDE_CONFIG_DIR が指すパスが存在するか、読み取れるかを確認する。" +
  "解決できないまま実行するなら dangerouslyDisableSandbox: true を付ける。";

/** Where one git call points itself, in the form the rev-parse probe takes. */
export interface Target {
  readonly redirects: readonly string[];
  readonly env: ReadonlyArray<readonly [string, string]>;
}

function sameTarget(a: Target, b: Target): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** git's own options, which sit ahead of the subcommand.
 *
 * `-C`, `--git-dir`, and `--work-tree` each point the call at a repository other than the one
 * cwd sits in. Replayed into the rev-parse probe rather than resolved here, so git's own
 * precedence and relative-path rules decide the answer. */
export function _redirects(tokens: readonly string[]): string[] {
  const [subcommand, rest] = command_scan.git_subcommand(tokens);
  if (subcommand === null) {
    return [];
  }
  return tokens.slice(1, tokens.length - rest.length - 1);
}

/** One target per git call on the line that writes tracked files in the working tree.
 *
 * Not a regex over the raw string: it cannot tell where a token sits, so `git pull` inside a
 * commit message would read as a pull. Every call is kept, not the first, because
 * `git checkout main && git -C <elsewhere> checkout main` reaches two repositories.
 * Deduplicated, so the common single-call line still forks rev-parse once. */
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
    // Standing in for the call keeps the guard on the cwd repository, where clearing the line
    // would drop it.
    return [{ redirects: [], env: [] }];
  }
  return targets;
}

/** The config directory the sandbox protects.
 *
 * CLAUDE_CONFIG_DIR relocates it, and the physical path is what rev-parse reports back. */
export function _guarded_root(): string | null {
  const named = process.env.CLAUDE_CONFIG_DIR || path.join(homedir(), ".claude");
  try {
    return realpathSync(named);
  } catch {
    return null;
  }
}

/** A closed stdin can make a synchronous fd-0 read throw rather than return "" -- read it as
 * empty rather than let that throw exit the hook non-zero. */
function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main(): number {
  const raw = readStdin();
  if (!raw.includes("git")) {
    return 0;
  }

  const payload = parse(raw);
  // The caller already turned the sandbox off, so the writes this guard protects will land.
  if (field(payload.tool_input, "dangerouslyDisableSandbox") === true) {
    return 0;
  }

  const command = field(payload.tool_input, "command");
  if (typeof command !== "string" || !command) {
    return 0;
  }
  // Decided before rev-parse is forked: most payloads carrying the letters `git` run no git at
  // all, and the scan answers that without starting a process.
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
    // The call reaches no repository, so it rewrites no tree this guard protects.
    if (top === null) {
      continue;
    }
    // Asked after a repository is known, so an unresolvable config directory stops calls
    // inside a repository alone rather than every git on the machine.
    if (guarded === null) {
      deny(UNRESOLVED);
      return 0;
    }
    // A repository checked out anywhere else writes freely, so only this one needs the guard.
    if (top === guarded) {
      deny(REASON);
      return 0;
    }
  }
  return 0;
}

process.exit(main());
