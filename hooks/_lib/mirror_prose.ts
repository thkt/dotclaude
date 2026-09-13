/// <reference types="node" />
// Detect a .ja/ file whose prose holds no Japanese. Ported from hooks/_lib's original Python
// mirror_prose module (DR-0112's TypeScript migration, issue #644); that Python module and its
// hook retired once this file and hooks/edit/mirror_prose_guard.ts took over (unit U-004). Ports
// everything in the original module except `_python_prose` (its lines 44-70): that extraction
// walks Python source with `ast` and `tokenize`, which node carries no equivalent for, so unit
// U-002 (hooks/_lib/tests/mirror-prose-python.test.ts) adds a string-state walk for it separately.
//
// The edit-time hook (hooks/edit/mirror_prose_guard.ts, unit U-003) and the repository-wide
// sweep both import this. The hook answers for one file as it changes; the sweep answers for
// every file, including what landed while no hook was watching.
//
// U-001: the control flow below mirrors the original Python module's (check calls isTarget then
// extractProse then hasJapanese, checkEnglish calls isEnglishTarget then extractProse then
// hasJapanese, extractProse dispatches on suffix). pythonProse itself is U-002
// (hooks/_lib/tests/mirror-prose-python.test.ts), which ports the original module's lines 44-70
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

// The original Python module's COMMENT_LINE / SHEBANG_OR_ENCODING / QUOTED.
const COMMENT_LINE = /^\s*(#|\/\/|\*)/;
const SHEBANG_OR_ENCODING = /^#!|^# -\*- coding/;
const QUOTED = /"[^"]*"|'[^']*'|`[^`]*`/g;

/** A .ja/ directory has to be on the path, not merely the string somewhere in a name
 * (the original Python module's `is_target`). */
export function isTarget(filePath: string): boolean {
  if (filePath.endsWith(ENGLISH_SUFFIX)) return false;
  return filePath.split(sep).includes(".ja") && TARGET_SUFFIXES.includes(extname(filePath));
}

/** python's `str.expandtabs()`: each tab pads to the next multiple of 8 columns, counted from
 * the start of the line (the original Python module's `_python_prose` runs on
 * `inspect.cleandoc`, which calls this first). */
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
 * the original Python module's `_python_prose` collects a docstring's lines: strip the first line, drop
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
const isIdentChar = (c: string) => /[A-Za-z0-9_]/.test(c);

/** Whether position `i` in `src` starts a Python string literal: 0-2 prefix letters (r/b/f/u,
 * any case) then a quote, with the run beginning at a word boundary -- otherwise it is the tail
 * of a longer identifier, not a prefix. Split out of pythonProse (unit U-006) so the quote /
 * triple-quote detection carries its own name instead of sitting inline in the scan loop. */
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

/** The literal's content and the index right after its closing quote(s), scanning from
 * `contentStart` (just past the opening quote(s)). An unterminated literal runs to the first
 * unescaped newline (single/double-quoted) or to end of source (triple-quoted), the same as the
 * inline scan this was split out of (unit U-006) ran. */
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

/** The comment text (from `#` at `i` to end of line, exclusive), and the index of that end. */
function readComment(src: string, i: number): { text: string; end: number } {
  const n = src.length;
  let j = i;
  while (j < n && src[j] !== "\n") j++;
  return { text: src.slice(i, j), end: j };
}

// Per-logical-line scan state. A logical line ends at a newline that is not inside a string --
// a triple-quoted string's interior newlines are consumed inside the string scan and never reach
// the newline check.
interface LineScanState {
  atModuleStart: boolean; // true until the file's first statement is processed
  afterHeader: boolean; // true only for the logical line right after a def/class header
  noTokenYet: boolean; // no non-whitespace token seen yet on the current logical line
  leadsWithString: boolean; // this line's first token is a string literal
  stringIsAlone: boolean; // no other code token has followed that leading string
  pendingDoc: string[] | null; // that leading string's cleaned lines, if any
  codeText: string; // the line's code with string interiors blanked to "S", for the header check
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

/** Applied at each newline that ends a logical line (and once more at end of file): mutates
 * `state` in place for the line that follows, and appends the line's pending docstring to
 * `docstrings` when it qualifies as one (module/def/class docstring position, alone on its
 * line). Split out of pythonProse's own `endLine` closure (unit U-006) so its docstring-
 * qualifying logic carries its own name instead of closing over pythonProse's locals. */
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

/** A string literal's `content` reached the scan at a point where `state.noTokenYet` says
 * whether it leads its logical line: leading, it becomes that line's docstring candidate;
 * otherwise its presence only clears `stringIsAlone` for a docstring the line already leads
 * with. Split out of pythonProse (unit U-006) to keep the noTokenYet/leadsWithString branch out
 * of the main scan loop. */
function applyStringToken(state: LineScanState, content: string): void {
  if (state.noTokenYet) {
    state.leadsWithString = true;
    state.pendingDoc = cleandoc(content);
  } else {
    state.stringIsAlone = false;
  }
  state.noTokenYet = false;
}

// The five scanToken branches below (unit U-006 split) each answer null when the character at
// `i` is not theirs to handle, or the next scan index once they have consumed it -- the same
// per-character dispatch pythonProse's own if/else-if chain ran, just as one small function per
// branch instead of one large one.

function tryNewline(src: string, i: number, state: LineScanState, docstrings: string[]): number | null {
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

// The fallback branch: an ordinary code character, always consumed.
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

/** The original Python module's lines 44-70, `_python_prose`, ported by U-002 (hooks/_lib/tests/mirror-prose-
 * python.test.ts) as a string-state scan: node has neither `ast` nor `tokenize`, so this walks
 * the source a character at a time, tracking triple-quoted / single-quoted / prefixed string
 * literals and the module / def / class docstring position by hand instead. matchStringStart /
 * readStringLiteral / readComment / scanToken above carry the per-token scanning; this function
 * only drives the scan loop and returns the collected docstrings and comments.
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
  const state = initialLineScanState();

  const n = src.length;
  let i = 0;
  while (i < n) {
    i = scanToken(src, i, state, docstrings, comments);
  }
  endLogicalLine(state, docstrings);

  return [...docstrings, ...comments];
}

/** Markdown carries no comment marker: the body is the prose. Fenced blocks come out, where
 * identifiers make up the text (the original Python module's `_markdown_prose`). */
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

/** The original Python module's `_comment_prose`. */
function commentProse(src: string): string[] {
  return src
    .split("\n")
    .filter((line) => COMMENT_LINE.test(line) && !SHEBANG_OR_ENCODING.test(line));
}

/** Prose only, never code or string literals. Counting the whole file would pass on any file
 * holding a Japanese string literal (the original Python module's `extract_prose`). */
export function extractProse(filePath: string): string[] {
  const src = readFileSync(filePath, "utf8");
  const suffix = extname(filePath);
  if (suffix === ".py") return pythonProse(src);
  if (suffix === ".md") return markdownProse(src);
  return commentProse(src);
}

/** The warning for a file that lost its Japanese, or null when there is nothing to say
 * (the original Python module's `check`). The file has to exist: extractProse reads it. */
/** The original Python module's `Path(path).is_file()`, which answers false for every reason a
 * stat can fail rather than raising. statSync raises instead, so a payload naming a file the
 * editor has already moved would leave the hook exiting 1 with a stack trace where the Python
 * hook exited 0 in silence. */
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
 * (the original Python module's `_ja_counterpart`). */
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
 * (the original Python module's `is_english_target`). Markdown is out: an English SKILL.md carries its
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
 * (the original Python module's `check_english`). */
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

/** Answer a PostToolUse payload on stdout (the original Python module's `emit`). systemMessage reaches the
 * human and additionalContext reaches whoever rewrote the file. */
export function emit(stdinText: string): void {
  const filePath = editedFile(stdinText);
  if (filePath === null || !isReadableFile(filePath)) return;
  const message = check(filePath);
  if (message === null) return;
  notify(message);
}
