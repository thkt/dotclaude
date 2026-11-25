/// <reference types="node" />
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const HISTORICAL_DIRS = [
  "docs/decisions/",
  "docs/research/",
  "research/",
  ".claude/workspace/research/",
];

function isHistorical(path: string): boolean {
  return HISTORICAL_DIRS.some((dir) => path.startsWith(dir));
}

export function offendersAmong(
  files: string[],
  read: (path: string) => string,
  matches: (content: string, path: string) => boolean,
  extraExclusions: string[] = [],
): string[] {
  const offenders: string[] = [];
  for (const path of files) {
    if (isHistorical(path) || extraExclusions.includes(path)) continue;

    let content: string;
    try {
      content = read(path);
    } catch {
      continue;
    }

    if (matches(content, path)) offenders.push(path);
  }
  return offenders;
}

const trackedFilesCache = new Map<string, string[]>();

export function trackedFiles(repoRoot: string): string[] {
  let files = trackedFilesCache.get(repoRoot);
  if (!files) {
    files = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
      .split("\0")
      .filter((path) => path && existsSync(join(repoRoot, path)));
    trackedFilesCache.set(repoRoot, files);
  }
  return files;
}
