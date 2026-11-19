/// <reference types="node" />
function record(node: unknown, key: string): unknown {
  return node !== null && typeof node === "object"
    ? (node as Record<string, unknown>)[key]
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

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
