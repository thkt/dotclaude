/// <reference types="node" />

import { readFileSync } from "node:fs";

export function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function mapping(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function parse(text: string): Record<string, unknown> {
  let loaded: unknown;
  try {
    loaded = JSON.parse(text || "{}");
  } catch {
    return {};
  }
  return mapping(loaded) ?? {};
}

export function field(container: unknown, key: string): unknown {
  const found = mapping(container);
  if (found === null) {
    return null;
  }
  return Object.hasOwn(found, key) ? found[key] : null;
}

export function notification(message: string, hookEventName: string): Record<string, unknown> {
  return {
    systemMessage: message,
    hookSpecificOutput: { hookEventName, additionalContext: message },
  };
}

export function notify(message: string, hookEventName: string = "PostToolUse"): void {
  process.stdout.write(`${JSON.stringify(notification(message, hookEventName))}\n`);
}

export function denial(reason: string): Record<string, unknown> {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

export function deny(reason: string): void {
  process.stdout.write(`${JSON.stringify(denial(reason))}\n`);
}

const EDITING_TOOLS = new Set(["Write", "Edit"]);

export function editedFile(text: string): string | null {
  const payload = parse(text);
  const toolName = payload.tool_name;
  if (typeof toolName !== "string" || !EDITING_TOOLS.has(toolName)) {
    return null;
  }
  const path = field(payload.tool_input, "file_path");
  return typeof path === "string" && path ? path : null;
}
