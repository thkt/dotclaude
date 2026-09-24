#!/usr/bin/env node
/// <reference types="node" />
// Usage: prompt-log.ts render <sessionId> --out <file> [--since <iso>]
//
// render はセッションの transcript を読み、人間が送ったプロンプトだけを残し、プロンプトごとに
// 空の `Outcome:` 行を添えた Markdown として --out に書く。
//
// stdout: JSON { path, prompts, dropped }
// exit: 成功時 0、空でない transcript に人間のプロンプトが 1 件も無いとき 1、usage エラー時 2
//
// issue #727 U-001 の TypeScript CLI。契約: skills/transcribe/scripts/cli.ts の subcommand 構成
// と usage header の形、skills/issue/scripts/validate-issue-body.ts の stdout JSON / exit code
// 契約。人間のプロンプトは `type` が "user"、`message.content` が文字列、`origin.kind` が
// "human" の entry を指し、`promptSource` は読まない。`<pasted_content ...>...</pasted_content>`
// の本文は文字数付きの一行マーカーへ畳み、`<system-reminder>...</system-reminder>` ブロックは
// 丸ごと落とす。
//
// 複数の project ディレクトリにまたがる session id の曖昧性判定 (issue #727 U-002) はここでは
// 扱わず、resolveTranscript は最初に見つかった一致を返す。

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

/** transcript の生の 1 行。render が触れるフィールドだけを緩く読む。 */
export interface TranscriptEntry {
  type?: string;
  isMeta?: boolean;
  timestamp?: string;
  origin?: { kind?: string };
  message?: { role?: string; content?: unknown };
}

/** セッションの transcript ファイル。`home` の `.claude/projects/<dir>/` 直下だけを候補にして
 * 探す。scaffold のみ: 最初に見つかった一致を返し、2 つの project ディレクトリに同じ
 * session id がまたがる曖昧性は拒否しない -- issue #727 U-002 がその検査を足す (T-526, T-527)。 */
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

/** `path` の各行を JSON として読む。パースできない行はプロンプトとして扱わずスキップする。 */
export function readEntries(path: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      entries.push(JSON.parse(line) as TranscriptEntry);
    } catch {
      // パースできない行はプロンプトとして扱わずスキップする。
    }
  }
  return entries;
}

/** 人間のプロンプト: `type` が "user"、`message.content` が文字列、`origin.kind` が "human"。
 * `promptSource` は読まない (契約)。この条件だけで tool-result entry (content が配列)、
 * isMeta entry (origin.kind が "human" にならない)、task-notification entry (origin.kind が
 * "task-notification")、assistant entry (type が "user" でない) も併せて除外される。 */
export function isHumanPrompt(entry: TranscriptEntry): boolean {
  return (
    entry.type === "user" &&
    typeof entry.message?.content === "string" &&
    entry.origin?.kind === "human"
  );
}

const PASTED_CONTENT = /<pasted_content[^>]*>([\s\S]*?)<\/pasted_content>/g;
const SYSTEM_REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;

/** `text` から `<system-reminder>...</system-reminder>` ブロックを丸ごと落とし、
 * `<pasted_content ...>...</pasted_content>` の本文を文字数付きの一行マーカーへ畳んだもの。
 * system-reminder を先に除去してから pasted_content を畳むので、pasted_content の本文が
 * たまたま system-reminder を包んでいても、タグごと消える。 */
export function collapsePromptText(text: string): string {
  return text
    .replace(SYSTEM_REMINDER, "")
    .replace(PASTED_CONTENT, (_match, body: string) => `[pasted_content: ${body.length} chars]`);
}

/** 1 件のプロンプトの Markdown ブロック: 番号付き見出し、collapsePromptText で畳んだプロンプト
 * 本文をフェンスで囲んだもの、そして PR 本文を書くエージェントが後で埋める空の `Outcome:` 行。 */
function promptBlock(index: number, entry: TranscriptEntry): string {
  const text = typeof entry.message?.content === "string" ? entry.message.content : "";
  const collapsed = collapsePromptText(text);
  return `### ${index}. ${entry.timestamp ?? ""}\n\n\`\`\`\n${collapsed}\n\`\`\`\n\nOutcome:\n`;
}

/** stderr の集計向けに、生の entry が落ちた理由を返す: isHumanPrompt は通したが --since が
 * 切ったときは `beforeSince`、それ以外は isHumanPrompt 自身が却下した理由。 */
function dropReason(entry: TranscriptEntry, beforeSince: boolean): string {
  if (beforeSince) return "before-since";
  if (entry.type !== "user") return "non-user";
  if (entry.isMeta) return "isMeta";
  if (typeof entry.message?.content !== "string") return "non-string-content";
  return `origin:${entry.origin?.kind ?? "none"}`;
}

/** `dropped` を dropReason で集計し件数を stderr へ書く。`prefix` は件数が乗る文の書き出しで、
 * 人間プロンプト 0 件時の exit 1 経路と、通常の部分ドロップ経路とで文面を分ける。 */
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
