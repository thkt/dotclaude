/// <reference types="node" />
import { isAbsolute, join } from "node:path";
import * as commandScan from "./command_scan.ts";

export const TITLE_FLAGS: readonly string[] = ["--title", "-t"];
export const BODY_FLAGS: readonly string[] = ["--body", "-b"];
export const BODY_FILE_FLAGS: readonly string[] = ["--body-file", "-F"];

export type Kind = "issue" | "pr";
const KINDS: readonly Kind[] = ["issue", "pr"];

export interface Filing {
  readonly tokens: readonly string[];
  readonly kind: Kind;
  readonly directory: string;
}

export function find(command: string, kind?: Kind): Filing | null {
  let directory = process.cwd();
  for (const tokens of commandScan.commands(command)) {
    if (tokens[0] === "cd" && tokens.length > 1) {
      const target = tokens[1];
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

export function flag(filing: Filing, names: readonly string[]): string | null {
  for (const name of names) {
    const value = commandScan.flag_value(filing.tokens, name);
    if (value) {
      return value;
    }
  }
  return null;
}

export function body_file(filing: Filing): string | null {
  const named = flag(filing, BODY_FILE_FLAGS);
  if (!named) {
    return null;
  }
  return isAbsolute(named) ? named : join(filing.directory, named);
}
