/// <reference types="node" />
// Ports hooks/_lib/tests/japanese_test.py's Threshold / CharacterClass suites to the .ts side
// (DR-0112). Each python test pairs a passing case with its failing neighbor; this file keeps
// that pairing inside one T-NNN test per test scenario rather than splitting further, since a
// scaffold that only fails the first assertion in a group can otherwise slip a wrong answer
// through the rest.
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_THRESHOLD, hasJapanese } from "../japanese.ts";

test("T-236 a count at the threshold passes and one below the threshold fails", () => {
  assert.equal(hasJapanese("あ".repeat(10), 10), true, "a count at the threshold must pass");
  assert.equal(
    hasJapanese("あ".repeat(9), 10),
    false,
    "a count one below the threshold must fail",
  );
});

test("T-237 no threshold and a null threshold both take the default of 50", () => {
  assert.equal(
    hasJapanese("あ".repeat(DEFAULT_THRESHOLD)),
    true,
    "an omitted threshold takes the default",
  );
  assert.equal(
    hasJapanese("あ".repeat(DEFAULT_THRESHOLD - 1)),
    false,
    "one below the default fails when the threshold is omitted",
  );
  assert.equal(
    hasJapanese("あ".repeat(DEFAULT_THRESHOLD), null),
    true,
    "a null threshold takes the default the same way an omitted one does",
  );
});

test("T-238 hiragana, katakana, the long-vowel mark, and CJK ideographs each count toward the threshold", () => {
  assert.equal(
    hasJapanese("English text with 保 in it", 1),
    true,
    "a single CJK ideograph clears a threshold of 1",
  );
  assert.equal(
    hasJapanese("English text only", 1),
    false,
    "no Japanese character at all stays below a threshold of 1",
  );
  assert.equal(
    hasJapanese("ひらがな" + "カタカナ" + "漢字" + "ー", 1),
    true,
    "hiragana, katakana, kanji, and the long-vowel mark all count",
  );
});

test("T-239 punctuation alone, English letters, and digits do not count", () => {
  assert.equal(
    hasJapanese("、。！？（）「」".repeat(20), 1),
    false,
    "a line of Japanese punctuation alone carries no words",
  );
  assert.equal(
    hasJapanese("The quick brown fox 12345".repeat(10), 1),
    false,
    "English letters and digits do not count as Japanese",
  );
});
