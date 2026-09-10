/// <reference types="node" />
// TypeScript side of hooks/_lib/gh_filing.py: what a `gh issue create` or `gh pr create` names
// on its own command line. Two PreToolUse hooks read the same filing, so gh's flag spellings
// are one piece of knowledge here rather than duplicated per hook.
//
// Read from the filing's own tokens, never from every command on the line: a `--body-file`
// belonging to some other command names a different file, and inspecting it under the issue's
// name reports on the wrong text.
import { isAbsolute, join } from "node:path";
import * as commandScan from "./command_scan.ts";

export const TITLE_FLAGS: readonly string[] = ["--title", "-t"];
export const BODY_FLAGS: readonly string[] = ["--body", "-b"];
export const BODY_FILE_FLAGS: readonly string[] = ["--body-file", "-F"];

export type Kind = "issue" | "pr";
export const KINDS: readonly Kind[] = ["issue", "pr"];

export interface Filing {
  readonly tokens: readonly string[];
  readonly kind: Kind;
  readonly directory: string;
}

/** The filing a command line runs, or null when it runs none of the requested kind.
 *
 * `directory` follows every cd ahead of the filing, since `cd a && cd b` lands in a/b and a
 * relative body path resolves against that. */
export function find(command: string, kind?: Kind): Filing | null {
  let directory = process.cwd();
  for (const tokens of commandScan.commands(command)) {
    if (tokens[0] === "cd" && tokens.length > 1) {
      const target = tokens[1];
      // An absolute cd target replaces the directory outright, the way Python's `Path.cwd() /
      // target` does for pathlib -- `join()` alone would append it under the old directory
      // instead, since Node's path.join never resets to an absolute component.
      directory = isAbsolute(target) ? target : join(directory, target);
      continue;
    }
    for (const name of KINDS) {
      if (
        (kind === undefined || kind === name) &&
        commandScan.starts_with(tokens, ["gh", name, "create"])
      ) {
        return { tokens, kind: name, directory };
      }
    }
  }
  return null;
}

/** The value the filing carries under any of the given spellings. */
export function flag(filing: Filing, names: readonly string[]): string | null {
  for (const name of names) {
    const value = commandScan.flag_value(filing.tokens, name);
    if (value) {
      return value;
    }
  }
  return null;
}

/** Where the filing's `--body-file` points, resolved against the directory it runs in.
 *
 * Returned whether or not it exists, since the caller decides what an unreadable body means. */
export function body_file(filing: Filing): string | null {
  const named = flag(filing, BODY_FILE_FLAGS);
  if (!named) {
    return null;
  }
  return isAbsolute(named) ? named : join(filing.directory, named);
}
