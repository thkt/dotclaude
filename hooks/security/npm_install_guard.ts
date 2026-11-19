#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import * as command_scan from "../_lib/command_scan.ts";
import { deny, field, parse, readStdin } from "../_lib/hook_payload.ts";

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

export const NI_INSTALLS: ReadonlySet<string> = new Set(["ni", "nci", "nup"]);

export const RUNNERS: ReadonlySet<string> = new Set(["npx", "bunx", "nlx"]);

export const FETCH_AND_RUN: ReadonlySet<string> = new Set(["dlx", "exec", "x"]);

export const SUBCOMMANDS: ReadonlySet<string> = new Set([...INSTALLS, ...FETCH_AND_RUN]);

export const OVERRIDES: ReadonlySet<string> = new Set([
  "--no-ignore-scripts",
  "--ignore-scripts=false",
]);

export const VALUED_NPM_FLAGS: ReadonlySet<string> = new Set([
  "--prefix",
  "-C",
  "--registry",
  "-w",
  "--workspace",
]);

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

function _cd(directory: string, target: string): string {
  return path.isAbsolute(target) ? target : path.join(directory, target);
}

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
    return ["unparsable", directory];
  }
  if (found.length === 0) {
    return null;
  }
  const override = found.some((tokens) => tokens.some((arg) => OVERRIDES.has(arg)));
  return [override ? "override" : "install", directory];
}

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

export function _configured(directory: string): boolean {
  const project = _setting(path.join(directory, ".npmrc"));
  if (project !== null) {
    return project;
  }
  return Boolean(_setting(path.join(homedir(), ".npmrc")));
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
