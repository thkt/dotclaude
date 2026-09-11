#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PostToolUse hook: nudge toward /scribe when a git pull just brought down new work. The
// TypeScript replacement for the retired Python scribe_prompt hook (unit U-002), composing
// scribe_trigger.ts's find/shouldPrompt (unit U-001) and hook_payload.ts's parse/field/notify
// the way hooks/lifecycle/recall_index.ts composes hook_payload.ts's parse.
//
// The Bash tool_response carries no exit code
// (https://code.claude.com/docs/en/hooks#posttooluse-decision-control), so `interrupted` is the
// only field saying the call did not complete.
import { field, notify, parse, readStdin } from "../_lib/hook_payload.ts";
import { find, shouldPrompt } from "../_lib/scribe_trigger.ts";

// Mirrors the retired Python module's message text verbatim (T-390 pins the two identical).
const MESSAGE =
  "scribe_prompt: 直近の pull で docs/wiki/ 未反映の入力が増えた。" +
  "/scribe を実行して知見を抽出する。";

function toolResponseFailed(payload: Record<string, unknown>): boolean {
  return Boolean(field(field(payload, "tool_response"), "interrupted"));
}

function main(): number {
  const payload = parse(readStdin());
  if (toolResponseFailed(payload)) return 0;
  const command = field(field(payload, "tool_input"), "command");
  if (typeof command !== "string" || !command) return 0;
  // find() already absorbs a command_scan lexing failure (T-389), the same silence
  // shouldPrompt keeps for a broken gh call, so no try/catch is needed here.
  const directory = find(command);
  if (directory === null) return 0;
  if (!shouldPrompt(directory)) return 0;
  notify(MESSAGE);
  return 0;
}

process.exit(main());
