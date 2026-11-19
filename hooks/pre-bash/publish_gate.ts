#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { appendFileSync } from "node:fs";
import path from "node:path";
import { commands, git_subcommand, VALUED_GIT_FLAGS } from "../_lib/command_scan.ts";
import {
  evaluate,
  gateLocation,
  PUBLISH_LOG_FILE,
  storedConfig,
  verdictText,
} from "../_lib/gate_record.ts";
import { deny, field, parse, readStdin } from "../_lib/hook_payload.ts";

type PublishKind = "git push" | "gh pr create" | "gh pr ready";

interface PublishTarget {
  kind: PublishKind;
  dir: string;
}

const HELP_FLAGS: ReadonlySet<string> = new Set(["--help", "-h"]);

const COMMIT_THEN_PUBLISH =
  "Pass `done_gate.ts check` on the current working tree and commit before you publish.";

function gitDirs(tokens: readonly string[]): string[] {
  const dirs: string[] = [];
  let index = 1;
  while (index < tokens.length && tokens[index].startsWith("-")) {
    if (tokens[index] === "-C" && index + 1 < tokens.length) {
      dirs.push(tokens[index + 1]);
    }
    index += VALUED_GIT_FLAGS.has(tokens[index]) ? 2 : 1;
  }
  return dirs;
}

function publishKind(tokens: readonly string[]): PublishKind | null {
  if (tokens[0] === "git") {
    const [sub, rest] = git_subcommand(tokens);
    return sub === "push" && !rest.some((arg) => HELP_FLAGS.has(arg)) ? "git push" : null;
  }
  if (tokens[0] !== "gh" || tokens[1] !== "pr") {
    return null;
  }
  const rest = tokens.slice(3);
  if (rest.some((arg) => HELP_FLAGS.has(arg))) {
    return null;
  }
  if (tokens[2] === "create") {
    return "gh pr create";
  }
  if (tokens[2] === "ready" && !rest.includes("--undo")) {
    return "gh pr ready";
  }
  return null;
}

function literalDir(arg: string): boolean {
  return arg !== "-" && !arg.startsWith("~") && !/[$`]/.test(arg);
}

function cdTarget(tokens: readonly string[], current: string): string | null {
  return tokens.length === 2 && literalDir(tokens[1]) ? path.resolve(current, tokens[1]) : null;
}

function publishTarget(command: string, cwd: string): PublishTarget | null {
  let current = cwd;
  for (const tokens of commands(command)) {
    if (tokens[0] === "cd") {
      current = cdTarget(tokens, current) ?? cwd;
      continue;
    }
    const kind = publishKind(tokens);
    if (kind === null) {
      continue;
    }
    let dir = current;
    if (kind === "git push") {
      for (const target of gitDirs(tokens)) {
        dir = literalDir(target) ? path.resolve(dir, target) : cwd;
      }
    }
    return { kind, dir };
  }
  return null;
}

function judge(text: string): void {
  const payload = parse(text);
  const command = field(field(payload, "tool_input"), "command");
  const cwd = field(payload, "cwd");
  if (typeof command !== "string" || typeof cwd !== "string") {
    return;
  }
  const target = publishTarget(command, cwd);
  if (target === null) {
    return;
  }
  const gate = gateLocation(target.dir);
  if (gate === null) {
    return;
  }
  const config = storedConfig(gate);
  if (config === null) {
    return;
  }
  const evaluation = evaluate(gate);
  if (evaluation === null) {
    throw new Error("could not hash the working tree");
  }
  const { tree, result } = evaluation;
  const sessionId = field(payload, "session_id");
  const entry = {
    at: new Date().toISOString(),
    session_id: typeof sessionId === "string" ? sessionId : null,
    command: target.kind,
    tree,
    done: result.done,
    ...(result.done ? {} : { reason: result.reason }),
  };
  appendFileSync(path.join(gate.dir, PUBLISH_LOG_FILE), `${JSON.stringify(entry)}\n`);
  if (config.mode === "enforce" && !result.done) {
    deny(`${verdictText(result)}\n${COMMIT_THEN_PUBLISH}`);
  }
}

function main(): number {
  const text = readStdin();
  if (!text.includes("push") && !text.includes("gh")) {
    return 0;
  }
  try {
    judge(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `publish_gate: allowed after an error: ${message.replace(/\s+/g, " ")}\n`,
    );
  }
  return 0;
}

process.exit(main());
