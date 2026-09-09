#!/usr/bin/env node
/// <reference types="node" />
// Usage: verify_run.ts <worktree> <base>   (triage's Phase 3 report JSON on stdin)
//
// Phase 6 は push する前にこれを実行するので、triage が渡した数より少ないコミット数の run は
// PR に届かない。
//
// stdout: JSON { ok, mismatches: [{field, expected, actual}] }
// exit: ok のとき 0、そうでないとき 1、引数か stdin の report が欠けているとき 2
//
// skills/scribe/scripts/verify_run.py の TypeScript 移植。skills/scribe/scripts/triage.ts の
// header と isMainModule(import.meta.url) の entry point を写している。COMMIT_PREFIX /
// WIKI_DIR / WAITING / REJECTED / run_commits / section_rows / _store_at / rejected_added /
// verify / main を node:* だけで運ぶ。
//
// Contract: skills/scribe/scripts/verify_run.py 自身の挙動。
// skills/scribe/tests/verify-run.test.ts が検証する。
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// どの分岐点も既にこの prefix を付けた scribe コミットを持つので、prefix だけでは 1 回の run を
// その手前の履歴と区別できない。
export const COMMIT_PREFIX = "docs(wiki):";

export const WIKI_DIR = "docs/wiki";

export const WAITING = "## 昇格待ち";
export const REJECTED = "## 棄却";
// triage 行自身の `section` フィールドが持つ素のラベル。見出しにマッチさせる "## " を持つ上の
// WAITING/REJECTED とは違う。
const WAITING_SECTION = WAITING.slice("## ".length);

const USAGE = "usage: verify_run.ts <worktree> <base>   (triage's Phase 3 report JSON on stdin)";

export interface Mismatch {
  field: string;
  expected: number;
  actual: number;
}

export interface Report {
  ok: boolean;
  mismatches: Mismatch[];
}

// triage.ts の Triaged 行のうち、このモジュールが読む部分だけを切り出したもの。`section` は
// triage.ts 自身の Row と同じく、今回の run で新規に抽出された行では欠けている。
export interface TriageRow {
  name?: string;
  section?: string;
}

// triage.ts の Report のうち、このモジュールが読む部分だけを切り出したもの。
export interface TriageReport {
  commits: TriageRow[][];
  deferred: TriageRow[];
}

function git(repo: string, ...args: string[]): string {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

export function runCommits(repo: string, base: string): string[] {
  const out = git(repo, "log", "--reverse", "--format=%H\x1f%s", `${base}..HEAD`);
  const hashes: string[] = [];
  for (const line of out.split("\n")) {
    if (!line) continue;
    const sep = line.indexOf("\x1f");
    const subject = line.slice(sep + 1);
    if (subject.startsWith(COMMIT_PREFIX)) {
      hashes.push(line.slice(0, sep));
    }
  }
  return hashes;
}

export function sectionRows(text: string, heading: string): number {
  let inside = false;
  let count = 0;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      inside = line.startsWith(heading);
      continue;
    }
    if (inside && line.startsWith("- ")) {
      count += 1;
    }
  }
  return count;
}

function store(repo: string): string {
  try {
    return readFileSync(`${repo}/${WIKI_DIR}/_candidates.md`, "utf8");
  } catch {
    return "";
  }
}

// `git show` の exit status ではない: 不在と読めなかった場合が同じ扱いになってしまい、読めなかった
// rev が 0 行として通り、誰も読んでいない store から verdict が出てしまう。`ls-tree` は不在の path
// では何も出力せず、解決できない rev では失敗する。
export function storeAt(repo: string, rev: string): string {
  if (!git(repo, "ls-tree", "--name-only", rev, `${WIKI_DIR}/_candidates.md`).trim()) {
    return "";
  }
  return git(repo, "show", `${rev}:${WIKI_DIR}/_candidates.md`);
}

// Phase 4 はページを作らずに棄却された行を `棄却` へ動かすので、ページ無しで `昇格待ち` を離れる
// 行がありうる。
export function rejectedAdded(repo: string, base: string): number {
  return sectionRows(store(repo), REJECTED) - sectionRows(storeAt(repo, base), REJECTED);
}

function buildReport(
  expectedCommits: number,
  actualCommits: number,
  expectedRemaining: number,
  actualRemaining: number,
): Report {
  const mismatches: Mismatch[] = [];
  if (actualCommits !== expectedCommits) {
    mismatches.push({ field: "commits", expected: expectedCommits, actual: actualCommits });
  }
  if (actualRemaining !== expectedRemaining) {
    mismatches.push({ field: "remaining", expected: expectedRemaining, actual: actualRemaining });
  }
  return { ok: mismatches.length === 0, mismatches };
}

// `startCount` と `expectedCommits` は呼び出し側自身の数え上げから来ない: 数え間違えた、あるいは
// 古い値を読んだ呼び出し側がどちらかを誤って渡しても、この関数には捕まえる手段が無くなるからだ。
// `startCount` は `storeAt(repo, base)` から、`expectedCommits` は `report.commits.length` から
// 来る。どちらもこのモジュール自身か triage が既に持っている記録から読む。
export function verify(repo: string, report: TriageReport, base: string): Report {
  const expectedCommits = report.commits.length;
  const actualCommits = runCommits(repo, base).length;

  const startCount = sectionRows(storeAt(repo, base), WAITING);
  // `昇格待ち` からコミットされた行はその候補行を消す。`単発` など他のセクションから、あるいは
  // 今回の run で新規に抽出された行 (section 無し) からコミットされた行は、そもそも `昇格待ち`
  // に行を持っていなかった。
  let cleared = 0;
  for (const commit of report.commits) {
    for (const row of commit) {
      if (row.section === WAITING_SECTION) cleared += 1;
    }
  }
  // commit cap が `deferred` に残した行はまだ昇格に値するので、store は次の run を待つために
  // それを `昇格待ち` の下に持つ。他所 (`単発`、あるいは新規) から来た行だけがそのセクションへの
  // 新規流入で、既にそこにあった行は startCount で一度だけ数えられている。
  const inflow = report.deferred.filter((row) => row.section !== WAITING_SECTION).length;
  const expectedRemaining = startCount - cleared + inflow - rejectedAdded(repo, base);
  const actualRemaining = sectionRows(store(repo), WAITING);

  return buildReport(expectedCommits, actualCommits, expectedRemaining, actualRemaining);
}

export function main(argv: readonly string[]): number {
  if (argv.length !== 2) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const [repo, base] = argv;
  // 位置引数の数値ではない: 数え間違えた、あるいは古い値を読んだ呼び出し側が誤った数を渡しても、
  // このスクリプトには捕まえる手段が無くなるからだ。両方の数は triage 自身の report から来る。
  let loaded: unknown;
  try {
    loaded = JSON.parse(readFileSync(0, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${USAGE}\n${message}\n`);
    return 2;
  }
  if (
    typeof loaded !== "object" ||
    loaded === null ||
    !Array.isArray((loaded as { commits?: unknown }).commits) ||
    !Array.isArray((loaded as { deferred?: unknown }).deferred)
  ) {
    process.stderr.write(`${USAGE}\nstdin carries no triage report with commits and deferred\n`);
    return 2;
  }
  const report = verify(repo, loaded as TriageReport, base);
  process.stdout.write(`${JSON.stringify(report)}\n`);
  return report.ok ? 0 : 1;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
