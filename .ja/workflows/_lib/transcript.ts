/// <reference types="node" />
// workflow script が agent の prompt に入れたものを、その agent の transcript から読み戻す。
//
// workflow script はファイルにもコマンドにも触れられないので、ディスクに置きたいものや実行したいものは
// すべて agent を通る。Claude Code は agent の prompt を、その transcript の最初の行にそのまま保存する。
// agent が実行する helper がそこから script のデータを読めば、agent は何も写さずに済む。relay.ts は実行する
// コマンドを、write-body.ts は PR 本文を、この方法で読む。
import { closeSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// agent は、自分の transcript が書かれてから数秒のうちに helper を実行する。この幅は、過去の全セッションの
// transcript を開かずに済ませるためだけにある。
const RECENT_MS = 2 * 60 * 60 * 1000;

// workflow script が計算する digest。末尾の空白を除いた文字列の UTF-16 code unit に対する FNV-1a と、その長さ。
// script はこの module を import できないので自分の写しを持ち、テストが 2 つを比べる。
export const digest = (text: string): string => {
  const t = text.trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, "0")}:${t.length}`;
};

export const defaultProjects = (): string => join(homedir(), ".claude", "projects");

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

// agent の transcript は <projects>/<project>/<session>/subagents/**/agent-<id>.jsonl にある。helper が走っている
// session は CLAUDE_CODE_SESSION_ID が示すので、その session のディレクトリだけを辿る。変数が無いとき、またはその
// session がそこに transcript を持たないときは、全 session を辿る。
const sessionDirs = (projects: string, session: string | undefined): string[] => {
  const projectDirs = entries(projects)
    .filter((project) => project.isDirectory())
    .map((project) => join(projects, project.name));
  const own = session
    ? projectDirs.map((dir) => join(dir, session, "subagents")).filter((dir) => entries(dir).length > 0)
    : [];
  if (own.length) return own;
  return projectDirs.flatMap((dir) =>
    entries(dir)
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(dir, entry.name, "subagents")),
  );
};
const recentTranscripts = (projects: string, now: number): string[] =>
  sessionDirs(projects, process.env.CLAUDE_CODE_SESSION_ID)
    .flatMap(walk)
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

// prompt の本文。最初の行にある user メッセージの content で、文字列か text の部品の並び。最初の行が
// marker を含まない transcript は、解析せずに飛ばす。
const promptOf = (transcript: string, marker: string): string => {
  const line = attempt(() => firstLine(transcript), "");
  if (!line.includes(marker)) return "";
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

// transcript が最近変わった agent の prompt を、新しい順に返す。marker を含むものに限る。
export function* recentPrompts(
  projects: string,
  marker: string,
): Generator<{ transcript: string; text: string }> {
  for (const transcript of recentTranscripts(projects, Date.now())) {
    const text = promptOf(transcript, marker);
    if (text) yield { transcript, text };
  }
}
