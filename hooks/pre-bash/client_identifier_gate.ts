#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deny, field, parse, readStdin } from "../_lib/hook_payload.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const GUARDED_REPO: string = realpathSync(path.join(HERE, "..", ".."));

export const LIST_PATH: string =
  process.env.CLAUDE_CLIENT_NAMES_FILE ||
  path.join(homedir(), ".config", "claude", "client-names.txt");

export const COMMIT_RE = /\bgit\b(?![^|;&]*(?<![\w-])--dry-run(?![\w-]))[^|;&]*\bcommit\b/;

export function _terms(): string[] {
  let raw: string;
  try {
    raw = readFileSync(LIST_PATH, "utf-8");
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const line of raw.split("\n")) {
    const term = line.split("#", 1)[0].trim();
    if (term) {
      out.push(term.toLowerCase());
    }
  }
  return out;
}

export function _repo_root(cwd: string): string | null {
  const proc = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
  });
  if (proc.error || proc.status !== 0) {
    return null;
  }
  return realpathSync(proc.stdout.trim());
}

export function _added_lines(cwd: string): string[] | null {
  const proc = spawnSync("git", ["diff", "--cached", "--no-color", "--unified=0"], {
    cwd,
    encoding: "utf8",
    timeout: 30_000,
  });
  if (proc.error || proc.status !== 0) {
    return null;
  }
  const keep: string[] = [];
  for (const line of proc.stdout.split("\n")) {
    if (line.startsWith("+++ ") || (line.startsWith("+") && !line.startsWith("+++"))) {
      keep.push(line);
    }
  }
  return keep;
}

export function _hit(
  lines: readonly string[],
  terms: readonly string[],
): readonly [string, string] | null {
  let current = "(unknown file)";
  for (const line of lines) {
    if (line.startsWith("+++ ")) {
      current = line.slice(4).replace(/^b\//, "");
      continue;
    }
    const low = line.toLowerCase();
    for (const term of terms) {
      if (low.includes(term)) {
        return [term, current];
      }
    }
  }
  return null;
}

function main(): number {
  const payload = parse(readStdin());
  if (field(payload, "tool_name") !== "Bash") {
    return 0;
  }
  const command = field(field(payload, "tool_input"), "command");
  if (typeof command !== "string" || !COMMIT_RE.test(command)) {
    return 0;
  }

  const terms = _terms();
  if (terms.length === 0) {
    return 0;
  }

  const rawCwd = field(payload, "cwd");
  const cwd = typeof rawCwd === "string" && rawCwd ? rawCwd : process.cwd();
  if (_repo_root(cwd) !== GUARDED_REPO) {
    return 0;
  }

  const lines = _added_lines(cwd);
  if (lines === null) {
    deny(
      `staged diff を読めないので commit を止めた。${GUARDED_REPO} は public で、` +
        "識別子の混入を確認できないまま履歴へ入れると取り消しに履歴書き換えが要る。" +
        "git status を確認してからやり直す。",
    );
    return 0;
  }

  const found = _hit(lines, terms);
  if (found === null) {
    return 0;
  }
  const [term, filePath] = found;
  deny(
    `${filePath} が private identifier list の語を追加している。${GUARDED_REPO} は public な` +
      "ので、この語を含む行を一般名 (業務リポジトリ、業務案件など) に書き換えてから" +
      `commit する。該当語は ${LIST_PATH} の ${term.length} 文字のエントリ。`,
  );
  return 0;
}

process.exit(main());
