#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as commandScan from "../_lib/command_scan.ts";
import * as ghFiling from "../_lib/gh_filing.ts";
import { field, notify, parse, readStdin } from "../_lib/hook_payload.ts";
import { hasJapanese } from "../_lib/japanese.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEXTLINT_CONFIG = join(REPO_ROOT, ".textlintrc.json");

function _textlint_runner(): readonly [string, ...string[]] | null {
  if (spawnSync("which", ["bun"]).status === 0) {
    return ["bun", "x"];
  }
  if (spawnSync("which", ["npx"]).status === 0) {
    return ["npx"];
  }
  return null;
}

function _textlint_lint(path: string): string {
  try {
    if (!statSync(TEXTLINT_CONFIG).isFile()) {
      return "";
    }
  } catch {
    return "";
  }
  const runner = _textlint_runner();
  if (runner === null) {
    return "";
  }
  const result = spawnSync(runner[0], [...runner.slice(1), "textlint", path, "--config", TEXTLINT_CONFIG], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return result.stdout ?? "";
}

export const HEREDOC = /<<-?\s*(['"]?)(\w+)\1/;

export interface Mode {
  readonly label: string;
  readonly threshold: number | null;
  readonly checklist: boolean;
}

export const FILING: Mode = { label: "body", threshold: null, checklist: true };
export const COMMIT: Mode = { label: "commit message", threshold: 10, checklist: false };

export const COMMIT_INLINE: readonly string[] = ["-m", "--message"];
export const COMMIT_FILE: readonly string[] = ["-F", "--file"];

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

function _filing_body(filing: ghFiling.Filing): string | null {
  const inline = ghFiling.flag(filing, ghFiling.BODY_FLAGS);
  if (inline !== null) {
    return inline;
  }
  const target = ghFiling.body_file(filing);
  return target !== null ? _read(target) : null;
}

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
  return isAbsolute(path) ? _read(path) : null;
}

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
    return null;
  }
  return null;
}

function _lint_section(body: string, mode: Mode): string {
  if (!hasJapanese(body, mode.threshold)) {
    return "";
  }
  const dir = mkdtempSync(join(tmpdir(), "body-proofread-"));
  try {
    const target = join(dir, "body.md");
    writeFileSync(target, `${body}\n`, "utf8");
    const output = _textlint_lint(target);
    if (!output.trim()) {
      return "";
    }
    const label = mode.label;
    const kept = output.split("\n").filter((line) => line.trim() !== target);
    const findings = kept.map((line) => line.replaceAll(target, label)).join("\n");
    return `## textlint 校正結果\n\nこの ${label} は作成済み。以下の指摘のうち直す価値があるものを編集で反映する。\n\n${findings}\n\n`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function _checklist(): string {
  let body: string;
  try {
    body = readFileSync(new URL("./body_proofread.md", import.meta.url), "utf8");
  } catch {
    return "";
  }
  const marker = "\n## ";
  const at = body.indexOf(marker);
  if (at === -1) {
    return "";
  }
  return `## ${body.slice(at + marker.length)}`.trim();
}

function main(): number {
  const raw = readStdin();
  if (!((raw.includes("gh") && raw.includes("create")) || (raw.includes("git") && raw.includes("commit")))) {
    return 0;
  }

  const payload = parse(raw);
  const command = field(payload.tool_input, "command");
  if (typeof command !== "string" || !command) {
    return 0;
  }

  const target = _target(command);
  if (target === null) {
    return 0;
  }
  const [mode, body] = target;

  const parts = [_lint_section(body, mode)];
  if (mode.checklist) {
    parts.push(_checklist());
  }
  const context = parts.filter(Boolean).join("\n\n");
  if (!context) {
    return 0;
  }
  notify(context, "PreToolUse");
  return 0;
}

process.exit(main());
