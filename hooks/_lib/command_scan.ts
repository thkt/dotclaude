/// <reference types="node" />
// Command-position scanning shared by the PreToolUse hooks. The TypeScript side of
// hooks/_lib/command_scan.py (DR-0112's TypeScript migration); command_scan.py stays in the
// tree because the hooks that still parse a raw Bash string (shlex tokenizing, heredoc and
// line-continuation handling) keep importing it, so both live side by side until every caller
// moves over.
//
// This module carries only the functions and tables that work on an already-tokenized command
// (a list of strings a caller such as npm_install_guard or git_sandbox_guard hands in) -- never
// shlex. commands()/commands_with_env() and the tokenizing they depend on stay Python-only.

/** Anything taking a subcommand of its own (git, npm) stays out: there the first token already
 * is the command. */
export const WRAPPERS: ReadonlySet<string> = new Set([
  "sudo",
  "env",
  "time",
  "nice",
  "xargs",
  "command",
  "exec",
  "nohup",
]);

/** A wrapper flag that takes a value swallows the token after it, which would otherwise read as
 * the command being wrapped (`sudo -u root rm x` would resolve to root). */
export const VALUED_WRAPPER_FLAGS: ReadonlySet<string> = new Set([
  "-u",
  "-g",
  "-p",
  "-n",
  "-P",
  "-I",
  "-d",
  "-s",
  "-a",
  "-E",
  "-C",
]);

export const SEPARATORS: ReadonlySet<string> = new Set([";", "|", "||", "&&", "&", "\n"]);

/** find runs whatever follows these, so the scan continues past them inside one command. */
export const EXEC_FLAGS: ReadonlySet<string> = new Set(["-exec", "-execdir", "-ok", "-okdir"]);

/** git's own options sit before the subcommand, and the valued ones swallow the token after
 * them, which would otherwise read as the subcommand (`git -C /tmp clean` resolves to /tmp). */
export const VALUED_GIT_FLAGS: ReadonlySet<string> = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
]);

/** git reads everything past this as a path, not as a flag. */
export const PATH_SEPARATOR = "--";

/** Return the subcommand a call names and the arguments after it.
 *
 * Options in valuedFlags swallow the token after them. Returns [null, []] when no subcommand
 * follows, which is what `git -C /tmp` on its own leaves. */
export function subcommand(
  tokens: readonly string[],
  valuedFlags: ReadonlySet<string> = new Set(),
): [string | null, string[]] {
  const args = tokens.slice(1);
  let index = 0;
  while (index < args.length && args[index].startsWith("-")) {
    index += valuedFlags.has(args[index]) ? 2 : 1;
  }
  if (index >= args.length) {
    return [null, []];
  }
  return [args[index], args.slice(index + 1)];
}

/** Return the subcommand a git call names and the arguments after it. */
export function git_subcommand(tokens: readonly string[]): [string | null, string[]] {
  return subcommand(tokens, VALUED_GIT_FLAGS);
}

/** Return the value a flag carries, in either `--flag value` or `--flag=value` form. */
export function flag_value(tokens: readonly string[], flag: string): string | null {
  const prefix = flag + "=";
  for (let position = 0; position < tokens.length; position += 1) {
    const token = tokens[position];
    if (token === flag) {
      return position + 1 < tokens.length ? tokens[position + 1] : null;
    }
    if (token.startsWith(prefix)) {
      return token.slice(prefix.length);
    }
  }
  return null;
}

/** Whether a command opens with the given token sequence. */
export function starts_with(tokens: readonly string[], prefix: readonly string[]): boolean {
  if (tokens.length < prefix.length) {
    return false;
  }
  return prefix.every((token, index) => tokens[index] === token);
}

/** The arguments up to `--`.
 *
 * What follows names files, and reading those as flags lets `git rm -- -h` pass as a request
 * for help and `git clean -fd -- -notes` pass as a dry run. */
export function before_pathspec(rest: readonly string[]): string[] {
  const index = rest.indexOf(PATH_SEPARATOR);
  return index === -1 ? [...rest] : rest.slice(0, index);
}

/** Whether a git clean call prints its targets instead of removing them. */
export function git_clean_only_lists(rest: readonly string[]): boolean {
  for (const arg of before_pathspec(rest)) {
    if (arg === "--dry-run") {
      return true;
    }
    // Short flags combine, so the dry-run bit arrives inside -nd as well as alone.
    if (arg.startsWith("-") && !arg.startsWith("--") && arg.includes("n")) {
      return true;
    }
  }
  return false;
}
