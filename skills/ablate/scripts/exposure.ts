/// <reference types="node" />
// Classifies one skill-reference arm's run from its stream-json transcript: whether the run
// read the fixture's own copy of the target reference (exposed), and whether any tool call
// touched a path outside the fixture -- the real skill directory or any other repository
// absolute path under `root` (contaminated). A contaminated run turns wiped into wiped+1, since
// the reviewer agent no longer sees only the fixture's stripped-down tree, so #743's Proposed
// solution step 2 excludes it from the counted runs rather than scoring it.
//
// The reviewer agent's own body carries the risk this guards against: when a
// ${CLAUDE_PLUGIN_ROOT}-prefixed path is left unexpanded (the fixture never runs through the
// full plugin harness), agents/reviewers/reviewer-readability.md tells the agent to "read the
// same path under ~/.claude/ instead" -- a real, absolute path outside the fixture. The same
// agent also carries Bash(ugrep:*) and Bash(bfs:*), so a contaminated run is not Read-only.
//
// The transcript is the newline-delimited JSON `--print --output-format stream-json` writes:
// each line is an event object, and an assistant event's message.content array holds tool_use
// blocks in the same shape the Messages API returns (verified against
// https://code.claude.com/docs/en/headless#stream-responses).
//
// Constant and function names stay snake_case, the convention arms.ts, verdict.ts and
// reference_arm.ts hold in this same directory.

import { homedir } from "node:os";
import { join } from "node:path";
import { fixture_relpath } from "./reference_arm.ts";

export interface ExposureResult {
  exposed: boolean;
  contaminated: boolean;
}

/** One assistant message's tool_use content block, the shape a stream-json transcript holds a
 * tool call in (docs.claude.com/en/docs/claude-code/headless#stream-responses: an assistant
 * event's message.content array holds Messages-API-shaped blocks). Only the fields this module
 * reads are declared. */
interface ToolUseBlock {
  type: "tool_use";
  name: string;
  input: unknown;
}

/** Every tool_use content block across a stream-json transcript's assistant events. Lines that
 * are not valid JSON, or that are not an assistant event carrying tool_use blocks, contribute
 * nothing -- a transcript's system/result events take other shapes entirely. */
function tool_use_blocks(transcript: string): ToolUseBlock[] {
  const blocks: ToolUseBlock[] = [];
  for (const rawLine of transcript.split("\n")) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) {
      continue;
    }
    let event: unknown;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (
      typeof event !== "object" ||
      event === null ||
      (event as Record<string, unknown>).type !== "assistant"
    ) {
      continue;
    }
    const message = (event as Record<string, unknown>).message;
    if (typeof message !== "object" || message === null) {
      continue;
    }
    const content = (message as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        (block as Record<string, unknown>).type === "tool_use"
      ) {
        blocks.push(block as ToolUseBlock);
      }
    }
  }
  return blocks;
}

/** Every string leaf `input` holds, recursing through arrays and plain objects. A tool's input
 * shape varies by tool (Read's file_path, Bash's command, Grep's path and pattern, ...), so
 * this reads every string value rather than one fixed field name. */
function string_leaves(input: unknown): string[] {
  if (typeof input === "string") {
    return [input];
  }
  if (Array.isArray(input)) {
    return input.flatMap(string_leaves);
  }
  if (typeof input === "object" && input !== null) {
    return Object.values(input).flatMap(string_leaves);
  }
  return [];
}

/** Whether `value` names or embeds a path under `base` (`value === base`, or `base` followed
 * by a path separator appears in it) -- an exact tool argument such as a Read's file_path
 * matches by equality, and a larger string such as a Bash command matches by the embedded
 * `base/...` substring the command names. */
function names_path_under(value: string, base: string): boolean {
  return value === base || value.includes(`${base}/`);
}

/** The spellings a tool argument can use for `root`: the absolute path, and when `root` sits
 * under `home`, the `~/...` and `$HOME/...` forms. The reviewer agent's own fallback line names
 * `~/.claude/`, and a Bash command carries that tilde unexpanded. */
function root_spellings(root: string, home: string): string[] {
  if (!root.startsWith(`${home}/`)) {
    return [root];
  }
  const rest = root.slice(home.length);
  return [root, `~${rest}`, `$HOME${rest}`];
}

/** Classifies one run's stream-json transcript against the fixture built for `element`
 * (reference_arm.ts's build_reference_fixture): `exposed` is whether the run read the
 * fixture's own copy of `element` at `cwd`; `contaminated` is whether any tool call touched a
 * real path under `root` -- the real skill directory or any other repository absolute path --
 * outside that fixture. */
export function classify_exposure(
  transcript: string,
  element: string,
  cwd: string,
  root: string,
  home: string = homedir(),
): ExposureResult {
  const fixtureTarget = join(cwd, fixture_relpath(element));
  const spellings = root_spellings(root, home);
  const blocks = tool_use_blocks(transcript);

  let exposed = false;
  let contaminated = false;

  for (const block of blocks) {
    if (
      block.name === "Read" &&
      typeof block.input === "object" &&
      block.input !== null &&
      (block.input as Record<string, unknown>).file_path === fixtureTarget
    ) {
      exposed = true;
    }
    for (const value of string_leaves(block.input)) {
      if (spellings.some((spelling) => names_path_under(value, spelling))) {
        contaminated = true;
      }
    }
  }

  return { exposed, contaminated };
}
