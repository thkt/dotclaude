#!/usr/bin/env node
/// <reference types="node" />
// Usage: usage_counts.ts <transcripts-root>
//
// skills/ablate/scripts/usage_counts.py を TypeScript へ移植したもの: FIRE_EVENTS、
// ELEMENT_SUFFIXES、RARE_BY_DESIGN、MEASUREMENT_WINDOW_DAYS、element_path、_parse_date、
// _iter_fires、count_usage、classify、main。定数名と関数名は usage_counts.py が宣言した
// とおりに保つ。arms.ts、verdict.ts、dr_gate.ts、enforcer_map.ts がこの同じディレクトリで
// 保つのと同じ no-camelCase の規約。
//
// usage_counts.py は UNMEASURED を arms.py から、DELETE_CANDIDATE/NEEDS_HUMAN_JUDGMENT を
// verdict.py から import する。この移植も同じ import を持つ -- verdict.ts が UNMEASURED に
// 対して既に行っているのと同じ再利用。
//
// usage_counts.py からの逸脱点: classify の docstring (usage_counts.py:169) は「module
// namespace から RARE_BY_DESIGN と MEASUREMENT_WINDOW_DAYS を読む。キャプチャした default
// 値としてではないため、どちらかを実行時に patch すると返る判定も変わる」と書く --
// unittest.mock.patch.object が module-level の名前を re-bind する形。ESM の import
// binding は test file の外側から同じ形で re-bind できない (map_all/target_files の
// enforcer_map.ts も同じ壁に当たった)。そのためこの移植は代わりに MEASUREMENT_WINDOW_DAYS
// を classify 自身の `window_days` 引数として持つ (module 定数を default 値にする):
// 呼び出し側は binding を patch するのではなく別の値を渡すことで、boundary の両側を
// 動かす。RARE_BY_DESIGN は module-level の export のまま、直接読む形を変えない。
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";
import { pythonJsonStringify } from "../../_lib/python_json.ts";
import { UNMEASURED } from "./arms.ts";
import { DELETE_CANDIDATE, NEEDS_HUMAN_JUDGMENT } from "./verdict.ts";

// plan の contract は "hookSpecificOutput" record にも言及する。このセッションで採取した
// どの attachment もそのキーを持たなかったため、読み取りは推測せず後回しにする。
export const FIRE_EVENTS: ReadonlySet<string> = new Set(["PreToolUse", "PostToolUse"]);

// `command` は harness がそれを起動した lead-in を伴う: .claude directory を通る path か、
// 未展開の plugin variable で始まる path。harness element は repo-root-relative な名前を
// 持つため、その lead-in を落とさなければ RARE_BY_DESIGN にも harness_elements の population
// にも1つの key として一致しない。
const _CLAUDE_DIR_MARKER = "/.claude/";
const _VARIABLE_PREFIX_RE = /^\$\{[A-Z_]+\}\//;

// element として数える拡張子。一部の fire は path ではなく label を持つ (measured in this
// session's transcripts: "formatter", "gates changed", "guardrails...")。label は harness
// element を1つも指さないため、tally の外側に置く。
export const ELEMENT_SUFFIXES: ReadonlySet<string> = new Set([".py", ".sh", ".js"]);

// 珍しい入力でしか発動しない safety net。fire が 0 件であることが未使用を意味しない。
export const RARE_BY_DESIGN: ReadonlySet<string> = new Set(["hooks/security/rm_to_trash.py"]);

// `now` から遡って何日以内なら、最新の fire がまだ observed と数えられるか。
export const MEASUREMENT_WINDOW_DAYS = 90;

export interface ElementUsage {
  fires: number;
  // 最新 fire の ISO date (YYYY-MM-DD)、一度も fire していない要素は null。
  last_used: string | null;
}

export interface UsageResult {
  elements: Record<string, ElementUsage>;
  transcript_count: number;
  date_range: { start: string | null; end: string | null };
}

/** 最後の "/" 区切り segment の suffix を、PurePosixPath(text).suffix と同じ形で読む:
 * dot が segment の内側に厳密に収まる場合のみ末尾の ".ext" を返し、それ以外は ""
 * (".hidden" のような先頭 dot も suffix を持たない)。 */
function _posix_suffix(text: string): string {
  const name = text.slice(text.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot) : "";
}

/** `command` が fire した要素の repo-root-relative path、要素を指さない場合は null。
 * 絶対 path や、未展開の variable で始まる path は repo-root-relative な形を持たないため、
 * それも null を返す。 */
export function element_path(command: string): string | null {
  const trimmed = command.trim();
  const cut = trimmed.indexOf(_CLAUDE_DIR_MARKER);
  const text =
    cut !== -1
      ? trimmed.slice(cut + _CLAUDE_DIR_MARKER.length)
      : trimmed.replace(_VARIABLE_PREFIX_RE, "");
  if (!text || "~$/".includes(text[0])) {
    return null;
  }
  if (!ELEMENT_SUFFIXES.has(_posix_suffix(text))) {
    return null;
  }
  return text;
}

/** transcript timestamp ("2026-08-01T00:00:00.000Z") が指す calendar date (YYYY-MM-DD)、
 * 値が有効な ISO date で始まらない場合は null (1件の壊れた record が読み取り全体を止めて
 * はならない -- usage_counts.py の report.py 由来の per-line tolerance と同じ)。 */
function _parse_date(timestamp: string): string | null {
  const candidate = timestamp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return null;
  }
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  // 範囲外の calendar date (例: "2026-02-30") は Date 自身の正規化で繰り上がるだけで throw
  // しないため、再度 format して比較することで検出する -- Python の strptime が
  // ValueError を投げて弾くのと同じ形。
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? null
    : candidate;
}

/** 1つの transcript file 内の PreToolUse/PostToolUse fire record ごとに
 * [element_path, fire_date] を yield する。壊れた、または不完全な record は例外を投げず
 * 何も寄与しない: 別の process がこの transcript を書き込み中に読むこともあるため、
 * 末尾行が途中で切れているのは想定内である。 */
function _iter_fires(path: string): Iterable<[string, string]> {
  const fires: [string, string][] = [];
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record === null || typeof record !== "object" || Array.isArray(record)) continue;
    const attachment = (record as Record<string, unknown>).attachment;
    if (attachment === null || typeof attachment !== "object" || Array.isArray(attachment)) {
      continue;
    }
    const attachmentFields = attachment as Record<string, unknown>;
    if (!FIRE_EVENTS.has(attachmentFields.hookEvent as string)) continue;
    const command = attachmentFields.command;
    const timestamp = (record as Record<string, unknown>).timestamp;
    if (typeof command !== "string" || typeof timestamp !== "string") continue;
    const element = element_path(command);
    if (element === null) continue;
    const fireDate = _parse_date(timestamp);
    if (fireDate === null) continue;
    fires.push([element, fireDate]);
  }
  return fires;
}

/** `root` 配下の `*.jsonl` transcript をすべて scan し、要素ごとに fire を tally する。
 * 要素の key は element_path が返す repo-root-relative path。 */
export function count_usage(root: string): UsageResult {
  const transcripts = globSync("**/*.jsonl", { cwd: root }).sort();
  const elements: Record<string, ElementUsage> = {};
  let start: string | null = null;
  let end: string | null = null;

  for (const relative of transcripts) {
    let fires: Iterable<[string, string]>;
    try {
      fires = _iter_fires(join(root, relative));
    } catch {
      // 1つの読み取れない transcript が、残り全体の count を止めてはならない。
      continue;
    }
    for (const [element, fireDate] of fires) {
      const entry = (elements[element] ??= { fires: 0, last_used: null });
      entry.fires += 1;
      if (entry.last_used === null || fireDate > entry.last_used) {
        entry.last_used = fireDate;
      }
      if (start === null || fireDate < start) start = fireDate;
      if (end === null || fireDate > end) end = fireDate;
    }
  }

  return {
    elements,
    transcript_count: transcripts.length,
    date_range: { start, end },
  };
}

// 上から下へ読み、最初に一致した行を採用する。この順序は二重に load-bearing である:
// RARE_BY_DESIGN が zero-fires の行より上にあるため、rare な element が
// DELETE_CANDIDATE に届くことはない。また last_used の check が `fires > 0` の下にあるのは、
// fires が 0 のときは常に last_used=null と対になり、それより上の行だと UNMEASURED に
// 呑み込まれて DELETE_CANDIDATE に届かなくなるためである。
//
// | Condition | Verdict |
// | --- | --- |
// | path is in RARE_BY_DESIGN | NEEDS_HUMAN_JUDGMENT |
// | fires > 0 and last_used is null (inconsistent input) | UNMEASURED |
// | fires > 0 and last_used falls outside window_days | UNMEASURED |
// | fires > 0 and last_used falls inside window_days | NEEDS_HUMAN_JUDGMENT |
// | fires == 0 | DELETE_CANDIDATE |
/** 上の表に従い、1つの要素の usage observation を verdict へ割り当てる。`window_days` は
 * usage_counts.py が module namespace から読んでいた MEASUREMENT_WINDOW_DAYS を置き換える
 * -- 上のヘッダの逸脱点を参照。 */
export function classify(
  path: string,
  fires: number,
  last_used: string | null,
  now: Date,
  window_days: number = MEASUREMENT_WINDOW_DAYS,
): string {
  if (RARE_BY_DESIGN.has(path)) {
    return NEEDS_HUMAN_JUDGMENT;
  }
  if (fires > 0) {
    if (last_used === null) {
      return UNMEASURED;
    }
    const lastUsedMs = Date.parse(`${last_used}T00:00:00.000Z`);
    const days = Math.round((now.getTime() - lastUsedMs) / (24 * 60 * 60 * 1000));
    if (days > window_days) {
      return UNMEASURED;
    }
    return NEEDS_HUMAN_JUDGMENT;
  }
  return DELETE_CANDIDATE;
}

// wire format は JSON.stringify の既定ではなく json.dumps のバイト単位の区切り方に合わせる
// 必要がある -- 理由と、この系統の CLI がそれぞれの波かっこを手書きする代わりに共有する
// エンコーダについては python_json.ts のヘッダを参照。
export function main(argv: string[]): number {
  if (argv.length !== 1) {
    process.stderr.write("usage: usage_counts.ts <transcripts-root>\n");
    return 2;
  }
  process.stdout.write(`${pythonJsonStringify(count_usage(argv[0]))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
