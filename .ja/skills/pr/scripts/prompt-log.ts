#!/usr/bin/env node
/// <reference types="node" />
// Usage: prompt-log.ts render <sessionId> --out <file> [--since <iso>]
//        prompt-log.ts check <file>
//
// render はセッションの transcript を読み、人間が送ったプロンプトだけを残し、プロンプトごとに
// 空の `Outcome:` 行を添えた Markdown として --out に書く。--since を付けると、<iso> 以降の
// プロンプトと、その直前の 1 件 (branch を始めたプロンプト) を残す。
//
// check は prompt-log の Markdown ファイル (render 自身の出力、または人間が編集した後のもの) を
// 読み、各 `Outcome:` 行が OUTCOME_WORDS の語で始まることと、ファイルに prompt block が 1 つ以上
// あることを検査する。記録された語が正確かどうかは検査しない。
//
// stdout: render -> JSON { path, prompts, dropped }; check -> JSON { errors, warnings, checks }
// exit: 成功時 0、人間のプロンプトが 1 件も無い render (または session id が曖昧な render)、
//   またはエラーを持つ check のとき 1、usage エラー時 2
//
// issue #727 U-001 (render) と U-002 (check、および render の session id 曖昧性判定) の
// TypeScript CLI。契約: skills/transcribe/scripts/cli.ts の subcommand 構成と usage header の
// 形、skills/issue/scripts/validate-issue-body.ts の stdout JSON / exit code 契約。人間の
// プロンプトは `type` が "user"、`message.content` が文字列、`origin.kind` が "human" の entry
// を指し、`promptSource` は読まない。`<pasted_content ...>...</pasted_content>` の本文は文字数
// 付きの一行マーカーへ畳み、`<system-reminder>...</system-reminder>` ブロックは丸ごと落とす。
//
// `projects/` の直下ディレクトリを 2 つ以上にまたがって `<sessionId>.jsonl` が見つかる
// session id は曖昧: render は推測せず拒否し、候補パスを全て名指しする。

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

// `Outcome:` 行が先頭で名乗らなければならない語彙 (issue #727 U-002)。check は記録された語が
// 正確かどうかは検査せず、その行がこのいずれかで始まっているかだけを見る。
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

/** check 自身の report の形。skills/issue/scripts/validate-issue-body.ts の契約と揃え、
 * errors 配列が exit code を決め、warnings と checks は同じ呼び出しに乗る。 */
export interface ValidationResults {
  errors: string[];
  warnings: string[];
  checks: string[];
}

/** transcript の生の 1 行。render が触れるフィールドだけを緩く読む。 */
export interface TranscriptEntry {
  type?: string;
  isMeta?: boolean;
  timestamp?: string;
  origin?: { kind?: string };
  message?: { role?: string; content?: unknown };
}

/** `home` の `.claude/projects/<dir>/` 直下ディレクトリの、さらに直下だけを候補にして見つかる
 * `<sessionId>.jsonl` の全て -- それより深く入れ子になったファイルは決して候補にしない。0 件は
 * transcript 無し、2 件以上は project ディレクトリをまたいで session id が曖昧という意味で、
 * どちらの場合をどう報告するかは呼び出し側 (renderCommand) が決める。 */
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
  const isBeforeSince = (entry: TranscriptEntry): boolean =>
    Boolean(since) && new Date(entry.timestamp ?? "").getTime() < new Date(since).getTime();
  // branch はその作業を頼んだプロンプトを受けてから切るので、そのプロンプトは必ず --since より
  // 前にある。範囲の直前にある最後の人間のプロンプトを、branch の起点として残す。
  const beforeBound = raw.filter((entry) => isHumanPrompt(entry) && isBeforeSince(entry));
  const origin = beforeBound[beforeBound.length - 1];
  const keepsEntry = (entry: TranscriptEntry): boolean =>
    isHumanPrompt(entry) && (!isBeforeSince(entry) || entry === origin);
  // `raw.filter` を 2 回と `kept.includes(entry)` を組む代わりに 1 パスで振り分ける -- 後者は raw
  // の各 entry ごとに kept を再走査し、大きな transcript ではコストが二乗になる。
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

/** promptBlock 自身が 1 件のプロンプト block を開くのに書く `### N. ...` 見出しと同じ形。 */
const BLOCK_HEADING = /^### (\d+)\./gm;

/** `Outcome:` 行自身のテキスト (ラベルの後ろ、trim 済み) を、1 つの block 自身の範囲内から
 * 読む -- global にはしない。ある block のテキストに対して `.exec` を実行し直すたびに、直前の
 * block から `lastIndex` を引き継がず、そのテキスト自身の先頭から必ず始めるため。 */
const OUTCOME_LINE = /^Outcome:[ \t]*(.*)$/m;

/** `text` 内の各 `### N.` block を、見出し番号と、次の見出しまたは EOF までの自分自身の範囲と
 * 対にしたもの -- ちょうどその 1 つの `Outcome:` 行を持つ範囲。 */
function promptBlocks(text: string): Array<{ index: string; body: string }> {
  const headings = [...text.matchAll(BLOCK_HEADING)];
  return headings.map((heading, position) => {
    const start = heading.index ?? 0;
    const end =
      position + 1 < headings.length ? (headings[position + 1].index ?? text.length) : text.length;
    return { index: heading[1], body: text.slice(start, end) };
  });
}

/** `text` が OUTCOME_WORDS のいずれかで、単なる長い語の接頭辞としてでなく単語として始まって
 * いるかどうか。選ばれた語が正確かどうかは検査しない (契約)。 */
function startsWithOutcomeWord(text: string): boolean {
  return OUTCOME_WORDS.some((word) => new RegExp(`^${word}\\b`).test(text));
}

/** check 自身の report。validate-issue-body.ts の { errors, warnings, checks } の形に従う:
 * prompt block が 1 つ以上あることを必須とし、各 block の `Outcome:` 行が OUTCOME_WORDS の
 * いずれかの語で始まっていることを検査する。`Outcome:` 行自体が無い block は、空の行と同じ
 * 扱いにする。 */
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
