/// <reference types="node" />
import { basename } from "node:path";

export const WRAPPERS: ReadonlySet<string> = new Set([
  "sudo",
  "env",
  "time",
  "nice",
  "xargs",
  "command",
  "exec",
  "nohup",
]);

export const VALUED_WRAPPER_FLAGS: ReadonlySet<string> = new Set([
  "-u",
  "-g",
  "-p",
  "-n",
  "-P",
  "-I",
  "-d",
  "-s",
  "-a",
  "-E",
  "-C",
]);

export const SEPARATORS: ReadonlySet<string> = new Set([";", "|", "||", "&&", "&", "\n"]);

export const EXEC_FLAGS: ReadonlySet<string> = new Set(["-exec", "-execdir", "-ok", "-okdir"]);

export const VALUED_GIT_FLAGS: ReadonlySet<string> = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
]);

export const PATH_SEPARATOR = "--";

export function subcommand(
  tokens: readonly string[],
  valuedFlags: ReadonlySet<string> = new Set(),
): [string | null, string[]] {
  const args = tokens.slice(1);
  let index = 0;
  while (index < args.length && args[index].startsWith("-")) {
    index += valuedFlags.has(args[index]) ? 2 : 1;
  }
  if (index >= args.length) {
    return [null, []];
  }
  return [args[index], args.slice(index + 1)];
}

export function git_subcommand(tokens: readonly string[]): [string | null, string[]] {
  return subcommand(tokens, VALUED_GIT_FLAGS);
}

export function flag_value(tokens: readonly string[], flag: string): string | null {
  const prefix = flag + "=";
  for (let position = 0; position < tokens.length; position += 1) {
    const token = tokens[position];
    if (token === flag) {
      return position + 1 < tokens.length ? tokens[position + 1] : null;
    }
    if (token.startsWith(prefix)) {
      return token.slice(prefix.length);
    }
  }
  return null;
}

export function starts_with(tokens: readonly string[], prefix: readonly string[]): boolean {
  if (tokens.length < prefix.length) {
    return false;
  }
  return prefix.every((token, index) => tokens[index] === token);
}

export function before_pathspec(rest: readonly string[]): string[] {
  const index = rest.indexOf(PATH_SEPARATOR);
  return index === -1 ? [...rest] : rest.slice(0, index);
}

export function git_clean_only_lists(rest: readonly string[]): boolean {
  for (const arg of before_pathspec(rest)) {
    if (arg === "--dry-run") {
      return true;
    }
    if (arg.startsWith("-") && !arg.startsWith("--") && arg.includes("n")) {
      return true;
    }
  }
  return false;
}

const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

const _NEWLINE = "\x00";
const _CONTINUATION = "\x01";
const _PUNCTUATION = "();<>|&" + _NEWLINE;

const _HEREDOC = /<<-?\s*(['"]?)(\w+)\1/;

const _QUOTES = "'\"";
const _ESCAPE = "\\";
const _ESCAPED_QUOTES = '"';
const _WHITESPACE = " \t\r\n";
const _COMMENTER = "#";

function _without_heredocs(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    kept.push(line);
    index += 1;
    const match = _HEREDOC.exec(line);
    if (!match) {
      continue;
    }
    const closing = match[2];
    for (let end = index; end < lines.length; end += 1) {
      if (lines[end].trim() === closing) {
        index = end + 1;
        break;
      }
    }
  }
  return kept.join("\n");
}

function _restore(token: string): string {
  return token
    .replaceAll(_ESCAPE + _CONTINUATION, _ESCAPE + "\n")
    .replaceAll(_CONTINUATION, "")
    .replaceAll(_NEWLINE, "\n");
}

type _LexState = "space" | "word" | "punct" | "quote" | "escape";

function _lex(text: string): string[] {
  const chars = Array.from(text);
  let pos = 0;
  const pushback: string[] = [];

  let token = "";
  let state: _LexState = "space";
  let quoteChar = "";
  let escapedState: "word" | "quote" = "word";
  let escapedQuoteChar = "";

  function nextChar(): string | null {
    if (pushback.length > 0) {
      return pushback.pop() as string;
    }
    if (pos >= chars.length) {
      return null;
    }
    const ch = chars[pos];
    pos += 1;
    return ch;
  }

  function onSpace(ch: string | null): string | null | undefined {
    if (ch === null) {
      return null;
    }
    if (_WHITESPACE.includes(ch)) {
      return undefined;
    }
    if (ch === _COMMENTER) {
      pos = chars.length;
      return null;
    }
    if (ch === _ESCAPE) {
      state = "escape";
      escapedState = "word";
      return undefined;
    }
    if (_PUNCTUATION.includes(ch)) {
      token = ch;
      state = "punct";
      return undefined;
    }
    if (_QUOTES.includes(ch)) {
      state = "quote";
      quoteChar = ch;
      return undefined;
    }
    token = ch;
    state = "word";
    return undefined;
  }

  function onQuote(ch: string | null): string | null | undefined {
    if (ch === null) {
      throw new Error("No closing quotation");
    }
    if (ch === quoteChar) {
      state = "word";
      return undefined;
    }
    if (ch === _ESCAPE && _ESCAPED_QUOTES.includes(quoteChar)) {
      escapedState = "quote";
      escapedQuoteChar = quoteChar;
      state = "escape";
      return undefined;
    }
    token += ch;
    return undefined;
  }

  function onEscape(ch: string | null): string | null | undefined {
    if (ch === null) {
      throw new Error("No escaped character");
    }
    if (escapedState === "quote") {
      if (ch !== _ESCAPE && ch !== escapedQuoteChar) {
        token += _ESCAPE;
      }
      token += ch;
      state = "quote";
      quoteChar = escapedQuoteChar;
      return undefined;
    }
    token += ch;
    state = "word";
    return undefined;
  }

  function onPunct(ch: string | null): string | null | undefined {
    if (ch === null) {
      return token;
    }
    if (ch === _COMMENTER) {
      pos = chars.length;
      return token;
    }
    if (_WHITESPACE.includes(ch)) {
      return token;
    }
    if (_PUNCTUATION.includes(ch)) {
      token += ch;
      return undefined;
    }
    pushback.push(ch);
    return token;
  }

  function onWord(ch: string | null): string | null | undefined {
    if (ch === null) {
      return token;
    }
    if (ch === _COMMENTER) {
      pos = chars.length;
      return token;
    }
    if (_WHITESPACE.includes(ch)) {
      return token;
    }
    if (_QUOTES.includes(ch)) {
      state = "quote";
      quoteChar = ch;
      return undefined;
    }
    if (ch === _ESCAPE) {
      state = "escape";
      escapedState = "word";
      return undefined;
    }
    if (_PUNCTUATION.includes(ch)) {
      pushback.push(ch);
      return token;
    }
    token += ch;
    return undefined;
  }

  const handlers: Record<_LexState, (ch: string | null) => string | null | undefined> = {
    space: onSpace,
    quote: onQuote,
    escape: onEscape,
    punct: onPunct,
    word: onWord,
  };

  function readToken(): string | null {
    token = "";
    state = "space";
    quoteChar = "";
    escapedState = "word";
    escapedQuoteChar = "";

    while (true) {
      const ch = nextChar();
      const result = handlers[state](ch);
      if (result !== undefined) {
        return result;
      }
    }
  }

  const tokens: string[] = [];
  while (true) {
    const token = readToken();
    if (token === null) {
      break;
    }
    tokens.push(token);
  }
  return tokens;
}

function _tokens(text: string): string[] {
  const prepared = text.replaceAll("\\\n", _ESCAPE + _CONTINUATION).replaceAll("\n", _NEWLINE);
  return _lex(prepared)
    .filter((token) => token !== _CONTINUATION)
    .map(_restore);
}

export function* commands_with_env(text: string): Generator<[Record<string, string>, string[]]> {
  let current: string[] = [];
  for (const token of _tokens(_without_heredocs(text))) {
    if (SEPARATORS.has(token)) {
      if (current.length > 0) {
        yield* _resolve(current);
      }
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) {
    yield* _resolve(current);
  }
}

function _wrapperFlagSpan(tokens: readonly string[], start: number): number {
  let index = start;
  while (index < tokens.length && tokens[index].startsWith("-")) {
    index += VALUED_WRAPPER_FLAGS.has(tokens[index]) ? 2 : 1;
  }
  return index - start;
}

function _skipToCommand(tokens: readonly string[]): [Record<string, string>, number] {
  const env: Record<string, string> = {};
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (ENV_ASSIGNMENT.test(token)) {
      const split = token.indexOf("=");
      env[token.slice(0, split)] = token.slice(split + 1);
      index += 1;
    } else if (WRAPPERS.has(basename(token))) {
      index += 1 + _wrapperFlagSpan(tokens, index + 1);
    } else if (EXEC_FLAGS.has(token)) {
      index += 1;
    } else {
      break;
    }
  }
  return [env, index];
}

function* _execTail(resolved: readonly string[]): Generator<[Record<string, string>, string[]]> {
  for (let position = 0; position < resolved.length; position += 1) {
    if (EXEC_FLAGS.has(resolved[position]) && position + 1 < resolved.length) {
      yield* _resolve(resolved.slice(position + 1));
      return;
    }
  }
}

function* _resolve(tokens: readonly string[]): Generator<[Record<string, string>, string[]]> {
  const [env, index] = _skipToCommand(tokens);
  if (index >= tokens.length) {
    return;
  }
  const resolved = [basename(tokens[index]), ...tokens.slice(index + 1)];
  yield [env, resolved];
  yield* _execTail(resolved);
}

export function* commands(text: string): Generator<string[]> {
  for (const [, tokens] of commands_with_env(text)) {
    yield tokens;
  }
}
