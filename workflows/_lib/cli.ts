/// <reference types="node" />
// The stdin-payload parse/guard pair and the history-path/timestamp helpers shared by the
// history-recording CLIs (workflows/build/record.ts, workflows/assert/record.ts). Each of
// those scripts wrote its own copy of this flow; this module gives it one home, in the same
// shape as workflows/_lib/entry-point.ts (small, independently testable, named exports).
//
// parsePayload takes the raw stdin text and returns either the parsed object or the message
// the caller writes to stderr -- it never touches stdin or stderr itself. The thin function
// that reads fd 0, calls parsePayload, and writes the message to stderr on failure is the
// wrapper workflows/build/record.ts's `main` will call once that CLI is ported onto this
// module in a later unit; it is not exported yet because nothing here imports it, and an
// unimported export is a knip failure this repository enforces on write.
//
// historyPath takes `home` as an explicit argument rather than reading it from
// process.env.HOME or node:os itself, so a test (or a harness like U-006's) can point it at a
// temp directory without touching process.env.HOME. The CLI side passes `homedir()` in.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/** The outcome of parsing a stdin payload: the object on success, or null with the message
 * the caller writes to stderr on failure. Exactly one of the two is non-null. */
export interface PayloadResult {
  payload: Record<string, unknown> | null;
  message: string | null;
}

/** Parse `text` as JSON, a pure function: `{ value }` on success, or `{ error }` carrying the
 * parser's message on failure -- it touches neither stdin nor stderr. parsePayload's own
 * JSON.parse attempt lives here now; parsePayload calls this and layers its own message
 * prefix and object-shape check on top. */
export function parseJson(text: string): { value: unknown } | { error: string } {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** Parse `text` as a JSON object. Mirrors the two checks workflows/build/record.ts's `main`
 * ported from the Python recorder it replaces: unparseable text, then a value that parses but
 * is not a plain object (an array, a scalar, or null). The message text and prefix match the
 * Python recorder's so a caller switching to this module changes no stderr contract. The
 * JSON.parse attempt itself is parseJson's; this function adds only the message prefix and
 * the object-shape check.
 *
 * hooks/_lib/hook_payload.ts's `parse` is not reused here: it fails open to `{}`, which would
 * turn a malformed payload into a silently-empty row instead of the exit-1-and-write-nothing
 * behavior this CLI's callers require. */
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

/** The path a history file named `name` lives at under `home`, ensuring the containing
 * directory exists. `home` is an explicit argument rather than a read of `homedir()` or
 * `process.env.HOME`, so a caller (a test, or U-006's harness) can point it at a temp
 * directory without touching process state; the CLI's own entry point passes `homedir()`. */
export function historyPath(home: string, name: string): string {
  const dir = join(home, ".claude", "history");
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

/** `date` as a UTC ISO-8601 timestamp with second precision (no milliseconds). Defaults to
 * the current time, matching the `generated_at` field workflows/build/record.ts and
 * workflows/assert/record.ts both write. */
export function isoTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
