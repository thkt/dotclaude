/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { basename, dirname, relative, resolve } from "node:path";
import { editedFile } from "./hook_payload.ts";

export const MAX_FINDINGS = 40;

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

export function target(payloadText: string): [string, string] | null {
  const path = editedFile(payloadText);
  if (path === null || !path.endsWith(".rs")) {
    return null;
  }
  const result = spawnSync("git", ["-C", dirname(path), "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  const root = (result.stdout ?? "").trim();
  if (result.status !== 0 || !root) {
    return null;
  }
  return [root, path];
}

function relativeToRoot(root: string, file: string): string {
  const rel = relative(resolve(root), resolve(file));
  return rel.startsWith("..") ? basename(file) : rel;
}

function findings(root: string, file: string): string {
  const relativePath = relativeToRoot(root, file);
  const result = spawnSync("cargo", ["clippy", "--message-format", "short", "--color", "never"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER_BYTES,
  });
  if (result.status === null) {
    return "";
  }
  const lines = splitLines((result.stdout ?? "") + (result.stderr ?? ""));
  const edited = lines.filter((line) => line.includes(relativePath));
  const others = lines.filter((line) => !line.includes(relativePath));
  return [...edited, ...others].slice(0, MAX_FINDINGS).join("\n");
}

export function clippyOutput(event: string, root: string, file: string): string | null {
  const found = findings(root, file);
  if (!found.trim()) {
    return null;
  }
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: found,
    },
  });
}

export function fmt(root: string): void {
  spawnSync("cargo", ["fmt"], { cwd: root, encoding: "utf8" });
}
