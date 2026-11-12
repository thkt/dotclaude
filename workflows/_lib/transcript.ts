/// <reference types="node" />
// Reads what a workflow script put into an agent's prompt back from that agent's transcript.
//
// A workflow script cannot touch a file or run a command, so everything it wants on disk or
// executed goes through an agent. Claude Code stores the agent's prompt as the first line of the
// agent's transcript, byte for byte. A helper the agent runs can read the script's data from
// there, so the agent copies none of it. relay.ts reads the commands to run this way, and
// write-body.ts the PR body.
import { closeSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// The agent runs the helper within seconds of its transcript being written. The window only
// keeps the scan from opening the transcripts of every past session.
const RECENT_MS = 2 * 60 * 60 * 1000;

// The digest the workflow scripts compute: FNV-1a over the UTF-16 code units of the text without
// its trailing whitespace, then the length. A script cannot import this module, so it carries its
// own copy, and the tests compare the two.
export const digest = (text: string): string => {
  const t = text.trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, "0")}:${t.length}`;
};

export const defaultProjects = (): string => join(homedir(), ".claude", "projects");

// One entry that cannot be read (a directory the sandbox denies, a transcript another session just
// removed) must not end the scan before it reaches the agent's own transcript.
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

// Agent transcripts live at <projects>/<project>/<session>/subagents/**/agent-<id>.jsonl.
const recentTranscripts = (projects: string, now: number): string[] =>
  entries(projects)
    .filter((project) => project.isDirectory())
    .flatMap((project) =>
      entries(join(projects, project.name))
        .filter((session) => session.isDirectory())
        .flatMap((session) => walk(join(projects, project.name, session.name, "subagents"))),
    )
    .filter((path) => /agent-[^/]+\.jsonl$/.test(path))
    .map((path) => ({ path, mtime: attempt(() => statSync(path).mtimeMs, 0) }))
    .filter((file) => now - file.mtime <= RECENT_MS)
    .sort((a, b) => b.mtime - a.mtime)
    .map((file) => file.path);

// A transcript runs to megabytes, and the prompt is its first line.
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

// The prompt's text: the content of the user message on the first line, as a string or as text
// parts. A transcript whose first line does not carry `marker` is skipped without parsing.
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

// The prompts of the agents whose transcripts changed recently, newest first, limited to those
// carrying `marker`.
export function* recentPrompts(
  projects: string,
  marker: string,
): Generator<{ transcript: string; text: string }> {
  for (const transcript of recentTranscripts(projects, Date.now())) {
    const text = promptOf(transcript, marker);
    if (text) yield { transcript, text };
  }
}
