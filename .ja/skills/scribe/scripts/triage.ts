#!/usr/bin/env node
/// <reference types="node" />
// Usage: triage.ts '<JSON array of patterns>' <candidates-file>
//
// 各要素は {name, evidence: [str], existing: "page"|"candidate"|"none"}。この配列は今回の run
// が抽出したものを運び、候補ストアは引数で渡されずここで読む。そうしないと蓄積された行が
// ランキングから漏れたまま run が終わる。
//
// stdout: JSON { pages, candidates, deferred, commits }
// exit: 0。引数が足りないときは 2
//
// skills/scribe/scripts/triage.py の TypeScript 移植。skills/scribe/scripts/find_wiki_rule.ts の
// header と isMainModule(import.meta.url) エントリポイントに倣う。EVIDENCE_THRESHOLD /
// PAGE_CAP / COMMIT_CAP / ACTION / STORE_SECTIONS / EVIDENCE / triage / readStore / merge /
// main を node:* のみで運ぶ。
//
// Contract: skills/scribe/scripts/triage.py 自身の挙動。fixture
// skills/scribe/tests/fixtures/triage-cases.json (U-001) に固定される。
// skills/scribe/tests/triage.test.ts が検証する。
import { existsSync, readFileSync, statSync } from "node:fs";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// この run が見たパターンが既に住んでいるかもしれない 3 か所。
export type Existing = "page" | "candidate" | "none";

// Python の Pattern TypedDict。呼び出し側の配列から来た新規要素は `section` を持たず、
// 蓄積ストアから read_store/readStore が組み立てた行にだけ付く。
export interface Pattern {
  name?: string;
  evidence?: string[];
  existing?: Existing;
  section?: string;
}

interface Row {
  name: string;
  count: number;
  evidence: string[];
  existing: string;
  section?: string;
}

export interface Triaged extends Row {
  action: string;
}

export interface Report {
  pages: Triaged[];
  candidates: Triaged[];
  deferred: Triaged[];
  commits: Triaged[][];
}

// 根拠が 2 件未満のパターンはページにならない。1 件だけでは再現性を示せず、ページ化する
// と一回限りの出来事を慣習に見せてしまう。
export const EVIDENCE_THRESHOLD = 2;

// 1 コミットが動かすページ数。候補への追記や参照修正は数えない。
export const PAGE_CAP = 3;

// 1 run が動かすコミット数。暫定値: 最初の複数コミット PR のマージ時間を測ってから見直す。
export const COMMIT_CAP = 3;

// 既に triage 済みのパターンの既存の住み処が、今回の run にとってどの動詞を意味するか。
const ACTION: Record<string, string> = { page: "update", candidate: "promote", none: "create" };

// 候補ストアの 2 見出し。read_store/readStore がこの順で認識する。
const STORE_SECTIONS = ["## 昇格待ち", "## 単発"] as const;

// ストアの行が持つ根拠マーカー: GitHub の参照番号、または裸の "(research)" タグ。
const EVIDENCE = /#\d+|\(research\)/g;

function toRow(pattern: Pattern): Row {
  const evidence = pattern.evidence ?? [];
  const row: Row = {
    name: pattern.name ?? "",
    count: evidence.length,
    evidence,
    existing: pattern.existing ?? "none",
  };
  if (pattern.section !== undefined) {
    row.section = pattern.section;
  }
  return row;
}

export function triage(patterns: readonly Pattern[]): Report {
  const rows = patterns.map(toRow);

  const candidates: Triaged[] = rows
    .filter((r) => r.count < EVIDENCE_THRESHOLD)
    .map((r) => ({ ...r, action: "candidate" }));

  // Array.prototype.sort は ES2019 以降安定なので、根拠数で並んだパターンは入力順を保ち、
  // 同じ入力が run ごとに違う分かれ方をしない。
  const promoted: Triaged[] = rows
    .filter((r) => r.count >= EVIDENCE_THRESHOLD)
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ ...r, action: ACTION[r.existing] ?? "" }));

  // deferred は今や commit cap が残したものを運び、page cap が残したものではない。
  const commits: Triaged[][] = [];
  for (let i = 0; i < promoted.length; i += PAGE_CAP) {
    commits.push(promoted.slice(i, i + PAGE_CAP));
  }
  const cappedCommits = commits.slice(0, COMMIT_CAP);
  const pages = cappedCommits.flat();

  return {
    pages,
    candidates,
    deferred: promoted.slice(pages.length),
    commits: cappedCommits,
  };
}

/** Phase 1 は Phase 6 の worktree の中にストアを作るので、最初の run はストアを持たない。 */
export function readStore(path: string): Pattern[] {
  if (!existsSync(path) || !statSync(path).isFile()) {
    return [];
  }
  const rows: Pattern[] = [];
  const dropped: string[] = [];
  let section: string | undefined;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.startsWith("## ")) {
      const heading = STORE_SECTIONS.find((s) => line.startsWith(s));
      section = heading?.slice("## ".length);
      continue;
    }
    if (section === undefined || !line.startsWith("- ")) {
      continue;
    }
    const body = line.slice(2);
    const evidence = body.match(EVIDENCE) ?? [];
    const name = body.replace(EVIDENCE, "").trim();
    if (name) {
      rows.push({ name, evidence, existing: "candidate", section });
    } else {
      dropped.push(line);
    }
  }
  // stdout ではない: そちらの report は skill がパースする閉じた 4 key のオブジェクト。
  if (dropped.length > 0) {
    process.stderr.write(
      `triage.ts: skipped ${dropped.length} candidate row(s) carrying no body\n`,
    );
    for (const line of dropped) {
      process.stderr.write(`  ${line}\n`);
    }
  }
  return rows;
}

/** fresh を先にすると、根拠数が同じパターンが、既に 1 run 待ったパターンを押し出してしまう。
 * sorted は安定だから。蓄積行の先頭位置はここで決まり、下で existing を fresh 側に
 * 上書きしてもその位置は崩れない。 */
export function merge(store: readonly Pattern[], fresh: readonly Pattern[]): Pattern[] {
  const merged: Array<Pattern & { evidence: string[] }> = [];
  const index = new Map<string, number>();
  for (const p of [...store, ...fresh]) {
    const name = p.name ?? "";
    const at = index.get(name);
    if (at === undefined) {
      index.set(name, merged.length);
      merged.push({ ...p, evidence: [...(p.evidence ?? [])] });
      continue;
    }
    const seen = merged[at].evidence;
    for (const e of p.evidence ?? []) {
      if (!seen.includes(e)) {
        seen.push(e);
      }
    }
    // 蓄積行の existing は read_store が付けた固定値でしかない。今回同じ名前を fresh 側で
    // どちらとして見たかこそがその行の今の姿なので、そちらが勝つ。
    if (p.existing !== undefined) {
      merged[at].existing = p.existing;
    }
  }
  return merged;
}

const USAGE = "usage: triage.ts '<JSON array of patterns>' <candidates-file>\n";

export function main(argv: readonly string[]): number {
  if (argv.length < 2) {
    process.stderr.write(USAGE);
    return 2;
  }
  const fresh = JSON.parse(argv[0]) as Pattern[];
  const rows = merge(readStore(argv[1]), fresh);
  process.stdout.write(`${JSON.stringify(triage(rows))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
