/// <reference types="node" />
// Shared, `_`-prefixed settings.json hook-command scanner, the same `_`-prefix, no-.ja-mirror
// shape as hooks/_lib/tests/_hook-harness.ts and hooks/_lib/tests/_command-scan-corpus.ts: a
// pure helper other test files import from, not a test file of its own. hookCommands() reads the
// `command` string of every hook group registered under `eventName` in a parsed settings.json
// tree, optionally narrowed to the groups whose `matcher` equals the one given.
function record(node: unknown, key: string): unknown {
  return node !== null && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// The `command` strings of one hooks-array group, or [] when the group carries no hooks array or
// (a `matcher` was given and) its own matcher does not equal it.
function groupCommands(group: unknown, matcher: string | undefined): string[] {
  if (group === null || typeof group !== "object") return [];
  const groupRecord = group as Record<string, unknown>;
  if (matcher !== undefined && groupRecord.matcher !== matcher) return [];
  return asArray(groupRecord.hooks)
    .map((hook) => record(hook, "command"))
    .filter((command): command is string => typeof command === "string");
}

export function hookCommands(settings: unknown, eventName: string, matcher?: string): string[] {
  const eventNode = record(record(settings, "hooks"), eventName);
  return asArray(eventNode).flatMap((group) => groupCommands(group, matcher));
}
