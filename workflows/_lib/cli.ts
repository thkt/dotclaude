/// <reference types="node" />
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export interface PayloadResult {
  payload: Record<string, unknown> | null;
  message: string | null;
}

export function parseJson(text: string): { value: unknown } | { error: string } {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export function parsePayload(text: string): PayloadResult {
  const parsed = parseJson(text);
  if ("error" in parsed) {
    return { payload: null, message: `Error: unparseable payload: ${parsed.error}` };
  }
  const loaded = parsed.value;
  if (typeof loaded !== "object" || loaded === null || Array.isArray(loaded)) {
    return { payload: null, message: "Error: payload must be a JSON object" };
  }
  return { payload: loaded as Record<string, unknown>, message: null };
}

export function historyPath(home: string, name: string): string {
  const dir = join(home, ".claude", "history");
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

export function isoTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function toPythonJson(value: object): string {
  const parts = Object.entries(value).map(
    ([key, entry]) => `${JSON.stringify(key)}: ${JSON.stringify(entry)}`,
  );
  return `{${parts.join(", ")}}`;
}
