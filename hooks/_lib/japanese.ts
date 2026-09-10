/// <reference types="node" />
// Japanese detection shared by the hooks that treat Japanese prose differently. The TypeScript
// side of hooks/_lib/japanese.py (DR-0112's TypeScript migration); japanese.py stays in the tree
// because hooks/pre-bash/body_proofread.py and hooks/edit/textlint_fix.py still import it
// directly, so both live side by side until every caller moves over.
//
// Callers pick the threshold: mirror_prose_guard asks whether a single character survives,
// textlint asks whether the text is Japanese enough for Japanese-only rules to apply.

/** Hiragana, katakana, the long-vowel mark, and CJK ideographs. Punctuation stays out: a line
 * holding only 、。 carries no words. Global so a single hasJapanese call can count every match
 * in the text rather than only the first. */
export const JAPANESE: RegExp = /[ぁ-んァ-ヶー一-龥]/g;

/** A stray Japanese noun in an English page does not make the page Japanese. */
export const DEFAULT_THRESHOLD: number = 50;

/** null or undefined takes the default, so a caller holding an optional threshold passes it
 * as is -- the same contract japanese.py's has_japanese states for None. */
export function hasJapanese(text: string, threshold?: number | null): boolean {
  const count = (text.match(JAPANESE) ?? []).length;
  return count >= (threshold ?? DEFAULT_THRESHOLD);
}
