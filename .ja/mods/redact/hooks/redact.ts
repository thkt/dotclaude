// 接頭辞や囲みの形から誤一致が起きにくい認証情報の形。汎用の高エントロピー検出は
// 意図して入れない。モデルが読む必要のあるハッシュや id まで伏せてしまうため。
const PATTERNS: readonly { kind: string; pattern: RegExp }[] = [
  { kind: "private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { kind: "anthropic", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { kind: "openai", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g },
  { kind: "github", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})/g },
  { kind: "aws-access-key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: "slack", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { kind: "google-api", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
];

/** 認証情報の形に一致した箇所をすべて置き換えたテキストと、置き換えた件数。 */
export function redact(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const { kind, pattern } of PATTERNS) {
    out = out.replace(pattern, () => {
      count++;
      return `[REDACTED:${kind}]`;
    });
  }
  return { text: out, count };
}

type ReadResult = { type: string; file?: { content?: unknown } };

/** テキスト内容を伏せた Read の結果。伏せる箇所が無ければ null。 */
export function maskedRead<R extends ReadResult>(result: R): R | null {
  const content = result.file?.content;
  if (result.type !== "text" || typeof content !== "string") return null;
  const { text, count } = redact(content);
  return count === 0 ? null : { ...result, file: { ...result.file, content: text } };
}
