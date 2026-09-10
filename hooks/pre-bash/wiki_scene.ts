#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PreToolUse hook: name the docs/wiki pages scoped to a gh command about to run. TypeScript
// side of hooks/pre-bash/wiki_scene.py (unit U-003, following the pre-bash hooks already ported:
// #634 / #642 / #643 land the same way -- copied, not redesigned). SCENE_COMMANDS / find /
// _scene_pages / main carry the Python side's names and shapes.
//
// Advisory: the decision is always allow, so a missing page never stops the command.
//
// main() ends in an unguarded process.exit(main()) (DR-0114, no isMainModule guard) -- the same
// hazard hooks/pre-bash/body_proofread.ts's header names -- so every test in
// hooks/pre-bash/tests/wiki-scene-find.test.ts spawns this file through
// hooks/_lib/tests/_hook-harness.ts's run() rather than importing its exports directly.
//
// find_wiki_rule.ts runs the cd-walked directory's own docs/wiki, and find_wiki_rule.ts runs
// through a JS runtime it resolves the same way wiki_scene.py's _runtime does.
import { spawnSync } from "node:child_process";
import { accessSync, constants, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import * as commandScan from "../_lib/command_scan.ts";
import { field, notify, parse } from "../_lib/hook_payload.ts";

// hooks/pre-bash/wiki_scene.ts -> hooks/pre-bash -> hooks -> repo root, the same two levels
// wiki_scene.py's Path(__file__).resolve().parents[2] climbs.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIND_WIKI_RULE = join(ROOT, "skills", "scribe", "scripts", "find_wiki_rule.ts");

// CLAUDE_BUN_BIN overrides the default bun install path the same way issue_body_gate.ts's
// _interpreter reads it, and `node` off PATH is the fallback when neither resolves to a
// runnable binary (wiki_scene.py's DEFAULT_BUN).
const DEFAULT_BUN = "/opt/homebrew/bin/bun";

// command_scan.starts_with reads position, not word presence, so `git commit -m "gh issue close
// 42"` never matches: "gh" sits inside a message argument, not at the position a command name
// occupies (wiki_scene.py's own SCENE_COMMANDS comment, unchanged here).
export const SCENE_COMMANDS: ReadonlyArray<readonly [readonly string[], string]> = [
  [["gh", "issue", "create"], "issue-create"],
  [["gh", "pr", "create"], "pr-create"],
  [["gh", "issue", "close"], "issue-close"],
];

/** `~` or `~/rest`, expanded against HOME the way a shell expands it ahead of running `cd`. A
 * token with no leading `~` is returned unchanged, matching Path.expanduser()'s own no-op on
 * those (wiki_scene.py's find, inlined here since command_scan.ts carries no such helper). */
function _expanduser(token: string): string {
  if (token === "~") {
    return homedir();
  }
  return token.startsWith("~/") ? join(homedir(), token.slice(2)) : token;
}

/** `directory` follows every cd ahead of the command, and `~` expands the same way a shell
 * expands it (wiki_scene.py's find).
 *
 * resolvePath, not join: a `cd` naming an absolute path resets the walk to it, the same way
 * pathlib's `/` operator (Python's `directory / Path(target)`) drops the left side once the
 * right side is absolute -- node:path's join would instead concatenate the two, which would
 * read `cd /elsewhere` as relative to wherever the walk already stood. */
export function find(command: string): readonly [string, string] | null {
  let directory = process.cwd();
  for (const tokens of commandScan.commands(command)) {
    if (tokens[0] === "cd" && tokens.length > 1) {
      directory = resolvePath(directory, _expanduser(tokens[1]));
      continue;
    }
    for (const [prefix, scene] of SCENE_COMMANDS) {
      if (commandScan.starts_with(tokens, prefix)) {
        return [directory, scene];
      }
    }
  }
  return null;
}

function _isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) {
      return false;
    }
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Where `name` resolves on PATH, or null when no directory on it carries an executable file by
 * that name -- the same hand-rolled PATH scan issue_body_gate.ts's _which uses, kept local here
 * rather than shared: this unit's target files are wiki_scene.ts and its test alone. */
function _which(name: string): string | null {
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) {
      continue;
    }
    const candidate = join(dir, name);
    if (_isExecutableFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** CLAUDE_BUN_BIN, else DEFAULT_BUN, else whatever `node` PATH resolves to. null when none of
 * the three is runnable, which reads the same as "no page" below rather than a hook error
 * (wiki_scene.py's _runtime). */
function _runtime(): string | null {
  const bun = process.env.CLAUDE_BUN_BIN || DEFAULT_BUN;
  if (_isExecutableFile(bun)) {
    return bun;
  }
  return _which("node");
}

/** The wiki pages find_wiki_rule.ts reports for `scene` under `directory`'s docs/wiki
 * (wiki_scene.py's _scene_pages). `directory` arrives absolute from find(), so wikiDir does too.
 *
 * Run as a subprocess rather than imported: find_wiki_rule.ts is the scribe skill's own CLI, and
 * a direct import would read its internals as this hook's API (wiki_scene.py's own reasoning,
 * unchanged here). */
function _scene_pages(directory: string, scene: string): string[] {
  const wikiDir = join(directory, "docs", "wiki");
  let isWikiDir: boolean;
  try {
    isWikiDir = statSync(wikiDir).isDirectory();
  } catch {
    isWikiDir = false;
  }
  if (!isWikiDir) {
    return [];
  }
  const runtime = _runtime();
  if (runtime === null) {
    return [];
  }
  // A non-zero exit means find_wiki_rule.ts rejected --scene: no page under wikiDir declares
  // it, which reads the same as "no pages" here rather than as a hook error.
  const result = spawnSync(runtime, [FIND_WIKI_RULE, wikiDir, "", "--scene", scene], {
    encoding: "utf8",
  });
  const pages = field(parse(result.stdout ?? ""), "scenes");
  return Array.isArray(pages) ? pages.map((page) => String(page)) : [];
}

function main(): number {
  const payload = parse(readFileSync(0, "utf8"));
  const command = field(payload.tool_input, "command");
  if (typeof command !== "string" || !command) {
    return 0;
  }
  let found: readonly [string, string] | null;
  try {
    found = find(command);
  } catch {
    // command_scan raises on a line shlex cannot close, and letting it out would report a hook
    // error on an ordinary command (wiki_scene.py's own main() catch, unchanged here).
    return 0;
  }
  if (found === null) {
    return 0;
  }
  const [directory, scene] = found;
  const pages = _scene_pages(directory, scene);
  if (pages.length === 0) {
    return 0;
  }
  const listing = pages.map((page) => `- ${page}`).join("\n");
  notify(`wiki_scene: ${scene} に該当する docs/wiki ページがある。\n${listing}`, "PreToolUse");
  return 0;
}

process.exit(main());
