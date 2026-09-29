// Vendored copy of ~/.agents/scripts/shared/values.ts, the canonical source. Edit there first.
// Deviation: only the exports the capture adapter imports.
import { isAbsolute, relative, sep } from "node:path";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function outside(parent: string, child: string) {
  const path = relative(parent, child);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}
