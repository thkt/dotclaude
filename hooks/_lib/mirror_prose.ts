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
// hasJapanese, extractProse dispatches on suffix). pythonProse alone stays a stub: U-002
// (hooks/_lib/tests/mirror-prose-python.test.ts) ports mirror_prose.py:44-70's ast/tokenize walk
// separately, since node carries no equivalent for either module.
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

/** mirror_prose.py:44-70's `_python_prose`, ported by U-002
 * (hooks/_lib/tests/mirror-prose-python.test.ts). Scaffolded here only so extractProse has
 * something to dispatch a .py file to before that unit lands. */
function pythonProse(_src: string): string[] {
  // TODO U-002: port mirror_prose.py's _python_prose (see that unit's own test file).
  return [];
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
