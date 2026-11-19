#!/opt/homebrew/bin/bun
/// <reference types="node" />
import * as command_scan from "../_lib/command_scan.ts";
import { deny, field, parse, readStdin } from "../_lib/hook_payload.ts";

export const VERBS: ReadonlySet<string> = new Set(["rm", "rmdir", "unlink", "shred"]);

export const TRIGGERS: readonly string[] = ["rm", "unlink", "shred", "-delete"];

export const REASONS: Readonly<Record<string, string>> = {
  find:
    "rm-to-trash: find -delete はファイルを消す。" +
    "`find ... -exec mv {} ~/.Trash/ \\;` に置き換える。",
  clean:
    "rm-to-trash: git clean は未追跡ファイルを消すので、コミットに復元元が無い。" +
    "`git clean -n` で対象を一覧し、残すものを確かめてから `mv <file> ~/.Trash/` で移す。" +
    "件数が多く 1 つずつ移せないときは、ユーザーに `! git clean -fd` での実行を依頼する。",
  verb:
    "rm-to-trash: 削除は `mv <file> ~/.Trash/ && git add <file>` を使う。" +
    "sandbox が `mv ~/.Trash/` を弾いたら dangerouslyDisableSandbox: true でリトライし、" +
    "他の sandbox エラーはユーザーに報告する。",
};

export function _deletes(tokens: readonly string[]): string | null {
  if (VERBS.has(tokens[0])) {
    return "verb";
  }
  if (tokens[0] === "find" && tokens.includes("-delete")) {
    return "find";
  }
  if (tokens[0] === "git") {
    const [subcommand, rest] = command_scan.git_subcommand(tokens);
    if (subcommand === "clean" && !command_scan.git_clean_only_lists(rest)) {
      return "clean";
    }
  }
  return null;
}

export function kind(command: string): string | null {
  try {
    for (const tokens of command_scan.commands(command)) {
      const found = _deletes(tokens);
      if (found) {
        return found;
      }
    }
    return null;
  } catch {
    return "verb";
  }
}

function main(): number {
  const raw = readStdin();
  if (
    !(TRIGGERS.some((word) => raw.includes(word)) || (raw.includes("git") && raw.includes("clean")))
  ) {
    return 0;
  }

  const command = field(parse(raw).tool_input, "command");
  if (typeof command !== "string" || !command) {
    return 0;
  }

  const found = kind(command);
  if (found) {
    deny(REASONS[found]);
  }
  return 0;
}

process.exit(main());
