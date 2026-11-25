/// <reference types="node" />

const JAPANESE: RegExp = /[ぁ-んァ-ヶー一-龥]/g;

export const DEFAULT_THRESHOLD: number = 50;

export function hasJapanese(text: string, threshold?: number | null): boolean {
  const count = (text.match(JAPANESE) ?? []).length;
  return count >= (threshold ?? DEFAULT_THRESHOLD);
}
