#!/usr/bin/env node
/// <reference types="node" />
// Usage: write-body.ts <digest> <outfile> [projects-dir]
//
// Writes the PR body the implement workflow generated to <outfile> without an agent copying it.
// The workflow puts the body into its body agent's prompt as a base64 block, and Claude Code stores
// that prompt as the first line of the agent's transcript. This reads the block back from there,
// so no character of the body passes through the model. An agent copying about 10 KB of base64
// changes a character often enough that the digest check kept stopping the publication.
//
// <digest> is the workflow's digest of the body. Only a block that decodes to a body with that
// digest is written, so a block left by another run or for another body is never taken.
// [projects-dir] defaults to $HOME/.claude/projects.
//
// stdout: one line of JSON. {ok: true, transcript} or {ok: false, reason}
// exit 0 when the body was written. exit 1 otherwise, with nothing written: no transcript holds a
// matching block, or the scan itself failed. A host that keeps no transcript there (the Codex
// runner) always exits 1, and the workflow then has an agent copy the block.
import { closeSync, openSync, readSync, readdirSync, statSync, writeFileSync } from "node:fs";
import type { Dirent } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

// The body agent runs this within seconds of its transcript being written. The window only keeps
// the scan from opening the transcripts of every past session.
const RECENT_MS = 2 * 60 * 60 * 1000;
// The block as the read-back prompt carries it, and as the copy prompt's heredoc carries it.
const BLOCK = /(?:PR_BODY_B64_BEGIN|<<'PR_BODY_B64')\n([\s\S]*?)\n\s*PR_BODY_B64(?:_END)?/g;

// The same digest implement.js computes: FNV-1a over the UTF-16 code units of the text without its
// trailing whitespace, then the length.
export const digest = (text: string): string => {
  const t = text.trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, "0")}:${t.length}`;
};

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
const transcripts = (projects: string, now: number): string[] =>
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

// The prompt's text: the content of the user message on the first line, as a string or as text parts.
const promptOf = (transcript: string): string => {
  const line = attempt(() => firstLine(transcript), "");
  if (!line.includes("PR_BODY_B64")) return "";
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

const bodyIn = (transcript: string, wanted: string): string | null => {
  for (const [, block] of promptOf(transcript).matchAll(BLOCK)) {
    // The harness indents every line of a computed prompt, so whitespace carries nothing.
    const body = Buffer.from(block.replace(/\s+/g, ""), "base64").toString("utf8");
    if (digest(body) === wanted) return body;
  }
  return null;
};

function main(argv: string[]): number {
  const [wanted, outfile, projects = join(homedir(), ".claude", "projects")] = argv;
  const report = (value: object) => process.stdout.write(`${JSON.stringify(value)}\n`);
  if (!wanted || !outfile) {
    report({ ok: false, reason: "usage: write-body.ts <digest> <outfile> [projects-dir]" });
    return 1;
  }
  try {
    for (const transcript of transcripts(projects, Date.now())) {
      const body = bodyIn(transcript, wanted);
      if (body === null) continue;
      writeFileSync(outfile, body);
      report({ ok: true, transcript });
      return 0;
    }
  } catch (error) {
    report({ ok: false, reason: `the scan of ${projects} failed: ${String(error)}` });
    return 1;
  }
  report({
    ok: false,
    reason: `no recent agent transcript under ${projects} opens with a body of digest ${wanted}`,
  });
  return 1;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
