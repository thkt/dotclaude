import assert from "node:assert/strict";
import test from "node:test";

import { maskedRead, redact } from "../mods/redact/hooks/redact.ts";

const KEYS = {
  anthropic: "sk-ant-api03-" + "a".repeat(40),
  github: "ghp_" + "b".repeat(36),
  "aws-access-key": "AKIA" + "C".repeat(16),
};

test("each credential shape is replaced by a marker naming its kind", () => {
  for (const [kind, key] of Object.entries(KEYS)) {
    const { text, count } = redact(`KEY=${key}\n`);
    assert.equal(text, `KEY=[REDACTED:${kind}]\n`);
    assert.equal(count, 1);
  }
});

test("a private key block is masked from BEGIN to END", () => {
  const pem = "-----BEGIN OPENSSH PRIVATE KEY-----\nabc\ndef\n-----END OPENSSH PRIVATE KEY-----";
  assert.equal(redact(`x\n${pem}\ny`).text, "x\n[REDACTED:private-key]\ny");
});

test("text with no credential shape, including hashes and short sk- words, comes back unchanged", () => {
  const text = "sha256 853e01036b7c8ca63d98197ac07c0fb2a3b093f70be0469867fd6ee3a7440d24\nsk-learn task-id\n";
  assert.deepEqual(redact(text), { text, count: 0 });
});

test("maskedRead returns null when nothing is masked, so the hook passes core's result through", () => {
  assert.equal(maskedRead({ type: "text", file: { content: "plain" } }), null);
  assert.equal(maskedRead({ type: "image", file: { content: KEYS.github } }), null);
});

test("maskedRead keeps every other field of the Read result and masks only the content", () => {
  const result = { type: "text", file: { filePath: "/r/.env", content: `T=${KEYS.github}`, numLines: 1 } };
  assert.deepEqual(maskedRead(result), {
    type: "text",
    file: { filePath: "/r/.env", content: "T=[REDACTED:github]", numLines: 1 },
  });
});
