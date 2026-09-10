/// <reference types="node" />
// The TypeScript port of hooks/_lib/scribe_trigger.py's public surface: DEFAULT_GH, find, and
// shouldPrompt. Follows scribe_gate.ts's naming convention for this same Python module's
// snake_case names (should_run -> shouldRun there; should_prompt -> shouldPrompt here), not
// command_scan.ts's literal-name convention -- that module carries a differential test pinning
// python and TypeScript to identical names, which this module does not.
//
// No shebang and no exec bit: hooks/_lib/tests/shebang-ts.test.ts's T-013 forbids a shebang
// line under hooks/_lib/*.ts, the same rule scribe_gate.ts follows.
//
// unmergedScribePrExists / lastScribeMerge / hasNewInput / defaultRunner below duplicate
// scribe_gate.ts's own private copies of the same scribe_trigger.py helpers rather than
// importing them: DR-0116 scoped scribe_trigger.ts out of that unit, so scribe_gate.ts ported
// its own unexported slice first. This module is scribe_trigger.py's real destination; the two
// copies stay independent per DRY's boundary (each can evolve independently -- scribe_gate.ts
// answers a CI should-run question, this module a hook cooldown question).
import { spawnSync } from "node:child_process";
import { accessSync, closeSync, constants, mkdirSync, openSync, statSync, utimesSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { commands, starts_with } from "./command_scan.ts";

/** A gh invocation, injected so tests hand over canned stdout instead of a live gh process.
 * Mirrors scribe_trigger.py's GhRunner. */
export type GhRunner = (args: readonly string[]) => string;

/** A hook starts with PATH cut down, so a bare `gh` raises before any gate runs.
 * Mirrors scribe_trigger.py's DEFAULT_GH; CLAUDE_GH_BIN overrides it (T-387). */
export const DEFAULT_GH = "/opt/homebrew/bin/gh";

// The interval a stamp counts as recent. Mirrors scribe_trigger.py's WINDOW_MINUTES.
const WINDOW_MINUTES = 8 * 60;

export interface ShouldPromptOptions {
  readonly stamp?: string;
  readonly runner?: GhRunner;
  readonly gh?: string;
}

/** `~` and `~/rest` expand the way a shell expands them ahead of `cd`; scribe_trigger.py's find
 * gets this for free from `Path.expanduser()`. */
function expandHome(target: string): string {
  if (target === "~") {
    return homedir();
  }
  if (target.startsWith("~/")) {
    return join(homedir(), target.slice(2));
  }
  return target;
}

/** Mirrors pathlib's `directory / Path(target).expanduser()`: an absolute right side replaces
 * `directory` outright rather than joining onto it, which is what a real `cd /abs/path` does. */
function resolveCd(directory: string, target: string): string {
  const expanded = expandHome(target);
  return isAbsolute(expanded) ? expanded : join(directory, expanded);
}

/** The directory a `git pull` runs in, or null when the line runs none.
 * Mirrors scribe_trigger.py's find.
 *
 * A lexing failure (an unterminated quote) leaves this silent rather than throwing (T-389): the
 * Python original lets that same command_scan failure propagate to its own caller,
 * hooks/post-bash/scribe_prompt.py; this port has no such caller yet, so the module itself
 * absorbs it, the same silence should_prompt keeps for a broken gh call. */
export function find(command: string): string | null {
  let scanned: string[][];
  try {
    scanned = [...commands(command)];
  } catch {
    return null;
  }
  let directory = process.cwd();
  for (const tokens of scanned) {
    if (tokens[0] === "cd" && tokens.length > 1) {
      // `cd ~/.claude` is what the shell expands, not a directory named `~`.
      directory = resolveCd(directory, tokens[1]);
      continue;
    }
    if (starts_with(tokens, ["git", "pull"])) {
      return directory;
    }
  }
  return null;
}

function defaultStamp(): string {
  return join(homedir(), ".cache", "claude-scribe_trigger.last");
}

function recentlyStamped(stamp: string): boolean {
  try {
    return Date.now() - statSync(stamp).mtimeMs < WINDOW_MINUTES * 60_000;
  } catch {
    return false;
  }
}

/** A stamp that fails to write silently turns the cooldown off, which is the shape DR-0097 was
 * removed for. Report it instead. */
function touch(stamp: string): void {
  try {
    mkdirSync(dirname(stamp), { recursive: true });
    closeSync(openSync(stamp, "a"));
    const now = new Date();
    utimesSync(stamp, now, now);
  } catch (exc) {
    process.stderr.write(`scribe_trigger: cooldown stamp not written (${String(exc)})\n`);
  }
}

function isExecutableFile(candidate: string): boolean {
  try {
    if (!statSync(candidate).isFile()) {
      return false;
    }
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

/** gh runs with the pull's directory as cwd, so it reads the repository off that checkout's git
 * remote rather than off wherever the hook process started. */
function defaultRunner(directory: string, gh: string): GhRunner {
  return (args) => {
    const result = spawnSync(gh, args, { cwd: directory, encoding: "utf-8" });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`${gh} ${args.join(" ")} exited ${result.status}: ${result.stderr}`);
    }
    return result.stdout;
  };
}

/** skills/scribe/SKILL.md Phase 1 step 1: an open scribe PR already covers the backlog, so a
 * second nudge would only invite a second run to collide with it. */
function unmergedScribePrExists(call: GhRunner): boolean {
  const output = call(["pr", "list", "--label", "scribe", "--state", "open", "--json", "number"]);
  return (JSON.parse(output) as unknown[]).length > 0;
}

/** skills/scribe/SKILL.md Phase 2 step 1: the mergedAt of the last merged scribe PR, empty when
 * none has ever merged. `-q` hands back the bare value, not a JSON-quoted string. */
function lastScribeMerge(call: GhRunner): string {
  return call([
    "pr",
    "list",
    "--label",
    "scribe",
    "--state",
    "merged",
    "--limit",
    "1",
    "--json",
    "mergedAt",
    "-q",
    ".[0].mergedAt",
  ]).trim();
}

/** skills/scribe/SKILL.md Phase 2 steps 2-3. Returns on the first kind that has anything, so a
 * backlog carrying merged PRs costs one gh call rather than two. */
function hasNewInput(cursor: string, call: GhRunner): boolean {
  const search = cursor ? `-label:scribe merged:>${cursor}` : "-label:scribe";
  const prs = ["pr", "list", "--state", "merged", "--search", search, "--json", "number"];
  if ((JSON.parse(call(prs)) as unknown[]).length >= 1) {
    return true;
  }
  const issues = ["issue", "list", "--state", "closed", "--json", "number"];
  if (cursor) {
    issues.push("--search", `closed:>${cursor}`);
  }
  return (JSON.parse(call(issues)) as unknown[]).length >= 1;
}

/** Whether scribe should nudge for this directory. Mirrors scribe_trigger.py's should_prompt.
 *
 * Not a stamp on every evaluation: it would buy the gh round trips a quiet pull spends at the
 * cost of swallowing a merge that lands minutes into the window it opened. */
export function shouldPrompt(directory: string, options: ShouldPromptOptions = {}): boolean {
  if (!isDirectory(join(directory, "docs", "wiki"))) {
    return false;
  }
  const stampPath = options.stamp ?? defaultStamp();
  if (recentlyStamped(stampPath)) {
    return false;
  }
  const binary = options.gh || process.env.CLAUDE_GH_BIN || DEFAULT_GH;
  if (options.runner === undefined && !isExecutableFile(binary)) {
    return false;
  }
  const call = options.runner ?? defaultRunner(directory, binary);
  try {
    if (unmergedScribePrExists(call)) {
      return false;
    }
    if (!hasNewInput(lastScribeMerge(call), call)) {
      return false;
    }
  } catch {
    // None of these say a backlog is waiting, and raising here would report a hook error on a
    // plain pull.
    return false;
  }
  touch(stampPath);
  return true;
}
