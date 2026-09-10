/// <reference types="node" />
// TypeScript side of hooks/pre-bash/body_proofread.py's target-selection primitives (unit
// U-006): what a gh filing or a git commit line is about to write, paired with how to label it.
// HEREDOC / Mode / FILING / COMMIT / COMMIT_INLINE / COMMIT_FILE / _target / _heredoc_body /
// _flag carry the Python side's names and shapes.
//
// The textlint pass (_lint_section), the structure checklist (_checklist), and main are outside
// this unit's contract and land in a later one, once their own dependencies (textlint, the
// japanese-detection helper) have a TypeScript side of their own. Until that unit adds main(),
// this file carries no hook entry point -- no shebang, no process.exit(main()) (DR-0114 names
// that shape for the hook body itself, which this file does not become until that later unit).
// Tests import this module directly for that reason (no in-process process.exit hazard the way
// client_identifier_gate.ts / package_manager_rewrite.ts / recall_index.ts carry), the same way
// hooks/_lib/tests/gh-filing.test.ts imports hooks/_lib/gh_filing.ts directly.
import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import * as commandScan from "../_lib/command_scan.ts";
import * as ghFiling from "../_lib/gh_filing.ts";

/** A heredoc marker, quoted or bare (body_proofread.py's HEREDOC). */
export const HEREDOC = /<<-?\s*(['"]?)(\w+)\1/;

export interface Mode {
  readonly label: string;
  readonly threshold: number | null;
  readonly checklist: boolean;
}

export const FILING: Mode = { label: "body", threshold: null, checklist: true };
// The checklist asks about an issue's readers, which a commit message has none of.
export const COMMIT: Mode = { label: "commit message", threshold: 10, checklist: false };

// git commit spells these its own way, and `-F` names --file here where it names --body-file
// on a gh filing.
export const COMMIT_INLINE: readonly string[] = ["-m", "--message"];
export const COMMIT_FILE: readonly string[] = ["-F", "--file"];

/** The body of the first heredoc, or null when its marker never closes. */
export function _heredoc_body(text: string): string | null {
  const match = HEREDOC.exec(text);
  if (!match) {
    return null;
  }
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes(match[0])) {
      continue;
    }
    const body: string[] = [];
    for (const following of lines.slice(index + 1)) {
      if (following.trim() === match[2]) {
        return body.join("\n");
      }
      body.push(following);
    }
  }
  return null;
}

/** The value the tokens carry under any of the given flag spellings. */
export function _flag(tokens: readonly string[], names: readonly string[]): string | null {
  for (const name of names) {
    const value = commandScan.flag_value(tokens, name);
    if (value) {
      return value;
    }
  }
  return null;
}

function _read(target: string): string | null {
  try {
    if (!statSync(target).isFile()) {
      return null;
    }
    return readFileSync(target, "utf8");
  } catch {
    return null;
  }
}

/** The body a gh filing is about to write. A filing names its body through a flag, so a
 * heredoc on the same line is writing some other file, and reading it would proofread that
 * file under the issue's name. */
function _filing_body(filing: ghFiling.Filing): string | null {
  const inline = ghFiling.flag(filing, ghFiling.BODY_FLAGS);
  if (inline !== null) {
    return inline;
  }
  const target = ghFiling.body_file(filing);
  return target !== null ? _read(target) : null;
}

/** The message a commit is about to write. Its heredoc body is the message itself, and it
 * arrives as the value of an inline flag as well, so it is read before any flag. */
function _commit_body(command: string, tokens: readonly string[]): string | null {
  const body = _heredoc_body(command);
  if (body !== null) {
    return body;
  }
  const inline = _flag(tokens, COMMIT_INLINE);
  if (inline !== null) {
    return inline;
  }
  const path = _flag(tokens, COMMIT_FILE);
  if (path === null) {
    return null;
  }
  // A relative path stays unread: a commit carries no cd this hook can follow the way a
  // filing does, so the shell state that would resolve it is not on the command line.
  return isAbsolute(path) ? _read(path) : null;
}

/** What the command line is about to write, paired with how to label it.
 *
 * Read from tokens rather than from the raw string: a commit message that mentions
 * `gh issue create` would otherwise be taken for a filing, and the body would be looked for
 * in a filing that is not there, so the message reaches no one unproofread. */
export function _target(command: string): readonly [Mode, string] | null {
  try {
    const filing = ghFiling.find(command);
    if (filing !== null) {
      const body = _filing_body(filing);
      return body ? [FILING, body] : null;
    }
    for (const tokens of commandScan.commands(command)) {
      if (tokens[0] === "git" && commandScan.git_subcommand(tokens)[0] === "commit") {
        const body = _commit_body(command, tokens);
        return body ? [COMMIT, body] : null;
      }
    }
  } catch {
    return null; // an unclosed quote hides which command the line runs
  }
  return null;
}
