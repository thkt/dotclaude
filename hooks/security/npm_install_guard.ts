#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PreToolUse hook: block a package install when ignore-scripts is not configured. The
// TypeScript replacement for the retired npm_install_guard Python hook (DR-0112's migration);
// MANAGERS / INSTALLS / NI_INSTALLS / RUNNERS / FETCH_AND_RUN / SUBCOMMANDS / OVERRIDES /
// VALUED_NPM_FLAGS / TRIGGERS / REASONS and _installs / _target / _setting / _configured /
// main carry the Python side's names and shapes.
//
// Failure mode: fail-closed (security enforcement).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import * as command_scan from "../_lib/command_scan.ts";
import { deny, field, parse } from "../_lib/hook_payload.ts";

export const MANAGERS: ReadonlySet<string> = new Set(["npm", "pnpm", "yarn", "bun"]);
export const INSTALLS: ReadonlySet<string> = new Set([
  "install",
  "i",
  "ci",
  "add",
  "update",
  "up",
  "upgrade",
]);

// What package_manager_rewrite.py rewrites the managers into (#643 fixes the inclusion).
export const NI_INSTALLS: ReadonlySet<string> = new Set(["ni", "nci", "nup"]);

// Fetch-and-run: the package and its dependencies are installed before the bin runs
// (#643 fixes the inclusion).
export const RUNNERS: ReadonlySet<string> = new Set(["npx", "bunx", "nlx"]);

// The same fetch-and-run written as a subcommand of a manager.
export const FETCH_AND_RUN: ReadonlySet<string> = new Set(["dlx", "exec", "x"]);

export const SUBCOMMANDS: ReadonlySet<string> = new Set([...INSTALLS, ...FETCH_AND_RUN]);

// Read from the command line, these turn the setting back off, and the command line wins over
// .npmrc.
export const OVERRIDES: ReadonlySet<string> = new Set([
  "--no-ignore-scripts",
  "--ignore-scripts=false",
]);

// npm options that swallow the token after them, which would otherwise read as the subcommand
// (`npm --prefix /tmp install` would resolve to /tmp).
export const VALUED_NPM_FLAGS: ReadonlySet<string> = new Set([
  "--prefix",
  "-C",
  "--registry",
  "-w",
  "--workspace",
]);

// Matched anywhere in the payload rather than at its head, since an install written after a
// `cd` or on a second line installs the same way. `ni` carries its delimiters so the two
// letters do not match inside another word.
export const TRIGGERS: readonly string[] = [
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "bun",
  "nlx",
  "nci",
  "nup",
  " ni",
  '"ni',
];

export const REASONS: Readonly<Record<string, string>> = {
  unparsable:
    "npm-safe-install: 引用符が閉じておらずコマンドを解析できない。引用符を閉じて再試行する",
  override:
    "npm-safe-install: --ignore-scripts=false / --no-ignore-scripts は .npmrc の設定を" +
    "打ち消し、依存の install script が任意のコードを実行できる。" +
    "このフラグを外して再試行する。",
  install:
    "npm-safe-install: ignore-scripts=true が有効でなく、依存の install script が" +
    "任意のコードを実行できる。" +
    "echo 'ignore-scripts=true' >> ~/.npmrc を実行してから再試行する。" +
    "走らせる先の .npmrc が false で打ち消しているなら、そちらを直す。",
};

/** Whether a token list installs a package. */
export function _installs(tokens: readonly string[]): boolean {
  if (NI_INSTALLS.has(tokens[0]) || RUNNERS.has(tokens[0])) {
    return true;
  }
  if (!MANAGERS.has(tokens[0])) {
    return false;
  }
  const [sub] = command_scan.subcommand(tokens, VALUED_NPM_FLAGS);
  return sub !== null && SUBCOMMANDS.has(sub);
}

/** Join a `cd` target onto the directory tracked so far, the way pathlib's `/` operator does:
 * an absolute target replaces the directory outright instead of nesting under it. */
function _cd(directory: string, target: string): string {
  return path.isAbsolute(target) ? target : path.join(directory, target);
}

/** The verdict for a command line and where it would run, or null when nothing installs.
 *
 * Not the first token of the raw string: `cd /tmp && npm install` reads as `cd`, and the two
 * spaces in `npm  install` leave the subcommand empty. The directory follows every cd ahead
 * of the install, since `cd a && cd b` lands in a/b and the .npmrc there is the one npm will
 * read. */
export function _target(command: string): [string, string] | null {
  let directory = process.cwd();
  const found: string[][] = [];
  try {
    for (const tokens of command_scan.commands(command)) {
      if (tokens[0] === "cd" && tokens.length > 1) {
        directory = _cd(directory, tokens[1]);
      } else if (_installs(tokens)) {
        found.push(tokens);
      }
    }
  } catch {
    return ["unparsable", directory]; // an unclosed quote hides which flags the install carries
  }
  if (found.length === 0) {
    return null;
  }
  const override = found.some((tokens) => tokens.some((arg) => OVERRIDES.has(arg)));
  return [override ? "override" : "install", directory];
}

/** What one .npmrc says about ignore-scripts, or null when it says nothing.
 *
 * Whitespace around the `=` is allowed, since npm reads `ignore-scripts = true` as true. A
 * value in any other spelling, `TRUE` among them, is not a boolean to npm either, so it
 * counts as unset here for the same reason. */
export function _setting(npmrc: string): boolean | null {
  let text: string;
  try {
    text = readFileSync(npmrc, "utf8");
  } catch {
    return null;
  }
  let answer: boolean | null = null;
  for (const line of text.split(/\r\n|\r|\n/)) {
    const split = line.indexOf("=");
    if (split === -1) {
      continue;
    }
    const name = line.slice(0, split).trim();
    if (name === "ignore-scripts") {
      answer = line.slice(split + 1).trim() === "true";
    }
  }
  return answer;
}

/** Whether install scripts are off where the command will run.
 *
 * The project's .npmrc wins over the home one, following npm's own order. A home that turns
 * scripts off is undone by a project that turns them back on. */
export function _configured(directory: string): boolean {
  const project = _setting(path.join(directory, ".npmrc"));
  if (project !== null) {
    return project;
  }
  return Boolean(_setting(path.join(homedir(), ".npmrc")));
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
  if (!TRIGGERS.some((word) => raw.includes(word))) {
    return 0;
  }

  const command = field(parse(raw).tool_input, "command");
  if (typeof command !== "string" || !command) {
    return 0;
  }

  const target = _target(command);
  if (target === null) {
    return 0;
  }
  const [verdict, directory] = target;
  if (verdict === "install" && _configured(directory)) {
    return 0;
  }
  deny(REASONS[verdict]);
  return 0;
}

process.exit(main());
