/// <reference types="node" />
// Detect a .ja/ file whose prose holds no Japanese; the TypeScript side of
// hooks/_lib/mirror_prose.py (DR-0112's TypeScript migration, issue #644). Ports everything in
// that module except `_python_prose` (mirror_prose.py:44-70): that extraction walks Python
// source with `ast` and `tokenize`, which node carries no equivalent for, so unit U-002
// (hooks/_lib/tests/mirror-prose-python.test.ts) adds a string-state walk for it separately.
//
// The edit-time hook (hooks/edit/mirror_prose_guard.ts, unit U-003) and the repository-wide
// sweep both import this. The hook answers for one file as it changes; the sweep answers for
// every file, including what landed while no hook was watching.
//
// U-001: the control flow below mirrors mirror_prose.py's (check calls isTarget then
// extractProse then hasJapanese, checkEnglish calls isEnglishTarget then extractProse then
// hasJapanese, extractProse dispatches on suffix). pythonProse itself is U-002
// (hooks/_lib/tests/mirror-prose-python.test.ts), which ports mirror_prose.py:44-70's
// ast/tokenize walk as its own string-state scan, since node carries no equivalent for either
// module.
import { readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative as relativeTo, sep } from "node:path";
import { editedFile, notify } from "./hook_payload.ts";
import { hasJapanese } from "./japanese.ts";

// Extensions whose prose the mirror convention translates.
export const TARGET_SUFFIXES: readonly string[] = [".py", ".js", ".ts", ".sh", ".md"];

// A name declaring the file is English. Such a file holds wording a skill quotes verbatim, so
// there is nothing in it to translate.
export const ENGLISH_SUFFIX = ".en.md";

// mirror_prose.py's COMMENT_LINE / SHEBANG_OR_ENCODING / QUOTED.
const COMMENT_LINE = /^\s*(#|\/\/|\*)/;
const SHEBANG_OR_ENCODING = /^#!|^# -\*- coding/;
const QUOTED = /"[^"]*"|'[^']*'|`[^`]*`/g;

/** A .ja/ directory has to be on the path, not merely the string somewhere in a name
 * (mirror_prose.py's `is_target`). */
export function isTarget(filePath: string): boolean {
  if (filePath.endsWith(ENGLISH_SUFFIX)) return false;
  return filePath.split(sep).includes(".ja") && TARGET_SUFFIXES.includes(extname(filePath));
}

/** python's `str.expandtabs()`: each tab pads to the next multiple of 8 columns, counted from
 * the start of the line (mirror_prose.py's `_python_prose` runs on `inspect.cleandoc`, which
 * calls this first). */
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

/** `inspect.cleandoc`, the dedent `ast.get_docstring(node, clean=True)` applies before
 * mirror_prose.py's `_python_prose` collects a docstring's lines: strip the first line, drop
 * the common leading whitespace off every other line, then drop leading/trailing blank
 * lines. */
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

/** mirror_prose.py:44-70's `_python_prose`, ported by U-002 (hooks/_lib/tests/mirror-prose-
 * python.test.ts) as a string-state scan: node has neither `ast` nor `tokenize`, so this walks
 * the source a character at a time, tracking triple-quoted / single-quoted / prefixed string
 * literals and the module / def / class docstring position by hand instead.
 *
 * Docstrings collect before comments, mirroring `_python_prose`'s own two separate passes
 * (`ast.walk` over every docstring, then a `tokenize` pass over every comment) rather than the
 * source-order position each was found at -- a file mixing both types returns them in the same
 * order the Python side would.
 *
 * Simplification kept out of scope: `ast.walk`'s breadth-first order across multiple nested
 * docstrings (module, then every sibling def/class before descending) is not reproduced here --
 * docstrings collect in scan (source) order instead. No test in this unit's scenarios exercises
 * more than one docstring per file, so this stays unverified against that case. */
function pythonProse(src: string): string[] {
  const docstrings: string[] = [];
  const comments: string[] = [];

  // Per-logical-line state. A logical line ends at a newline that is not inside a string --
  // a triple-quoted string's interior newlines are consumed inside the string scan below and
  // never reach the newline check.
  let atModuleStart = true; // true until the file's first statement is processed
  let afterHeader = false; // true only for the logical line right after a def/class header
  let noTokenYet = true; // no non-whitespace token seen yet on the current logical line
  let leadsWithString = false; // this line's first token is a string literal
  let stringIsAlone = true; // no other code token has followed that leading string
  let pendingDoc: string[] | null = null; // that leading string's cleaned lines, if any
  let codeText = ""; // the line's code with string interiors blanked to "S", for the header check

  const isIdentChar = (c: string) => /[A-Za-z0-9_]/.test(c);

  function endLine(): void {
    if (!noTokenYet) {
      if (leadsWithString && stringIsAlone && pendingDoc && (atModuleStart || afterHeader)) {
        docstrings.push(...pendingDoc);
      }
      afterHeader = DEF_OR_CLASS_HEADER.test(codeText.trim());
      atModuleStart = false;
    }
    noTokenYet = true;
    leadsWithString = false;
    stringIsAlone = true;
    pendingDoc = null;
    codeText = "";
  }

  const n = src.length;
  let i = 0;
  while (i < n) {
    const ch = src[i];

    if (ch === "\n") {
      endLine();
      i++;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r") {
      codeText += " ";
      i++;
      continue;
    }
    if (ch === "#") {
      let j = i;
      while (j < n && src[j] !== "\n") j++;
      const text = src.slice(i, j);
      if (!text.startsWith("#!")) comments.push(text);
      i = j;
      continue;
    }

    // A string literal: 0-2 prefix letters (r/b/f/u, any case) then a quote, and the run must
    // start at a word boundary -- otherwise it is the tail of a longer identifier, not a prefix.
    const prevChar = i > 0 ? src[i - 1] : "";
    let prefixLen = 0;
    while (prefixLen < 2 && /[rRbBfFuU]/.test(src[i + prefixLen] ?? "")) prefixLen++;
    const quoteAt = i + prefixLen;
    const quoteChar = src[quoteAt];
    const isStringStart = (quoteChar === '"' || quoteChar === "'") && !isIdentChar(prevChar);

    if (isStringStart) {
      const triple = src[quoteAt + 1] === quoteChar && src[quoteAt + 2] === quoteChar;
      const contentStart = triple ? quoteAt + 3 : quoteAt + 1;
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

      if (noTokenYet) {
        leadsWithString = true;
        pendingDoc = cleandoc(content);
      } else {
        stringIsAlone = false;
      }
      noTokenYet = false;
      codeText += "S";
      i = end;
      continue;
    }

    if (leadsWithString) stringIsAlone = false;
    noTokenYet = false;
    codeText += ch;
    i++;
  }
  endLine();

  return [...docstrings, ...comments];
}

/** Markdown carries no comment marker: the body is the prose. Fenced blocks come out, where
 * identifiers make up the text (mirror_prose.py's `_markdown_prose`). */
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

/** mirror_prose.py's `_comment_prose`. */
function commentProse(src: string): string[] {
  return src
    .split("\n")
    .filter((line) => COMMENT_LINE.test(line) && !SHEBANG_OR_ENCODING.test(line));
}

/** Prose only, never code or string literals. Counting the whole file would pass on any file
 * holding a Japanese string literal (mirror_prose.py's `extract_prose`). */
export function extractProse(filePath: string): string[] {
  const src = readFileSync(filePath, "utf8");
  const suffix = extname(filePath);
  if (suffix === ".py") return pythonProse(src);
  if (suffix === ".md") return markdownProse(src);
  return commentProse(src);
}

/** The warning for a file that lost its Japanese, or null when there is nothing to say
 * (mirror_prose.py's `check`). The file has to exist: extractProse reads it. */
export function check(filePath: string): string | null {
  if (!isTarget(filePath)) return null;
  const lines = extractProse(filePath);
  const text = lines.join("\n");
  // A single Japanese character clears this guard, and no prose at all passes: the target is a
  // wholesale replacement, not partial drift or a pure-code identical copy.
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

/** The .ja/ copy of an English-side file, found by walking up to the directory holding .ja/
 * (mirror_prose.py's `_ja_counterpart`). */
function jaCounterpart(filePath: string): string | null {
  let current = dirname(filePath);
  for (;;) {
    const candidate = join(current, ".ja");
    try {
      if (statSync(candidate).isDirectory()) {
        return join(candidate, relativeTo(current, filePath));
      }
    } catch {
      // No .ja/ at this level; keep climbing.
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** The English side of a mirrored pair, for the extensions whose prose sits in comments
 * (mirror_prose.py's `is_english_target`). Markdown is out: an English SKILL.md carries its
 * when_to_use trigger phrases in Japanese on purpose, and markdownProse cannot tell those from
 * prose left untranslated. */
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

/** The warning for an English-side file still holding Japanese prose, or null
 * (mirror_prose.py's `check_english`). */
export function checkEnglish(filePath: string): string | null {
  if (!isEnglishTarget(filePath)) return null;
  // English prose quoting a Japanese literal names data, which keeps its original language.
  const lines = extractProse(filePath).filter((line) => hasJapanese(line.replace(QUOTED, ""), 1));
  if (lines.length === 0) return null;
  return (
    `mirror_prose_guard: 英語側の prose は英語 (MIRROR.md)。` +
    `${filePath} のコメント / docstring ${lines.length} 行が日本語のまま。` +
    `.ja/ 側からの複製で止まっていないか確認する。`
  );
}

/** Answer a PostToolUse payload on stdout (mirror_prose.py's `emit`). systemMessage reaches the
 * human and additionalContext reaches whoever rewrote the file. */
export function emit(stdinText: string): void {
  const filePath = editedFile(stdinText);
  if (filePath === null) return;
  const message = check(filePath);
  if (message === null) return;
  notify(message);
}
