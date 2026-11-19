/// <reference types="node" />
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const SHEBANG: string = "#!/opt/homebrew/bin/bun";

export const STALE_SHEBANG: string = "#!/usr/bin/env bun";

const EXEC_MODE = "100755";

export const FIXTURES_ROOT = "hooks/_lib/tests/fixtures";
export const FIXTURES_EXCLUDE = `:(exclude)${FIXTURES_ROOT}/**`;

export function trackedEntries(
  pathspec: string | readonly string[],
): Array<[mode: string, absolutePath: string]> {
  const tokens = typeof pathspec === "string" ? [pathspec] : [...pathspec];
  const output = execFileSync("git", ["-C", REPO, "ls-files", "-s", "-z", "--", ...tokens], {
    encoding: "utf8",
  });
  const entries: Array<[string, string]> = [];
  for (const line of output.split("\0")) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    const mode = line.slice(0, tab).split(" ")[0] ?? "";
    entries.push([mode, path.join(REPO, line.slice(tab + 1))]);
  }
  return entries;
}

function readTextOrNull(absolutePath: string): string | null {
  try {
    return readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
}

const LINE_BREAK = /\r?\n/;

function firstLine(text: string): string {
  return text.split(LINE_BREAK, 1)[0] ?? "";
}

function relative(absolutePath: string): string {
  return path.relative(REPO, absolutePath);
}

export function executableShebangOffenders(
  pathspec: string | readonly string[],
  shebang: string,
): string[] {
  const offenders: string[] = [];
  for (const [mode, absolutePath] of trackedEntries(pathspec)) {
    if (mode !== EXEC_MODE) continue;
    const text = readTextOrNull(absolutePath);
    if (text !== null && firstLine(text) !== shebang) offenders.push(relative(absolutePath));
  }
  return offenders;
}

export function staleShebangOffenders(
  pathspec: string | readonly string[],
  staleLine: string,
): string[] {
  const offenders: string[] = [];
  for (const [, absolutePath] of trackedEntries(pathspec)) {
    const text = readTextOrNull(absolutePath);
    if (text !== null && text.split(LINE_BREAK).includes(staleLine)) {
      offenders.push(relative(absolutePath));
    }
  }
  return offenders;
}

function collectCommandScripts(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectCommandScripts(item, out);
    return;
  }
  if (node !== null && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.command === "string") out.push(record.command);
    for (const value of Object.values(record)) collectCommandScripts(value, out);
  }
}

function settingsCommandScripts(commands: readonly string[]): string[] {
  const scripts: string[] = [];
  for (const command of commands) {
    for (const token of command.split(/\s+/)) {
      if (token.startsWith("~/.claude/") && token.endsWith(".ts")) {
        scripts.push(token.slice("~/.claude/".length));
      }
    }
  }
  return scripts;
}

export function settingsCommandShebangOffenders(settings: unknown, shebang: string): string[] {
  const hooksNode =
    settings !== null && typeof settings === "object"
      ? (settings as Record<string, unknown>).hooks
      : undefined;
  const commands: string[] = [];
  collectCommandScripts(hooksNode ?? {}, commands);
  const scripts = settingsCommandScripts(commands);

  const trackedModes = new Map(
    trackedEntries("hooks/*.ts").map(([mode, absolutePath]) => [relative(absolutePath), mode]),
  );
  const offenders: string[] = [];
  for (const rel of scripts) {
    const text = trackedModes.get(rel) === EXEC_MODE ? readTextOrNull(path.join(REPO, rel)) : null;
    if (text === null || firstLine(text) !== shebang) offenders.push(rel);
  }
  return offenders;
}

export function libHasShebangOffenders(pathspec: string | readonly string[]): string[] {
  const offenders: string[] = [];
  for (const [, absolutePath] of trackedEntries(pathspec)) {
    const text = readTextOrNull(absolutePath);
    if (text !== null && firstLine(text).startsWith("#!")) offenders.push(relative(absolutePath));
  }
  return offenders;
}
