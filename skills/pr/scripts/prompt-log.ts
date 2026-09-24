#!/usr/bin/env node
/// <reference types="node" />
// Usage: prompt-log.ts render <sessionId> --out <file> [--since <iso>]
//
// render reads a session's transcript, keeps the prompts a human sent, and writes them as
// Markdown to --out with an empty `Outcome:` line after each one.
//
// stdout: JSON { path, prompts, dropped }
// exit: 0 on success, 1 when a non-empty transcript holds no human prompt, 2 on a usage error
//
// TypeScript CLI for issue #727 U-001. Contract: skills/transcribe/scripts/cli.ts's subcommand
// structure and usage-header shape; skills/issue/scripts/validate-issue-body.ts's stdout-JSON /
// exit-code contract. A human prompt is an entry whose `type` is "user", whose
// `message.content` is a string, and whose `origin.kind` is "human"; `promptSource` is never
// read. A `<pasted_content ...>...</pasted_content>` body collapses to a one-line marker
// carrying its character count, and a `<system-reminder>...</system-reminder>` block is
// dropped entirely.
//
// Session-id ambiguity across multiple project directories (issue #727 U-002) is not handled
// here; resolveTranscript below returns the first match.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

const out = (text: string): void => {
  process.stdout.write(`${text}\n`);
};
const err = (text: string): void => {
  process.stderr.write(`${text}\n`);
};

const USAGE = "Usage: prompt-log.ts render <sessionId> --out <file> [--since <iso>]";

interface ParsedArgs {
  positional: string[];
  options: Record<string, string>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const options: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) options[arg.slice(2)] = argv[++i];
    else positional.push(arg);
  }
  return { positional, options };
}

/** A raw transcript line, read as loosely as the fields render touches. */
export interface TranscriptEntry {
  type?: string;
  isMeta?: boolean;
  timestamp?: string;
  origin?: { kind?: string };
  message?: { role?: string; content?: unknown };
}

/** The session's transcript file, found among the immediate children of `home`'s
 * `.claude/projects/<dir>/` directories. Scaffold only: returns the first match and does not
 * reject an ambiguous session id across two project directories -- issue #727 U-002 adds that
 * check (T-526, T-527). */
export function resolveTranscript(home: string, sessionId: string): string | null {
  const projectsDir = join(home, ".claude", "projects");
  if (!existsSync(projectsDir)) return null;
  for (const name of readdirSync(projectsDir)) {
    const projectDir = join(projectsDir, name);
    if (!statSync(projectDir).isDirectory()) continue;
    const candidate = join(projectDir, `${sessionId}.jsonl`);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Each line of `path` parsed as JSON, skipping a line that fails to parse. */
export function readEntries(path: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      entries.push(JSON.parse(line) as TranscriptEntry);
    } catch {
      // Not a parseable line; skipped rather than treated as a prompt.
    }
  }
  return entries;
}

/** A human prompt: `type` is "user", `message.content` is a string, and `origin.kind` is
 * "human". `promptSource` is never read (contract). This alone also excludes a tool-result
 * entry (content is an array), an isMeta entry (no origin.kind === "human"), a
 * task-notification entry (origin.kind is "task-notification"), and an assistant entry (type
 * is not "user"). */
export function isHumanPrompt(entry: TranscriptEntry): boolean {
  return (
    entry.type === "user" &&
    typeof entry.message?.content === "string" &&
    entry.origin?.kind === "human"
  );
}

const PASTED_CONTENT = /<pasted_content[^>]*>([\s\S]*?)<\/pasted_content>/g;
const SYSTEM_REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;

/** `text` with every `<system-reminder>...</system-reminder>` block dropped and every
 * `<pasted_content ...>...</pasted_content>` body collapsed to a one-line marker carrying its
 * character count. System-reminder blocks are stripped first so a pasted_content body that
 * happened to wrap one loses it along with the rest of the tag. */
export function collapsePromptText(text: string): string {
  return text
    .replace(SYSTEM_REMINDER, "")
    .replace(PASTED_CONTENT, (_match, body: string) => `[pasted_content: ${body.length} chars]`);
}

/** One prompt's Markdown block: a numbered heading, the prompt text fenced (collapsed via
 * collapsePromptText), and an empty `Outcome:` line for the agent writing the PR body to fill
 * in later. */
function promptBlock(index: number, entry: TranscriptEntry): string {
  const text = typeof entry.message?.content === "string" ? entry.message.content : "";
  const collapsed = collapsePromptText(text);
  return `### ${index}. ${entry.timestamp ?? ""}\n\n\`\`\`\n${collapsed}\n\`\`\`\n\nOutcome:\n`;
}

/** Why a raw entry was dropped, for the stderr summary: `beforeSince` when isHumanPrompt
 * accepted it but --since cut it, otherwise the reason isHumanPrompt itself rejected it on. */
function dropReason(entry: TranscriptEntry, beforeSince: boolean): string {
  if (beforeSince) return "before-since";
  if (entry.type !== "user") return "non-user";
  if (entry.isMeta) return "isMeta";
  if (typeof entry.message?.content !== "string") return "non-string-content";
  return `origin:${entry.origin?.kind ?? "none"}`;
}

/** Tallies `dropped` entries by dropReason and writes the counts to stderr. `prefix` carries
 * the sentence the count sits in, so the zero-human-prompt exit-1 path and the ordinary
 * partial-drop path each read as their own case rather than sharing one generic wording. */
function reportDropped(
  dropped: TranscriptEntry[],
  since: string | undefined,
  prefix: string,
): void {
  const tally: Record<string, number> = {};
  for (const entry of dropped) {
    const beforeSince = Boolean(
      since &&
      isHumanPrompt(entry) &&
      new Date(entry.timestamp ?? "").getTime() < new Date(since).getTime(),
    );
    const reason = dropReason(entry, beforeSince);
    tally[reason] = (tally[reason] ?? 0) + 1;
  }
  err(`${prefix} ${dropped.length} entries: ${JSON.stringify(tally)}`);
}

function renderCommand(positional: string[], options: Record<string, string>): number {
  const [sessionId] = positional;
  const outPath = options.out;
  if (!sessionId || !outPath) {
    err(USAGE);
    return 2;
  }
  const transcriptPath = resolveTranscript(homedir(), sessionId);
  if (!transcriptPath) {
    err(`no transcript found for session ${sessionId}`);
    return 1;
  }
  const raw = readEntries(transcriptPath);
  const since = options.since;
  const kept = raw.filter(
    (entry) =>
      isHumanPrompt(entry) &&
      (!since || new Date(entry.timestamp ?? "").getTime() >= new Date(since).getTime()),
  );
  const droppedEntries = raw.filter((entry) => !kept.includes(entry));

  if (raw.length > 0 && kept.length === 0) {
    reportDropped(droppedEntries, since, "dropped");
    return 1;
  }

  const header = [
    `# Session ${sessionId}`,
    "",
    "Every prompt sent in this session; may include work beyond this PR.",
    "",
  ];
  const blocks = kept.map((entry, i) => promptBlock(i + 1, entry));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${[...header, ...blocks].join("\n")}\n`);

  out(JSON.stringify({ path: outPath, prompts: kept.length, dropped: droppedEntries.length }));
  if (droppedEntries.length > 0) reportDropped(droppedEntries, since, "dropped");
  return 0;
}

if (isMainModule(import.meta.url)) {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positional;
  if (command === "render") {
    process.exit(renderCommand(rest, options));
  } else {
    err(USAGE);
    process.exit(2);
  }
}
