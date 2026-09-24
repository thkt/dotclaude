// Credential shapes whose prefix or framing makes a false match unlikely. A generic
// high-entropy detector is left out on purpose: it would mask hashes and ids the model
// needs to read.
const PATTERNS: readonly { kind: string; pattern: RegExp }[] = [
  { kind: "private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { kind: "anthropic", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { kind: "openai", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g },
  { kind: "github", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})/g },
  { kind: "aws-access-key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: "slack", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { kind: "google-api", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
];

/** The text with every credential-shaped match replaced, and how many were replaced. */
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

/** The Read result with its text content masked, or null when nothing needed masking. */
export function maskedRead<R extends ReadResult>(result: R): R | null {
  const content = result.file?.content;
  if (result.type !== "text" || typeof content !== "string") return null;
  const { text, count } = redact(content);
  return count === 0 ? null : { ...result, file: { ...result.file, content: text } };
}
