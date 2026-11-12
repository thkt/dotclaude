#!/usr/bin/env node
/// <reference types="node" />
// Usage: write-body.ts <digest> <outfile> [projects-dir]
//
// Writes the PR body the implement workflow generated to <outfile> without an agent copying it.
// The workflow hands the body to its body agent as a base64 heredoc inside the prompt, and Claude
// Code stores that prompt in the agent's transcript. This reads the block back from the transcript,
// so no character of the body passes through the model. An agent copying about 10 KB of base64
// changes a character often enough that the digest check kept stopping the publication.
//
// <digest> is the workflow's digest of the body. Only a block that decodes to a body with that
// digest is written, so a block left by another run or for another body is never taken.
// [projects-dir] defaults to $HOME/.claude/projects.
//
// stdout: one line of JSON. {ok: true, transcript} or {ok: false, reason}
// exit 0 when the body was written. exit 1 when no transcript holds a matching block, and nothing
// is written. A host that keeps no transcript there (the Codex runner) always exits 1, and the
// workflow's agent then falls back to copying the block.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

// The body agent runs this within seconds of its transcript being written. The window only keeps
// the scan from reading every transcript of every past session.
const RECENT_MS = 2 * 60 * 60 * 1000;
const BLOCK = /<<'PR_BODY_B64'\n([\s\S]*?)\n\s*PR_BODY_B64/g;

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

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      })
    : [];

// Agent transcripts live at <projects>/<project>/<session>/subagents/**/agent-<id>.jsonl.
const transcripts = (projects: string, now: number): string[] => {
  const sessions = existsSync(projects)
    ? readdirSync(projects, { withFileTypes: true })
        .filter((project) => project.isDirectory())
        .flatMap((project) =>
          readdirSync(join(projects, project.name), { withFileTypes: true })
            .filter((session) => session.isDirectory())
            .map((session) => join(projects, project.name, session.name, "subagents")),
        )
    : [];
  return sessions
    .flatMap(walk)
    .filter((path) => /agent-[^/]+\.jsonl$/.test(path))
    .map((path) => ({ path, mtime: statSync(path).mtimeMs }))
    .filter((file) => now - file.mtime <= RECENT_MS)
    .sort((a, b) => b.mtime - a.mtime)
    .map((file) => file.path);
};

// The text of every user message in a transcript. The prompt is the first one.
const userTexts = (transcript: string): string[] =>
  readFileSync(transcript, "utf8")
    .split("\n")
    .filter((line) => line.includes("PR_BODY_B64"))
    .flatMap((line) => {
      try {
        const entry = JSON.parse(line);
        const content = entry.type === "user" ? entry.message?.content : null;
        if (typeof content === "string") return [content];
        return Array.isArray(content)
          ? content.filter((part) => part?.type === "text").map((part) => String(part.text))
          : [];
      } catch {
        return [];
      }
    });

export const bodyIn = (transcript: string, wanted: string): string | null => {
  for (const text of userTexts(transcript)) {
    for (const [, block] of text.matchAll(BLOCK)) {
      // The harness indents every line of a computed prompt, so whitespace carries nothing.
      const body = Buffer.from(block.replace(/\s+/g, ""), "base64").toString("utf8");
      if (digest(body) === wanted) return body;
    }
  }
  return null;
};

export function main(argv: string[], now: number = Date.now()): number {
  const [wanted, outfile, projects = join(homedir(), ".claude", "projects")] = argv;
  const report = (value: object) => process.stdout.write(`${JSON.stringify(value)}\n`);
  if (!wanted || !outfile) {
    report({ ok: false, reason: "usage: write-body.ts <digest> <outfile> [projects-dir]" });
    return 1;
  }
  for (const transcript of transcripts(projects, now)) {
    const body = bodyIn(transcript, wanted);
    if (body === null) continue;
    writeFileSync(outfile, body);
    report({ ok: true, transcript });
    return 0;
  }
  report({ ok: false, reason: `no recent agent transcript under ${projects} holds a body with digest ${wanted}` });
  return 1;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
