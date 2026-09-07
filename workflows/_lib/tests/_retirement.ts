/// <reference types="node" />
// The retirement-scan core shared by the "no tracked file still names X" tests
// (gate-retirement.test.ts, record-retirement.test.ts, and -- from a later unit --
// ts-harness-retirement.test.ts). Each of those files carries its own copy of the same walk:
// skip docs/decisions/ and .claude/workspace/research/ (kept as historical record, per
// docs/wiki/retire-rename-procedure.md), skip whatever extra path the caller names, read the
// rest, and keep the ones a predicate flags. This module gives that walk one home, in the same
// shape as workflows/_lib/tests/_brace.ts (small, independently testable, named exports; no
// .ja mirror, per rules/conventions/MIRROR.md -- tests stay English-only).
//
// offendersAmong is the pure core: it takes the file list and a reader as arguments instead of
// calling `git ls-files` / `readFileSync` itself, so a caller test can drive it with a
// synthetic tree and a reader that fails on demand instead of depending on this repository's
// real tree (workflows/_lib/tests/retirement.test.ts's T-120-T-122 do exactly that).
// gate-retirement.test.ts and ts-harness-retirement.test.ts are its git-backed callers;
// record-retirement.test.ts still carries its own copy of this walk and migrates to it in a
// later unit.

const HISTORICAL_DIRS = ["docs/decisions/", ".claude/workspace/research/"];

function isHistorical(path: string): boolean {
  return HISTORICAL_DIRS.some((dir) => path.startsWith(dir));
}

/** The subset of `files` whose content `matches` flags, walked in `files` order and skipping
 * a historical path, a path in `extraExclusions`, or a path `read` cannot read. */
export function offendersAmong(
  files: string[],
  read: (path: string) => string,
  matches: (content: string, path: string) => boolean,
  extraExclusions: string[] = [],
): string[] {
  const offenders: string[] = [];
  for (const path of files) {
    if (isHistorical(path) || extraExclusions.includes(path)) continue;

    let content: string;
    try {
      content = read(path);
    } catch {
      // File is not decodable as text, skip it without aborting the scan
      continue;
    }

    if (matches(content, path)) offenders.push(path);
  }
  return offenders;
}
