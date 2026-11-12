#!/usr/bin/env node
/// <reference types="node" />
// Usage: write-body.ts <digest> <outfile> [projects-dir]
//
// implement workflow が生成した PR 本文を、agent に写させずに <outfile> へ書く。
// workflow は本文を base64 の heredoc として body agent の prompt に入れ、Claude Code はその prompt を
// agent の transcript に保存する。このスクリプトは transcript からそのブロックを読み戻すので、本文の文字は
// 1 つもモデルを通らない。約 10 KB の base64 を写す agent は文字を取り違え、digest の照合が公開を止め続けた。
//
// <digest> は workflow が計算した本文の digest。その digest を持つ本文に復号できるブロックだけを書くので、
// 別の実行や別の本文が残したブロックを取り違えない。
// [projects-dir] の既定は $HOME/.claude/projects。
//
// stdout: 1 行の JSON。{ok: true, transcript} か {ok: false, reason}
// exit 0 は本文を書いたとき。exit 1 は一致するブロックを持つ transcript が無いときで、何も書かない。
// そこに transcript を残さない host (Codex の runner) では常に exit 1 になり、workflow の agent がブロックを写す。
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

// body agent は、自分の transcript が書かれてから数秒のうちにこれを実行する。この幅は、過去の全セッションの
// transcript を読まずに済ませるためだけにある。
const RECENT_MS = 2 * 60 * 60 * 1000;
const BLOCK = /<<'PR_BODY_B64'\n([\s\S]*?)\n\s*PR_BODY_B64/g;

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

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      })
    : [];

// agent の transcript は <projects>/<project>/<session>/subagents/**/agent-<id>.jsonl にある。
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

// transcript にある user メッセージすべての本文。prompt は最初の 1 つ。
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
      // harness は計算された prompt の全行を字下げするので、空白は何も運ばない。
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
