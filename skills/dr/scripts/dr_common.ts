/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function fail(...lines: string[]): never {
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exit(1);
}

export interface GitTopLevelResult {
  status: number | null;
  stdout: string;
  error?: Error;
}

export function resolveDrDir(
  env: NodeJS.ProcessEnv,
  arg: string | undefined,
  topLevel: GitTopLevelResult,
): string | null {
  if (env.DR_DIR) {
    return env.DR_DIR;
  }
  if (arg) {
    return arg;
  }
  if (topLevel.status !== 0) {
    return null;
  }
  return join(topLevel.stdout.trim(), "docs", "decisions");
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

export function guardSkillDir(drDir: string, hint: string): void {
  if (isFile(join(drDir, "SKILL.md"))) {
    fail(
      `Error: ${drDir} contains SKILL.md (skill-definition directory,` +
        " not a Decision Record archive)",
      hint,
    );
  }
}

export function splitFrontmatter(text: string): [string[], string[]] {
  const lines = text.split("\n");
  const fence = /^---[ \t]*$/;
  if (lines.length === 0 || !fence.test(lines[0])) {
    return [[], lines];
  }
  for (let i = 1; i < lines.length; i++) {
    if (fence.test(lines[i])) {
      return [lines.slice(1, i), lines.slice(i + 1)];
    }
  }
  return [[], lines];
}

export function gitTopLevel(): GitTopLevelResult {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout ?? "", error: result.error };
}

export function filesUnder(dir: string, keep: (name: string) => boolean): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...filesUnder(full, keep));
    } else if (entry.isFile() && keep(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

export function localDate(now: Date): string {
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
