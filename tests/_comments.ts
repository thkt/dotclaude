export type Comment = { text: string; exempt: boolean };

type CommentKind = "line" | "block" | "hash" | "shebang";
type Span = { kind: CommentKind; start: number; end: number };
type Token = { text: string; next: number; comment?: Span };

const CLOSES_A_VALUE = /[\w$)\]}]/;
const QUOTES = new Set(['"', "'", "`"]);

const opensRegexLiteral = (emitted: string): boolean => {
  for (let k = emitted.length - 1; k >= 0; k--) {
    const ch = emitted[k];
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") continue;
    return !CLOSES_A_VALUE.test(ch);
  }
  return true;
};

const lineEnd = (source: string, i: number): number => {
  const end = source.indexOf("\n", i);
  return end === -1 ? source.length : end;
};

const blockCommentEnd = (source: string, i: number): number => {
  const close = source.indexOf("*/", i + 2);
  return close === -1 ? source.length + 2 : close + 2;
};

const consumeRegexFlags = (source: string, i: number): Token => {
  let next = i;
  while (next < source.length && /[a-z]/i.test(source[next])) next++;
  return { text: source.slice(i, next), next };
};

const consumeRegexLiteral = (source: string, i: number): Token => {
  let text = "/";
  let next = i + 1;
  let inCharClass = false;
  while (next < source.length && source[next] !== "\n") {
    const c = source[next];
    if (c === "\\") {
      text += c + (source[next + 1] ?? "");
      next += 2;
      continue;
    }
    if (c === "[") inCharClass = true;
    else if (c === "]") inCharClass = false;
    else if (c === "/" && !inCharClass) break;
    text += c;
    next++;
  }
  if (source[next] !== "/") return { text, next };
  const flags = consumeRegexFlags(source, next + 1);
  return { text: `${text}/${flags.text}`, next: flags.next };
};

const consumeStringLiteral = (source: string, i: number): Token => {
  const quote = source[i];
  let text = quote;
  let next = i + 1;
  while (next < source.length && source[next] !== quote) {
    if (source[next] === "\\") {
      text += source[next] + (source[next + 1] ?? "");
      next += 2;
      continue;
    }
    text += source[next];
    next++;
  }
  return { text: text + (source[next] ?? ""), next: next + 1 };
};

const scriptToken = (source: string, i: number, emitted: string): Token => {
  const two = source.slice(i, i + 2);
  if (two === "//") {
    const end = lineEnd(source, i);
    return { text: "", next: end, comment: { kind: "line", start: i, end } };
  }
  if (two === "/*") {
    const end = blockCommentEnd(source, i);
    return { text: "", next: end, comment: { kind: "block", start: i, end } };
  }
  if (source[i] === "/" && opensRegexLiteral(emitted)) return consumeRegexLiteral(source, i);
  if (QUOTES.has(source[i])) return consumeStringLiteral(source, i);
  return { text: source[i], next: i + 1 };
};

const scanScript = (source: string): { code: string; spans: Span[] } => {
  const spans: Span[] = [];
  let code = "";
  let i = 0;
  if (source.startsWith("#!")) {
    i = lineEnd(source, 0);
    code = source.slice(0, i);
    spans.push({ kind: "shebang", start: 0, end: i });
  }
  while (i < source.length) {
    const token = scriptToken(source, i, code);
    if (token.comment) spans.push(token.comment);
    code += token.text;
    i = token.next;
  }
  return { code, spans };
};

export const stripComments = (source: string): string => scanScript(source).code;

type Heredoc = { delimiter: string; stripTabs: boolean };

const SHELL_WORD_BREAK = /[\s;&|()<>]/;
const HEREDOC_OPERATOR = /^<<(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\?([A-Za-z_]\w*))/;

const closingQuote = (source: string, i: number, escapes: boolean): number => {
  const quote = source[i];
  let next = i + 1;
  while (next < source.length && source[next] !== quote) {
    next += escapes && source[next] === "\\" ? 2 : 1;
  }
  return next + 1;
};

const readHeredocOperator = (source: string, i: number, pending: Heredoc[]): number => {
  if (source.startsWith("<<<", i)) return i + 3;
  const match = HEREDOC_OPERATOR.exec(source.slice(i, lineEnd(source, i)));
  if (!match) return i + 2;
  pending.push({ delimiter: match[2] ?? match[3] ?? match[4], stripTabs: match[1] === "-" });
  return i + match[0].length;
};

const skipHeredocBody = (source: string, i: number, doc: Heredoc): number => {
  let next = i;
  while (next < source.length) {
    const end = lineEnd(source, next);
    const line = source.slice(next, end);
    next = end + 1;
    if ((doc.stripTabs ? line.replace(/^\t+/, "") : line) === doc.delimiter) break;
  }
  return Math.min(next, source.length);
};

const skipHeredocBodies = (source: string, i: number, docs: Heredoc[]): number =>
  docs.reduce((next, doc) => skipHeredocBody(source, next, doc), i);

const opensShellComment = (source: string, i: number): boolean =>
  source[i] === "#" && (i === 0 || SHELL_WORD_BREAK.test(source[i - 1]));

const shellToken = (source: string, i: number, pending: Heredoc[]): Token => {
  const ch = source[i];
  if (ch === "\n") return { text: "", next: skipHeredocBodies(source, i + 1, pending.splice(0)) };
  if (ch === "\\") return { text: "", next: i + 2 };
  if (ch === "'") return { text: "", next: closingQuote(source, i, false) };
  if (ch === '"') return { text: "", next: closingQuote(source, i, true) };
  if (source.startsWith("<<", i)) return { text: "", next: readHeredocOperator(source, i, pending) };
  if (!opensShellComment(source, i)) return { text: "", next: i + 1 };
  const end = lineEnd(source, i);
  const kind = i === 0 && source.startsWith("#!") ? "shebang" : "hash";
  return { text: "", next: end, comment: { kind, start: i, end } };
};

const scanShell = (source: string): Span[] => {
  const spans: Span[] = [];
  const pending: Heredoc[] = [];
  let i = 0;
  while (i < source.length) {
    const token = shellToken(source, i, pending);
    if (token.comment) spans.push(token.comment);
    i = token.next;
  }
  return spans;
};

const blockText = (raw: string): string => {
  const inner = raw.endsWith("*/") && raw.length >= 4 ? raw.slice(2, -2) : raw.slice(2);
  return inner
    .split("\n")
    .map((line) => line.trim().replace(/^\*+/, "").trim())
    .filter(Boolean)
    .join(" ");
};

const textOf = (kind: CommentKind, raw: string): string => {
  if (kind === "block") return blockText(raw);
  return raw.slice(kind === "hash" ? 1 : 2).trim();
};

const isExempt = (kind: CommentKind, raw: string, text: string): boolean =>
  kind === "shebang" ||
  (kind === "line" && /^\/\/\/\s*<reference/.test(raw)) ||
  /^biome-ignore[\s-]/.test(text) ||
  text.startsWith("oxlint-disable") ||
  (kind === "hash" && /^shellcheck\s/.test(text));

type Piece = { kind: CommentKind; line: number; trailing: boolean; text: string; exempt: boolean };

const lineStarts = (source: string): number[] => {
  const starts = [0];
  for (let i = source.indexOf("\n"); i !== -1; i = source.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
};

const lineIndexOf = (starts: number[], offset: number): number => {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
};

const toPiece = (source: string, starts: number[], span: Span): Piece => {
  const raw = source.slice(span.start, span.end);
  const text = textOf(span.kind, raw);
  const line = lineIndexOf(starts, span.start);
  return {
    kind: span.kind,
    line,
    trailing: source.slice(starts[line], span.start).trim() !== "",
    text,
    exempt: isExempt(span.kind, raw, text),
  };
};

const joinsGroup = (previous: Piece | undefined, piece: Piece): boolean =>
  previous !== undefined &&
  (piece.kind === "line" || piece.kind === "hash") &&
  piece.kind === previous.kind &&
  !piece.trailing &&
  !previous.trailing &&
  !piece.exempt &&
  !previous.exempt &&
  piece.line === previous.line + 1;

const groupPieces = (pieces: Piece[]): Comment[] => {
  const groups: { last: Piece; texts: string[] }[] = [];
  for (const piece of pieces) {
    const current = groups.at(-1);
    if (current && joinsGroup(current.last, piece)) {
      current.texts.push(piece.text);
      current.last = piece;
    } else {
      groups.push({ last: piece, texts: [piece.text] });
    }
  }
  return groups.map(({ last, texts }) => ({
    text: texts.filter(Boolean).join(" "),
    exempt: last.exempt,
  }));
};

export const commentsIn = (path: string, source: string): Comment[] => {
  const spans = path.endsWith(".sh") ? scanShell(source) : scanScript(source).spans;
  const starts = lineStarts(source);
  return groupPieces(spans.map((span) => toPiece(source, starts, span)));
};
