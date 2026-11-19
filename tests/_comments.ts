type Token = { text: string; next: number };

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
  if (two === "//") return { text: "", next: lineEnd(source, i) };
  if (two === "/*") return { text: "", next: blockCommentEnd(source, i) };
  if (source[i] === "/" && opensRegexLiteral(emitted)) return consumeRegexLiteral(source, i);
  if (QUOTES.has(source[i])) return consumeStringLiteral(source, i);
  return { text: source[i], next: i + 1 };
};

export const stripComments = (source: string): string => {
  let i = source.startsWith("#!") ? lineEnd(source, 0) : 0;
  let code = source.slice(0, i);
  while (i < source.length) {
    const token = scriptToken(source, i, code);
    code += token.text;
    i = token.next;
  }
  return code;
};

