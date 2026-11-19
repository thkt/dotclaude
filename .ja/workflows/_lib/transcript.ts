/// <reference types="node" />
import { closeSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const RECENT_MS = 2 * 60 * 60 * 1000;

export const digest = (text: string): string => {
  const t = text.trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, "0")}:${t.length}`;
};

export const defaultProjects = (): string =>
  process.env.RELAY_PROJECTS || join(homedir(), ".claude", "projects");

const attempt = <T>(read: () => T, otherwise: T): T => {
  try {
    return read();
  } catch {
    return otherwise;
  }
};
const entries = (dir: string): Dirent[] =>
  attempt(() => readdirSync(dir, { withFileTypes: true }), []);
const walk = (dir: string): string[] =>
  entries(dir).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const scanGroups = (projects: string, session: string | undefined): string[][] => {
  const all = entries(projects)
    .filter((project) => project.isDirectory())
    .flatMap((project) =>
      entries(join(projects, project.name))
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          session: entry.name,
          dir: join(projects, project.name, entry.name, "subagents"),
        })),
    );
  const dirsOf = (own: boolean) =>
    all.filter((found) => (found.session === session) === own).map((found) => found.dir);
  return dirsOf(true).length ? [dirsOf(true), dirsOf(false)] : [dirsOf(false)];
};
const recentTranscripts = (dirs: string[], now: number): string[] =>
  dirs
    .flatMap(walk)
    .filter((path) => /agent-[^/]+\.jsonl$/.test(path))
    .map((path) => ({ path, mtime: attempt(() => statSync(path).mtimeMs, 0) }))
    .filter((file) => now - file.mtime <= RECENT_MS)
    .sort((a, b) => b.mtime - a.mtime)
    .map((file) => file.path);

const firstLine = (path: string): string => {
  const fd = openSync(path, "r");
  try {
    const chunks: Buffer[] = [];
    const buffer = Buffer.alloc(64 * 1024);
    for (;;) {
      const read = readSync(fd, buffer, 0, buffer.length, null);
      if (read === 0) break;
      const end = buffer.subarray(0, read).indexOf(0x0a);
      chunks.push(Buffer.from(buffer.subarray(0, end < 0 ? read : end)));
      if (end >= 0) break;
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    closeSync(fd);
  }
};

const promptOf = (transcript: string, marker: string): string => {
  const line = attempt(() => firstLine(transcript), "");
  if (!line.includes(marker)) return "";
  const entry = attempt(() => JSON.parse(line), null);
  const content = entry?.type === "user" ? entry.message?.content : null;
  if (typeof content === "string") return content;
  return Array.isArray(content)
    ? content
        .filter((part) => part?.type === "text")
        .map((part) => String(part.text))
        .join("\n")
    : "";
};

export function* recentPrompts(
  projects: string,
  marker: string,
): Generator<{ transcript: string; text: string }> {
  const now = Date.now();
  for (const dirs of scanGroups(projects, process.env.CLAUDE_CODE_SESSION_ID)) {
    for (const transcript of recentTranscripts(dirs, now)) {
      const text = promptOf(transcript, marker);
      if (text) yield { transcript, text };
    }
  }
}
