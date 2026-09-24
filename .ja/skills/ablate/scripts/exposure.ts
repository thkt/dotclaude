/// <reference types="node" />
// 1つの skill-reference arm の run を、その stream-json transcript から判定する: その run が
// fixture 自身が持つ対象 reference を Read したか(exposed)、fixture の外にあるパス --
// 本物の skill ディレクトリか、`root` 配下のそれ以外のリポジトリ絶対パス -- に触れたか
// (contaminated)。汚染された run は wiped を wiped+1 に変えてしまう。reviewer agent が
// fixture の縮小されたツリーだけを見ているとは言えなくなるため、#743 の Proposed solution
// step 2 はそれをスコアせず、数える run から外す。
//
// この判定が防ぐリスクは reviewer agent 自身の本文が持っている: ${CLAUDE_PLUGIN_ROOT} で
// 始まるパスが展開されないまま残ったとき(fixture はプラグイン harness をフルには通らない)、
// agents/reviewers/reviewer-readability.md は agent に「同じパスを ~/.claude/ の下で読め」と
// 指示する -- fixture の外にある本物の絶対パスである。同じ agent は Bash(ugrep:*) と
// Bash(bfs:*) も持つため、汚染された run は Read だけとは限らない。
//
// transcript は `--print --output-format stream-json` が書く改行区切りの JSON: 各行が1つの
// イベントオブジェクトで、assistant イベントの message.content 配列は Messages API が返すのと
// 同じ形の tool_use ブロックを持つ(https://code.claude.com/docs/en/headless#stream-responses
// で確認済み)。
//
// 定数名と関数名は snake_case のまま保つ。同じディレクトリの arms.ts、verdict.ts、
// reference_arm.ts が持つ規約と同じ形。

import { homedir } from "node:os";
import { join } from "node:path";
import { fixture_relpath } from "./reference_arm.ts";

export interface ExposureResult {
  exposed: boolean;
  contaminated: boolean;
}

/** assistant メッセージが持つ1つの tool_use content ブロック。stream-json transcript が
 * tool call を保持する形そのもの(docs.claude.com/en/docs/claude-code/headless#stream-responses:
 * assistant イベントの message.content 配列は Messages API 形の block を持つ)。この
 * モジュールが読む field だけを宣言する。 */
interface ToolUseBlock {
  type: "tool_use";
  name: string;
  input: unknown;
}

/** stream-json transcript の assistant イベント全体が持つ tool_use content ブロックすべて。
 * 正しい JSON でない行や、tool_use ブロックを持たない assistant イベントでない行は何も
 * 寄与しない -- transcript の system/result イベントはまったく別の形を取る。 */
function tool_use_blocks(transcript: string): ToolUseBlock[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap(assistant_content)
    .filter(is_tool_use);
}

/** transcript の1行が assistant イベントなら、その content 配列。有効な JSON でない行や、
 * content 配列を持つ assistant イベントでない行は空になる。 */
function assistant_content(line: string): unknown[] {
  let event: unknown;
  try {
    event = JSON.parse(line);
  } catch {
    return [];
  }
  const record = event as { type?: unknown; message?: { content?: unknown } } | null;
  if (record?.type !== "assistant") {
    return [];
  }
  const content = record.message?.content;
  return Array.isArray(content) ? content : [];
}

function is_tool_use(block: unknown): block is ToolUseBlock {
  return (
    typeof block === "object" &&
    block !== null &&
    (block as Record<string, unknown>).type === "tool_use"
  );
}

/** `input` が持つ文字列の葉をすべて、配列とプレーンオブジェクトを再帰しながら集める。
 * tool の input の形は tool ごとに違う(Read の file_path、Bash の command、Grep の path と
 * pattern、…)ため、固定の field 名1つではなくすべての文字列値を読む。 */
function string_leaves(input: unknown): string[] {
  if (typeof input === "string") {
    return [input];
  }
  if (Array.isArray(input)) {
    return input.flatMap(string_leaves);
  }
  if (typeof input === "object" && input !== null) {
    return Object.values(input).flatMap(string_leaves);
  }
  return [];
}

/** `value` が `base` 配下のパスを名指しているか、埋め込んでいるか(`value === base`、または
 * `base` の後ろにパス区切りが続く形がその中に現れる) -- Read の file_path のような tool
 * 引数そのものは等価比較で一致し、Bash command のような大きな文字列は command が名指す
 * `base/...` という部分文字列で一致する。 */
function names_path_under(value: string, base: string): boolean {
  return value === base || value.includes(`${base}/`);
}

/** tool の引数が `root` を書き表しうる形。絶対パスと、`root` が `home` 配下にあるときの
 * `~/...` と `$HOME/...` の形。reviewer agent 本文の代替文は `~/.claude/` を名指し、Bash
 * command はそのチルダを展開せずに運ぶ。 */
function root_spellings(root: string, home: string): string[] {
  if (!root.startsWith(`${home}/`)) {
    return [root];
  }
  const rest = root.slice(home.length);
  return [root, `~${rest}`, `$HOME${rest}`];
}

/** 1つの run の stream-json transcript を、`element` について組まれた fixture
 * (reference_arm.ts の build_reference_fixture)と照らして判定する: `exposed` はその run が
 * `cwd` にある fixture 自身の `element` を読んだかどうか。`contaminated` はいずれかの tool
 * call が `root` 配下の本物のパス -- 本物の skill ディレクトリか、それ以外のリポジトリ絶対
 * パス -- に、その fixture の外で触れたかどうか。 */
export function classify_exposure(
  transcript: string,
  element: string,
  cwd: string,
  root: string,
  home: string = homedir(),
): ExposureResult {
  const fixtureTarget = join(cwd, fixture_relpath(element));
  const spellings = root_spellings(root, home);
  const blocks = tool_use_blocks(transcript);

  let exposed = false;
  let contaminated = false;

  for (const block of blocks) {
    if (
      block.name === "Read" &&
      typeof block.input === "object" &&
      block.input !== null &&
      (block.input as Record<string, unknown>).file_path === fixtureTarget
    ) {
      exposed = true;
    }
    for (const value of string_leaves(block.input)) {
      if (spellings.some((spelling) => names_path_under(value, spelling))) {
        contaminated = true;
      }
    }
  }

  return { exposed, contaminated };
}
