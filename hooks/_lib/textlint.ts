/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { which } from "./executable.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG = join(REPO_ROOT, ".textlintrc.json");

function runner(): string[] | null {
  if (which("bun") !== null) return ["bun", "x"];
  if (which("npx") !== null) return ["npx"];
  return null;
}

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

function run(args: string[]): { stdout: string } | null {
  try {
    if (!statSync(CONFIG).isFile()) return null;
  } catch {
    return null;
  }
  const found = runner();
  if (found === null) return null;
  const result = spawnSync(found[0], [...found.slice(1), "textlint", ...args, "--config", CONFIG], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER_BYTES,
  });
  return { stdout: result.stdout ?? "" };
}

export function fix(path: string): void {
  run(["--fix", path]);
}

export function lint(path: string): string {
  const result = run([path]);
  return result !== null ? result.stdout : "";
}
