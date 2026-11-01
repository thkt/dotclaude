/// <reference types="node" />
// One home for the walk the "no tracked file still names X" tests share: skip docs/decisions/
// and docs/research/ and its legacy roots (historical records, per
// docs/wiki/retire-rename-procedure.md), skip whatever extra path the caller names, read the
// rest, and keep the ones a predicate flags. Same shape as workflows/_lib/tests/_brace.ts
// (small, independently testable, named exports; no .ja mirror, per rules/conventions/MIRROR.md).
//
// offendersAmong is the pure core: it takes the file list and a reader as arguments instead of
// calling `git ls-files` / `readFileSync` itself, so retirement.test.ts drives it with a
// synthetic tree and a reader that fails on demand. trackedFiles is the git-backed list its
// callers hand it, cached per process because the tree does not change while a test file runs.
// assertDetectsAndMisses is the positive control every absence scan pairs with
// (docs/wiki/absence-test-positive-control-fixture.md).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const HISTORICAL_DIRS = [
  "docs/decisions/",
  "docs/research/",
  "research/",
  ".claude/workspace/research/",
];

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

/** Every path `git ls-files` reports under `repoRoot` that is still on disk, in tree order,
 * cached per root. A full-tree sweep takes its files from here rather than walking the
 * filesystem. A walk reads whatever the live ~/.claude checkout grew: gitignored caches
 * (skills/synced/) and runtime directories it cannot scandir (bridge-spawn/, seed-admin/).
 * The on-disk filter drops the index entry a file deleted but not yet staged leaves behind,
 * which a caller reading each path straight hits as ENOENT. offendersAmong skips that path
 * through its own read guard either way. */
export function trackedFiles(repoRoot: string): string[] {
  let files = trackedFilesCache.get(repoRoot);
  if (!files) {
    files = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
      .split("\0")
      .filter((path) => path && existsSync(join(repoRoot, path)));
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
 * path in the failure message. */
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
    `files still naming ${retiredLabel} (decisions and research archives are ` +
      `kept as history, not counted): ${offenders.join(", ")}`,
  );
}
