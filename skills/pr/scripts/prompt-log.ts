#!/usr/bin/env node
/// <reference types="node" />
// Usage: prompt-log.ts render <sessionId> --out <file> [--since <iso>]
//        prompt-log.ts check <file>
//
// render reads a session's transcript, keeps the prompts a human sent, and writes them as
// Markdown to --out with an empty `Outcome:` line after each one.
//
// check reads a prompt-log Markdown file (render's own output, or one a human has since edited)
// and verifies each `Outcome:` line starts with a word from OUTCOME_WORDS and that the file
// carries at least one prompt block. It never checks whether the recorded word is accurate.
//
// stdout: render -> JSON { path, prompts, dropped }; check -> JSON { errors, warnings, checks }
// exit: 0 on success, 1 on a render with no human prompt (or an ambiguous session id) or a
//   check that carries an error, 2 on a usage error
//
// TypeScript CLI for issue #727 U-001 (render) and U-002 (check; render's session-id ambiguity
// check). Contract: skills/transcribe/scripts/cli.ts's subcommand structure and usage-header
// shape; skills/issue/scripts/validate-issue-body.ts's stdout-JSON / exit-code contract. A
// human prompt is an entry whose `type` is "user", whose `message.content` is a string, and
// whose `origin.kind` is "human"; `promptSource` is never read. A
// `<pasted_content ...>...</pasted_content>` body collapses to a one-line marker carrying its
// character count, and a `<system-reminder>...</system-reminder>` block is dropped entirely.
//
// A session id that resolves to a `<sessionId>.jsonl` under more than one immediate child of
// `projects/` is ambiguous: render refuses it rather than guessing, naming every candidate path.

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

const USAGE =
  "Usage: prompt-log.ts render <sessionId> --out <file> [--since <iso>]\n" +
  "       prompt-log.ts check <file>";

// The vocabulary an `Outcome:` line has to start with (issue #727 U-002). check never checks
// whether the recorded word is accurate, only that the line opens with one of these.
export const OUTCOME_WORDS = ["adopted", "abandoned", "unrelated"] as const;

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

/** check's own report shape, matching skills/issue/scripts/validate-issue-body.ts's contract:
 * an errors array that decides the exit code, plus warnings and checks for the same call. */
export interface ValidationResults {
  errors: string[];
  warnings: string[];
  checks: string[];
}

/** A raw transcript line, read as loosely as the fields render touches. */
export interface TranscriptEntry {
  type?: string;
  isMeta?: boolean;
  timestamp?: string;
  origin?: { kind?: string };
  message?: { role?: string; content?: unknown };
}

/** Every `<sessionId>.jsonl` found as an immediate child of one of `home`'s
 * `.claude/projects/<dir>/` directories -- never a file nested deeper than that. Zero entries
 * means no transcript; two or more means the session id is ambiguous across project
 * directories, and the caller (renderCommand) decides how to report each case. */
export function resolveTranscript(home: string, sessionId: string): string[] {
  const projectsDir = join(home, ".claude", "projects");
  if (!existsSync(projectsDir)) return [];
  const candidates: string[] = [];
  for (const name of readdirSync(projectsDir)) {
    const projectDir = join(projectsDir, name);
    if (!statSync(projectDir).isDirectory()) continue;
    const candidate = join(projectDir, `${sessionId}.jsonl`);
    if (existsSync(candidate) && statSync(candidate).isFile()) candidates.push(candidate);
  }
  return candidates;
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
  const candidates = resolveTranscript(homedir(), sessionId);
  if (candidates.length === 0) {
    err(`no transcript found for session ${sessionId}`);
    return 1;
  }
  if (candidates.length > 1) {
    err(`ambiguous session ${sessionId}: found under ${candidates.length} project directories:`);
    for (const candidate of candidates) err(candidate);
    return 1;
  }
  const [transcriptPath] = candidates;
  const raw = readEntries(transcriptPath);
  const since = options.since;
  const keepsEntry = (entry: TranscriptEntry): boolean =>
    isHumanPrompt(entry) &&
    (!since || new Date(entry.timestamp ?? "").getTime() >= new Date(since).getTime());
  // Partitioned in one pass rather than two `raw.filter` calls plus `kept.includes(entry)`: the
  // latter re-scans `kept` for every raw entry, squaring the cost on a large transcript.
  const kept: TranscriptEntry[] = [];
  const droppedEntries: TranscriptEntry[] = [];
  for (const entry of raw) (keepsEntry(entry) ? kept : droppedEntries).push(entry);

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

/** A `### N. ...` heading, the same shape promptBlock itself writes to open one prompt block. */
const BLOCK_HEADING = /^### (\d+)\./gm;

/** An `Outcome:` line's own text (everything after the label, trimmed), read from inside one
 * block's own span -- never global, so re-running `.exec` against a new block's text always
 * starts at that text's own beginning rather than carrying `lastIndex` over from the block
 * before it. */
const OUTCOME_LINE = /^Outcome:[ \t]*(.*)$/m;

/** Each `### N.` block in `text`, paired with its own span through the next heading or EOF --
 * the span that holds exactly its one `Outcome:` line. */
function promptBlocks(text: string): Array<{ index: string; body: string }> {
  const headings = [...text.matchAll(BLOCK_HEADING)];
  return headings.map((heading, position) => {
    const start = heading.index ?? 0;
    const end =
      position + 1 < headings.length ? (headings[position + 1].index ?? text.length) : text.length;
    return { index: heading[1], body: text.slice(start, end) };
  });
}

/** Whether `text` opens with one of OUTCOME_WORDS as a whole word, not merely as a prefix of a
 * longer word. Accuracy of the word chosen is never checked (contract). */
function startsWithOutcomeWord(text: string): boolean {
  return OUTCOME_WORDS.some((word) => new RegExp(`^${word}\\b`).test(text));
}

/** check's own report, in validate-issue-body.ts's { errors, warnings, checks } shape: at least
 * one prompt block is required, and each block's `Outcome:` line has to open with a word from
 * OUTCOME_WORDS. A block carrying no `Outcome:` line at all is treated the same as an empty
 * one. */
export function checkPromptLog(text: string): ValidationResults {
  const results: ValidationResults = { errors: [], warnings: [], checks: [] };
  const blocks = promptBlocks(text);
  if (blocks.length === 0) {
    results.errors.push("no_prompt_block: the file carries no `### N.` prompt block");
    return results;
  }
  for (const block of blocks) {
    const match = OUTCOME_LINE.exec(block.body);
    const outcomeText = match ? match[1].trim() : "";
    if (startsWithOutcomeWord(outcomeText)) {
      results.checks.push(`outcome_word:${block.index}=ok`);
    } else {
      const found = outcomeText === "" ? "empty" : `"${outcomeText}"`;
      results.errors.push(
        `outcome_word:${block.index} does not start with ${OUTCOME_WORDS.join("/")} (${found})`,
      );
    }
  }
  return results;
}

function checkCommand(positional: string[]): number {
  const [filePath] = positional;
  if (!filePath) {
    err(USAGE);
    return 2;
  }
  const results = checkPromptLog(readFileSync(filePath, "utf8"));
  out(JSON.stringify(results));
  return results.errors.length > 0 ? 1 : 0;
}

if (isMainModule(import.meta.url)) {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positional;
  if (command === "render") {
    process.exit(renderCommand(rest, options));
  } else if (command === "check") {
    process.exit(checkCommand(rest));
  } else {
    err(USAGE);
    process.exit(2);
  }
}
