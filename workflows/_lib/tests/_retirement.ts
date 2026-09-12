/// <reference types="node" />
// The retirement-scan helpers shared by the "no tracked file still names X" tests
// (gate-retirement.test.ts, record-retirement.test.ts, ts-harness-retirement.test.ts). Each of
// those files used to carry its own copy of the same walk: skip docs/decisions/ and
// .claude/workspace/research/ (kept as historical record, per docs/wiki/retire-rename-procedure.md),
// skip whatever extra path the caller names, read the rest, and keep the ones a predicate flags.
// This module gives that walk one home, in the same shape as workflows/_lib/tests/_brace.ts
// (small, independently testable, named exports; no .ja mirror, per rules/conventions/MIRROR.md).
//
// offendersAmong is the pure core: it takes the file list and a reader as arguments instead of
// calling `git ls-files` / `readFileSync` itself, so retirement.test.ts drives it with a
// synthetic tree and a reader that fails on demand. trackedFiles is the git-backed list the
// three retirement tests hand it, cached per process because the tree does not change while a
// test file runs. assertDetectsAndMisses is the positive control every absence scan pairs with
// (docs/wiki/absence-test-positive-control-fixture.md).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

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

const trackedFilesCache = new Map<string, string[]>();

/** Every path `git ls-files` reports under `repoRoot`, in tree order, cached per root. */
export function trackedFiles(repoRoot: string): string[] {
  let files = trackedFilesCache.get(repoRoot);
  if (!files) {
    files = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
    trackedFilesCache.set(repoRoot, files);
  }
  return files;
}

/** Positive control for an absence scan: `matches` flags a fixture line carrying the retired
 * name, and stops flagging it once that one cue is replaced. Without it the scan stays green
 * after the needle is mistyped or the predicate is dropped. The fixture is a literal built
 * here, not the scanned constant, so a typo in the constant cannot flow into both sides. */
export function assertDetectsAndMisses(
  matches: (content: string) => boolean,
  retiredName: string,
): void {
  const positiveControl = `# stale doc example: run workflows/${retiredName} < payload.json`;
  assert.equal(
    matches(positiveControl),
    true,
    `positive control (${retiredName}): a fixture line carrying the cue is detected`,
  );
  const masked = positiveControl.replace(retiredName, "REMOVED");
  assert.equal(
    matches(masked),
    false,
    `positive control (${retiredName}): the same line goes undetected once the cue is removed`,
  );
}

/** Runs one retirement test's full body: scans `trackedFiles(repoRoot)` with `offendersAmong`
 * under `extraExclusions`, and asserts the result is empty. `retiredLabel` names the retired
 * path in the failure message. Consolidates the offendersAmong-call-plus-assert.deepEqual glue
 * that gate-retirement.test.ts and ts-harness-retirement.test.ts each still repeat once per
 * retired path. */
export function assertNoResidualReferences(
  repoRoot: string,
  read: (path: string) => string,
  matches: (content: string, path: string) => boolean,
  retiredLabel: string,
  extraExclusions: string[],
): void {
  const offenders = offendersAmong(trackedFiles(repoRoot), read, matches, extraExclusions);
  assert.deepEqual(
    offenders,
    [],
    `files still naming ${retiredLabel} (docs/decisions/ and .claude/workspace/research/ are ` +
      `kept as history, not counted): ${offenders.join(", ")}`,
  );
}
