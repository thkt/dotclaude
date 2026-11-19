/// <reference types="node" />
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, join } from "node:path";

const DEFAULT_BUN = "/opt/homebrew/bin/bun";

export function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) {
      return false;
    }
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function which(name: string): string | null {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) {
      continue;
    }
    const candidate = join(dir, name);
    if (isExecutableFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function tsRuntime(): string | null {
  const bun = process.env.CLAUDE_BUN_BIN || DEFAULT_BUN;
  if (isExecutableFile(bun)) {
    return bun;
  }
  return which("node");
}
