#!/usr/bin/env node
/// <reference types="node" />
// Usage: write-body.ts <digest> <outfile> [projects-dir]
//
// implement workflow が生成した PR 本文を、agent に写させずに <outfile> へ書く。
// workflow は本文を base64 のブロックとして body agent の prompt に入れ、Claude Code はその prompt を
// agent の transcript の最初の行に保存する。このスクリプトはそこからブロックを読み戻すので、本文の文字は
// 1 つもモデルを通らない。約 10 KB の base64 を写す agent は文字を取り違え、digest の照合が公開を止め続けた。
//
// <digest> は workflow が計算した本文の digest。その digest を持つ本文に復号できるブロックだけを書くので、
// 別の実行や別の本文が残したブロックを取り違えない。
// [projects-dir] の既定は $HOME/.claude/projects。
//
// stdout: 1 行の JSON。{ok: true, transcript} か {ok: false, reason}
// exit 0 は本文を書いたとき。それ以外は exit 1 で、何も書かない。一致するブロックを持つ transcript が無いか、
// 走査そのものが失敗したとき。そこに transcript を残さない host (Codex の runner) では常に exit 1 になり、
// workflow は agent にブロックを写させる。
import { closeSync, openSync, readSync, readdirSync, statSync, writeFileSync } from "node:fs";
import type { Dirent } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

// body agent は、自分の transcript が書かれてから数秒のうちにこれを実行する。この幅は、過去の全セッションの
// transcript を開かずに済ませるためだけにある。
const RECENT_MS = 2 * 60 * 60 * 1000;
// 読み戻しの prompt が持つ形のブロックと、写しの prompt の heredoc が持つ形のブロック。
const BLOCK = /(?:PR_BODY_B64_BEGIN|<<'PR_BODY_B64')\n([\s\S]*?)\n\s*PR_BODY_B64(?:_END)?/g;

// implement.js と同じ digest。末尾の空白を除いた文字列の UTF-16 code unit に対する FNV-1a と、その長さ。
export const digest = (text: string): string => {
  const t = text.trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, "0")}:${t.length}`;
};

// 読めない項目が 1 つあっても (sandbox が拒むディレクトリ、別のセッションが消したばかりの transcript)、
// agent 自身の transcript に届く前に走査を終わらせない。
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

// agent の transcript は <projects>/<project>/<session>/subagents/**/agent-<id>.jsonl にある。
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

// transcript は数 MB になり、prompt はその最初の行にある。
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

// prompt の本文。最初の行にある user メッセージの content で、文字列か text の部品の並び。
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
    // harness は計算された prompt の全行を字下げするので、空白は何も運ばない。
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
