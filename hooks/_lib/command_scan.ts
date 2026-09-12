/// <reference types="node" />
// Command-position scanning shared by the PreToolUse hooks. The TypeScript replacement for the
// retired command_scan Python module (DR-0112's migration): every hook that parses a raw Bash
// string (shlex tokenizing, heredoc and line-continuation handling) imports this file.
//
// Most of this module works on an already-tokenized command (a list of strings a caller such as
// npm_install_guard or git_sandbox_guard hands in) -- never shlex. commands() and
// commands_with_env() are the exception: DR-0112's migration ports them and the shlex-based
// tokenizing they depend on here too (hooks/_lib/tests/command-scan-tokens.test.ts), since no
// node:* API is equivalent to shlex.shlex(posix=True, punctuation_chars=...).
import { basename } from "node:path";

/** Anything taking a subcommand of its own (git, npm) stays out: there the first token already
 * is the command. */
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

/** A wrapper flag that takes a value swallows the token after it, which would otherwise read as
 * the command being wrapped (`sudo -u root rm x` would resolve to root). */
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

/** find runs whatever follows these, so the scan continues past them inside one command. */
export const EXEC_FLAGS: ReadonlySet<string> = new Set(["-exec", "-execdir", "-ok", "-okdir"]);

/** git's own options sit before the subcommand, and the valued ones swallow the token after
 * them, which would otherwise read as the subcommand (`git -C /tmp clean` resolves to /tmp). */
export const VALUED_GIT_FLAGS: ReadonlySet<string> = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
]);

/** git reads everything past this as a path, not as a flag. */
export const PATH_SEPARATOR = "--";

/** Return the subcommand a call names and the arguments after it.
 *
 * Options in valuedFlags swallow the token after them. Returns [null, []] when no subcommand
 * follows, which is what `git -C /tmp` on its own leaves. */
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

/** Return the subcommand a git call names and the arguments after it. */
export function git_subcommand(tokens: readonly string[]): [string | null, string[]] {
  return subcommand(tokens, VALUED_GIT_FLAGS);
}

/** Return the value a flag carries, in either `--flag value` or `--flag=value` form. */
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

/** Whether a command opens with the given token sequence. */
export function starts_with(tokens: readonly string[], prefix: readonly string[]): boolean {
  if (tokens.length < prefix.length) {
    return false;
  }
  return prefix.every((token, index) => tokens[index] === token);
}

/** The arguments up to `--`.
 *
 * What follows names files, and reading those as flags lets `git rm -- -h` pass as a request
 * for help and `git clean -fd -- -notes` pass as a dry run. */
export function before_pathspec(rest: readonly string[]): string[] {
  const index = rest.indexOf(PATH_SEPARATOR);
  return index === -1 ? [...rest] : rest.slice(0, index);
}

/** Whether a git clean call prints its targets instead of removing them. */
export function git_clean_only_lists(rest: readonly string[]): boolean {
  for (const arg of before_pathspec(rest)) {
    if (arg === "--dry-run") {
      return true;
    }
    // Short flags combine, so the dry-run bit arrives inside -nd as well as alone.
    if (arg.startsWith("-") && !arg.startsWith("--") && arg.includes("n")) {
      return true;
    }
  }
  return false;
}

// --- commands() / commands_with_env() -------------------------------------------------------
// Ports the retired Python module's shlex-based tokenizing (DR-0112): no node:* API is
// equivalent to Python's shlex.shlex(posix=True, punctuation_chars=..., whitespace_split=True),
// so _lex()/_resolve() below hand-roll that state machine instead of reaching for one.
// hooks/_lib/tests/command-scan-tokens.test.ts diffs the result against
// hooks/_lib/tests/fixtures/command-scan-tokens.json, a table frozen before the retirement.

/** An assignment ahead of a command sets the environment for it, the same position `env` takes
 * (the retired Python module's ENV_ASSIGNMENT). */
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

// Not left as whitespace, which the lexer would drop and join the lines on either side into one
// command. As punctuation the newline stays a token, while one inside quotes stays part of its
// token, so a multi-line commit message holds together.
const _NEWLINE = "\x00";
// A line continuation is escaped onto this instead of onto _NEWLINE. The lexer returns the same
// character escaped or not, so as _NEWLINE it reads as the separator and splits the command.
const _CONTINUATION = "\x01";
const _PUNCTUATION = "();<>|&" + _NEWLINE;

const _HEREDOC = /<<-?\s*(['"]?)(\w+)\1/;

const _QUOTES = "'\"";
const _ESCAPE = "\\";
const _ESCAPED_QUOTES = '"';
const _WHITESPACE = " \t\r\n";
const _COMMENTER = "#";

/** Drop heredoc bodies. Newlines separate commands, so a body left in place turns each of its
 * lines into a command of its own.
 *
 * The closing line is found before anything is dropped. Quoting is still unresolved here, so
 * `-m 'see << EOF'` reads the same as a real marker; without a closing line it is quoted text,
 * and dropping the rest for it would hide the commands after it. */
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

/** A backslash still ahead of _CONTINUATION means the lexer read both as quoted text, where the
 * two characters are literal. Outside quotes it consumes the backslash, leaving the
 * continuation to drop so the lines it separated join. */
function _restore(token: string): string {
  return token
    .replaceAll(_ESCAPE + _CONTINUATION, _ESCAPE + "\n")
    .replaceAll(_CONTINUATION, "")
    .replaceAll(_NEWLINE, "\n");
}

type _LexState = "space" | "word" | "punct" | "quote" | "escape";

/** shlex.shlex(posix=True, punctuation_chars=_PUNCTUATION, whitespace_split=True), hand-rolled:
 * reads `text` one Unicode code point at a time (never a UTF-16 code unit, so a non-BMP
 * character survives inside its token instead of splitting at the surrogate pair), tracking
 * quoting, backslash-escaping, and the run-together punctuation tokens punctuation_chars
 * produces (`;;`, `\x00;`, ...). Throws on the same two conditions shlex raises ValueError for:
 * an EOF inside an open quote, and an EOF right after a trailing backslash -- as a plain Error,
 * not JavaScript's own SyntaxError, so a caller keeps one type to catch. */
function _lex(text: string): string[] {
  const chars = Array.from(text);
  let pos = 0;
  const pushback: string[] = [];

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

  function readToken(): string | null {
    let token = "";
    let state: _LexState = "space";
    let quoteChar = "";
    // What state resumes once the current escape is consumed, and (for "quote") which quote
    // character it returns to -- mirrors shlex's escapedstate.
    let escapedState: "word" | "quote" = "word";
    let escapedQuoteChar = "";

    while (true) {
      const ch = nextChar();

      if (state === "space") {
        if (ch === null) {
          return null;
        }
        if (_WHITESPACE.includes(ch)) {
          continue;
        }
        if (ch === _COMMENTER) {
          // A comment runs to the end of the current line. Nothing here separates commands by a
          // real newline (that already became _NEWLINE, a punctuation character) or a real
          // "line" at all once heredoc bodies are gone, so the comment consumes everything left.
          pos = chars.length;
          return null;
        }
        if (ch === _ESCAPE) {
          state = "escape";
          escapedState = "word";
          continue;
        }
        if (_PUNCTUATION.includes(ch)) {
          token = ch;
          state = "punct";
          continue;
        }
        if (_QUOTES.includes(ch)) {
          state = "quote";
          quoteChar = ch;
          continue;
        }
        token = ch;
        state = "word";
        continue;
      }

      if (state === "quote") {
        if (ch === null) {
          throw new Error("No closing quotation");
        }
        if (ch === quoteChar) {
          state = "word";
          continue;
        }
        if (ch === _ESCAPE && _ESCAPED_QUOTES.includes(quoteChar)) {
          escapedState = "quote";
          escapedQuoteChar = quoteChar;
          state = "escape";
          continue;
        }
        token += ch;
        continue;
      }

      if (state === "escape") {
        if (ch === null) {
          throw new Error("No escaped character");
        }
        if (escapedState === "quote") {
          // In posix shells, only the quote itself or the escape character may be escaped
          // within quotes; anything else keeps the backslash literally.
          if (ch !== _ESCAPE && ch !== escapedQuoteChar) {
            token += _ESCAPE;
          }
          token += ch;
          state = "quote";
          quoteChar = escapedQuoteChar;
          continue;
        }
        token += ch;
        state = "word";
        continue;
      }

      if (state === "punct") {
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
          continue;
        }
        pushback.push(ch);
        return token;
      }

      // state === "word"
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
        continue;
      }
      if (ch === _ESCAPE) {
        state = "escape";
        escapedState = "word";
        continue;
      }
      if (_PUNCTUATION.includes(ch)) {
        pushback.push(ch);
        return token;
      }
      token += ch;
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
  // A continuation between two words lexes as its own token, where the shell leaves nothing.
  return _lex(prepared)
    .filter((token) => token !== _CONTINUATION)
    .map(_restore);
}

/** Each command with the assignments that precede it, as [env, tokens] pairs.
 *
 * An assignment can change where a command lands (`GIT_DIR=` picks the repository), so a hook
 * answering "which target does this reach" cannot read the tokens alone.
 *
 * Throws on input the lexer cannot close, which lets a fail-closed hook deny rather than guess;
 * see _lex for the error contract. */
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

/** Emit the real command a token list runs, plus any it runs through -exec. */
function* _resolve(tokens: readonly string[]): Generator<[Record<string, string>, string[]]> {
  const env: Record<string, string> = {};
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (ENV_ASSIGNMENT.test(token)) {
      const split = token.indexOf("=");
      env[token.slice(0, split)] = token.slice(split + 1);
      index += 1;
    } else if (WRAPPERS.has(basename(token))) {
      index += 1;
      while (index < tokens.length && tokens[index].startsWith("-")) {
        index += VALUED_WRAPPER_FLAGS.has(tokens[index]) ? 2 : 1;
      }
    } else if (EXEC_FLAGS.has(token)) {
      // The lexer unescapes the `\;` closing a -exec, so the separator split hands the next one
      // over headed by the flag instead of by the command it runs.
      index += 1;
    } else {
      break;
    }
  }
  if (index >= tokens.length) {
    return;
  }
  const resolved = [basename(tokens[index]), ...tokens.slice(index + 1)];
  yield [env, resolved];

  for (let position = 0; position < resolved.length; position += 1) {
    if (EXEC_FLAGS.has(resolved[position]) && position + 1 < resolved.length) {
      yield* _resolve(resolved.slice(position + 1));
      return;
    }
  }
}

/** Each command as a token list, its first entry the executable name.
 *
 * Throws on input the lexer cannot close, see commands_with_env. */
export function* commands(text: string): Generator<string[]> {
  for (const [, tokens] of commands_with_env(text)) {
    yield tokens;
  }
}
