/// <reference types="node" />
import { readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative as relativeTo, sep } from "node:path";
import { editedFile, notify } from "./hook_payload.ts";
import { hasJapanese } from "./japanese.ts";

export const TARGET_SUFFIXES: readonly string[] = [".py", ".js", ".ts", ".sh", ".md"];

export const ENGLISH_SUFFIX = ".en.md";

const COMMENT_LINE = /^\s*(#|\/\/|\*)/;
const SHEBANG_OR_ENCODING = /^#!|^# -\*- coding/;
const QUOTED = /"[^"]*"|'[^']*'|`[^`]*`/g;

export function isTarget(filePath: string): boolean {
  if (filePath.endsWith(ENGLISH_SUFFIX)) return false;
  return filePath.split(sep).includes(".ja") && TARGET_SUFFIXES.includes(extname(filePath));
}

function expandTabs(line: string): string {
  let out = "";
  let col = 0;
  for (const ch of line) {
    if (ch === "\t") {
      const pad = 8 - (col % 8);
      out += " ".repeat(pad);
      col += pad;
    } else {
      out += ch;
      col += 1;
    }
  }
  return out;
}

function cleandoc(text: string): string[] {
  const lines = text.split("\n").map(expandTabs);
  let margin = Infinity;
  for (let idx = 1; idx < lines.length; idx++) {
    const stripped = lines[idx].replace(/^[ \t]+/, "");
    if (stripped.length > 0) margin = Math.min(margin, lines[idx].length - stripped.length);
  }
  if (lines.length > 0) lines[0] = lines[0].replace(/^[ \t]+/, "");
  if (margin < Infinity) {
    for (let idx = 1; idx < lines.length; idx++) lines[idx] = lines[idx].slice(margin);
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  while (lines.length > 0 && lines[0] === "") lines.shift();
  return lines;
}

const DEF_OR_CLASS_HEADER = /^(async\s+def|def|class)\b.*:$/;
const isIdentChar = (c: string) => /[A-Za-z0-9_]/.test(c);

function matchStringStart(
  src: string,
  i: number,
): { contentStart: number; quoteChar: string; triple: boolean } | null {
  const prevChar = i > 0 ? src[i - 1] : "";
  let prefixLen = 0;
  while (prefixLen < 2 && /[rRbBfFuU]/.test(src[i + prefixLen] ?? "")) prefixLen++;
  const quoteAt = i + prefixLen;
  const quoteChar = src[quoteAt];
  if ((quoteChar !== '"' && quoteChar !== "'") || isIdentChar(prevChar)) return null;
  const triple = src[quoteAt + 1] === quoteChar && src[quoteAt + 2] === quoteChar;
  const contentStart = triple ? quoteAt + 3 : quoteAt + 1;
  return { contentStart, quoteChar, triple };
}

function readStringLiteral(
  src: string,
  contentStart: number,
  quoteChar: string,
  triple: boolean,
): { content: string; end: number } {
  const n = src.length;
  let k = contentStart;
  let closed = false;
  while (k < n) {
    const c = src[k];
    if (c === "\\") {
      k += 2;
      continue;
    }
    if (triple) {
      if (c === quoteChar && src[k + 1] === quoteChar && src[k + 2] === quoteChar) {
        closed = true;
        break;
      }
    } else if (c === quoteChar || c === "\n") {
      closed = c === quoteChar;
      break;
    }
    k++;
  }
  const content = src.slice(contentStart, k);
  const end = closed ? k + (triple ? 3 : 1) : k;
  return { content, end };
}

function readComment(src: string, i: number): { text: string; end: number } {
  const n = src.length;
  let j = i;
  while (j < n && src[j] !== "\n") j++;
  return { text: src.slice(i, j), end: j };
}

interface LineScanState {
  atModuleStart: boolean;
  afterHeader: boolean;
  noTokenYet: boolean;
  leadsWithString: boolean;
  stringIsAlone: boolean;
  pendingDoc: string[] | null;
  codeText: string;
}

function initialLineScanState(): LineScanState {
  return {
    atModuleStart: true,
    afterHeader: false,
    noTokenYet: true,
    leadsWithString: false,
    stringIsAlone: true,
    pendingDoc: null,
    codeText: "",
  };
}

function endLogicalLine(state: LineScanState, docstrings: string[]): void {
  if (!state.noTokenYet) {
    if (
      state.leadsWithString &&
      state.stringIsAlone &&
      state.pendingDoc &&
      (state.atModuleStart || state.afterHeader)
    ) {
      docstrings.push(...state.pendingDoc);
    }
    state.afterHeader = DEF_OR_CLASS_HEADER.test(state.codeText.trim());
    state.atModuleStart = false;
  }
  state.noTokenYet = true;
  state.leadsWithString = false;
  state.stringIsAlone = true;
  state.pendingDoc = null;
  state.codeText = "";
}

function applyStringToken(state: LineScanState, content: string): void {
  if (state.noTokenYet) {
    state.leadsWithString = true;
    state.pendingDoc = cleandoc(content);
  } else {
    state.stringIsAlone = false;
  }
  state.noTokenYet = false;
}

function tryNewline(
  src: string,
  i: number,
  state: LineScanState,
  docstrings: string[],
): number | null {
  if (src[i] !== "\n") return null;
  endLogicalLine(state, docstrings);
  return i + 1;
}

function tryBlank(src: string, i: number, state: LineScanState): number | null {
  const ch = src[i];
  if (ch !== " " && ch !== "\t" && ch !== "\r") return null;
  state.codeText += " ";
  return i + 1;
}

function tryComment(src: string, i: number, comments: string[]): number | null {
  if (src[i] !== "#") return null;
  const comment = readComment(src, i);
  if (!comment.text.startsWith("#!")) comments.push(comment.text);
  return comment.end;
}

function tryStringToken(src: string, i: number, state: LineScanState): number | null {
  const stringStart = matchStringStart(src, i);
  if (stringStart === null) return null;
  const literal = readStringLiteral(
    src,
    stringStart.contentStart,
    stringStart.quoteChar,
    stringStart.triple,
  );
  applyStringToken(state, literal.content);
  state.codeText += "S";
  return literal.end;
}

function scanPlainChar(src: string, i: number, state: LineScanState): number {
  if (state.leadsWithString) state.stringIsAlone = false;
  state.noTokenYet = false;
  state.codeText += src[i];
  return i + 1;
}

function scanToken(
  src: string,
  i: number,
  state: LineScanState,
  docstrings: string[],
  comments: string[],
): number {
  return (
    tryNewline(src, i, state, docstrings) ??
    tryBlank(src, i, state) ??
    tryComment(src, i, comments) ??
    tryStringToken(src, i, state) ??
    scanPlainChar(src, i, state)
  );
}

function pythonProse(src: string): string[] {
  const docstrings: string[] = [];
  const comments: string[] = [];
  const state = initialLineScanState();

  const n = src.length;
  let i = 0;
  while (i < n) {
    i = scanToken(src, i, state, docstrings, comments);
  }
  endLogicalLine(state, docstrings);

  return [...docstrings, ...comments];
}

function markdownProse(src: string): string[] {
  const out: string[] = [];
  let fenced = false;
  for (const line of src.split("\n")) {
    if (line.startsWith("```")) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) out.push(line);
  }
  return out;
}

function commentProse(src: string): string[] {
  return src
    .split("\n")
    .filter((line) => COMMENT_LINE.test(line) && !SHEBANG_OR_ENCODING.test(line));
}

export function extractProse(filePath: string): string[] {
  const src = readFileSync(filePath, "utf8");
  const suffix = extname(filePath);
  if (suffix === ".py") return pythonProse(src);
  if (suffix === ".md") return markdownProse(src);
  return commentProse(src);
}

function isReadableFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function check(filePath: string): string | null {
  if (!isTarget(filePath)) return null;
  const lines = extractProse(filePath);
  const text = lines.join("\n");
  if (!text.trim() || hasJapanese(text, 1)) return null;
  const count = lines.filter((line) => line.trim()).length;
  const label = extname(filePath) === ".md" ? "本文" : "コメント / docstring";
  return (
    `mirror_prose_guard: .ja/ は canonical で prose は日本語 (MIRROR.md)。` +
    `${filePath} の${label} ${count} 行に日本語が 1 文字もない。` +
    `英語で書き直していないか確認する。` +
    `過去訳は git log --oneline -- "${filePath}" から取れる。`
  );
}

function jaCounterpart(filePath: string): string | null {
  let current = dirname(filePath);
  for (;;) {
    const candidate = join(current, ".ja");
    try {
      if (statSync(candidate).isDirectory()) {
        return join(candidate, relativeTo(current, filePath));
      }
    } catch {}
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function isEnglishTarget(filePath: string): boolean {
  const suffix = extname(filePath);
  if (![".py", ".js", ".ts", ".sh"].includes(suffix) || filePath.split(sep).includes(".ja")) {
    return false;
  }
  const counterpart = jaCounterpart(filePath);
  if (counterpart === null) return false;
  try {
    return statSync(counterpart).isFile();
  } catch {
    return false;
  }
}

export function checkEnglish(filePath: string): string | null {
  if (!isEnglishTarget(filePath)) return null;
  const lines = extractProse(filePath).filter((line) => hasJapanese(line.replace(QUOTED, ""), 1));
  if (lines.length === 0) return null;
  return (
    `mirror_prose_guard: 英語側の prose は英語 (MIRROR.md)。` +
    `${filePath} のコメント / docstring ${lines.length} 行が日本語のまま。` +
    `.ja/ 側からの複製で止まっていないか確認する。`
  );
}

export function emit(stdinText: string): void {
  const filePath = editedFile(stdinText);
  if (filePath === null || !isReadableFile(filePath)) return;
  const message = check(filePath);
  if (message === null) return;
  notify(message);
}
