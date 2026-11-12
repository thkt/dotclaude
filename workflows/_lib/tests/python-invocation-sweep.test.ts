/// <reference types="node" />
// DR-0112's TypeScript migration left one shell hook launching python3, the herdr integration
// script DR-0117 excluded. DR-0123 removed that script with the rest of the herdr hook
// integration, so no tracked file launches python3. This file guards that state going forward:
// no tracked file picks python3 back up.
//
// The needle is not the bare word "python3" (docs, comments and error messages name it freely,
// as this very file's header does above), but three invocation shapes: settings.json's
// `command` field naming python3, a file's own first-line shebang, and a shell heredoc launched
// right after the python3 token (`python3 - <<'PY' ... PY`). A file merely mentioning python3
// in prose matches none of these and stays unflagged -- the negative control inside T-461
// checks exactly that.
//
// Same shape as workflows/_lib/tests/gate-retirement.test.ts's T-014 and
// skills/_lib/tests/standalone-scripts-retirement.test.ts's T-187: offendersAmong/trackedFiles/
// assertDetectsAndMisses from workflows/_lib/tests/_retirement.ts drive a full-tree scan. The
// extra exclusions here are wider than those two files' single SELF_PATH: plugins/ (DR-0112's
// own vendored-scripts boundary) joins it, named with its reason in EXCLUSIONS below rather
// than as a bare literal in the test body.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

interface Exclusion {
  readonly path: string;
  readonly kind: "exact" | "prefix";
  readonly reason: string;
}

// The exclusions this sweep adds on top of offendersAmong's own historical-directory default
// (docs/decisions/, docs/research/). Each carries the reason it is excluded so the
// list reads on its own instead of sending a reader to git blame or the DR.
const EXCLUSIONS: readonly Exclusion[] = [
  {
    path: SELF_PATH,
    kind: "exact",
    reason:
      "this file names python3's shebang, settings.json command and heredoc-launch shapes " +
      "in its own fixtures and comments to describe what it checks",
  },
  {
    path: "plugins/",
    kind: "prefix",
    reason:
      "DR-0112 excluded plugins/'s vendored scripts from the TypeScript migration as code " +
      "this repository does not author; this sweep keeps the same boundary",
  },
];

// The shape EXCLUSIONS.filter(kind).map(path) repeats for "exact" and "prefix", each read at
// two call sites below (the sweep itself and T-462's trace-back check), so it is factored to one
// function taking the kind rather than two near-identical filter/map pairs.
function exclusionPaths(kind: Exclusion["kind"]): string[] {
  return EXCLUSIONS.filter((e) => e.kind === kind).map((e) => e.path);
}

// offendersAmong's own extraExclusions only matches a path exactly, so a directory-shaped
// exclusion (plugins/) is applied here, ahead of the call, instead of inside it.
function sweepCandidates(): string[] {
  const prefixes = exclusionPaths("prefix");
  return trackedFiles(REPO_ROOT).filter(
    (path) => !prefixes.some((prefix) => path.startsWith(prefix)),
  );
}

function firstLine(content: string): string {
  return content.split(/\r?\n/, 1)[0] ?? "";
}

function isPython3Shebang(line: string): boolean {
  return /^#!.*\bpython3\b/.test(line);
}

// A `command` string value naming python3, the shape settings.json's hooks entries and any
// settings-shaped fixture use.
const SETTINGS_COMMAND_INVOCATION = /"command"\s*:\s*"[^"]*\bpython3\b[^"]*"/;

// python3 followed, on the same line, by a heredoc redirection, such as `python3 - <<'PY'`.
const HEREDOC_LAUNCH_INVOCATION = /\bpython3\b[^\n]*<<[-~]?\s*['"]?\w+/;

function invokesPython3(content: string): boolean {
  return (
    isPython3Shebang(firstLine(content)) ||
    SETTINGS_COMMAND_INVOCATION.test(content) ||
    HEREDOC_LAUNCH_INVOCATION.test(content)
  );
}

test(
  "T-461 no tracked file outside the exclusions invokes python3 as a hook command, a shebang " +
    "or a heredoc launcher, and the same predicate flags a fixture line for each of the three " +
    "shapes",
  () => {
    // Heredoc-launch positive control, driven through the shared helper the way T-014 and
    // T-187 drive theirs: the whole launch token is the retiredName, so the masked line loses
    // both "python3" and "<<" together, and detects -> misses in one round trip.
    assertDetectsAndMisses(invokesPython3, "python3 - <<'PY'");

    // Shebang positive control, built as a literal first line rather than derived from
    // isPython3Shebang's own regex, so a typo in the regex cannot agree with itself.
    assert.equal(
      invokesPython3("#!/usr/bin/env python3\nprint('hi')\n"),
      true,
      "a python3 shebang on a file's first line must be detected",
    );
    assert.equal(
      invokesPython3("# example\n#!/usr/bin/env python3\n"),
      false,
      "a python3 shebang line that is not the file's first line must not be detected",
    );

    // settings.json command positive control, built as a literal JSON snippet rather than
    // derived from SETTINGS_COMMAND_INVOCATION's own regex.
    assert.equal(
      invokesPython3(
        '{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"python3 script.py"}]}]}}',
      ),
      true,
      "a settings.json command field naming python3 must be detected",
    );

    // Negative control central to this unit's contract: a bare mention of python3 in prose,
    // matching none of the three shapes, must not be flagged.
    assert.equal(
      invokesPython3("this doc explains why python3 is no longer invoked from this hook"),
      false,
      "a bare mention of python3 outside the three invocation shapes must not be detected",
    );

    const offenders = offendersAmong(
      sweepCandidates(),
      (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
      invokesPython3,
      exclusionPaths("exact"),
    );
    assert.deepEqual(
      offenders,
      [],
      "files still invoking python3 as a hook command, a shebang or a heredoc launcher " +
        `(docs/decisions/, docs/research/ and EXCLUSIONS's paths are excluded): ` +
        offenders.join(", "),
    );
  },
);

test(
  "T-462 the exclusion list names each excluded path with the reason it is excluded, read " +
    "from the test's own constant rather than restated",
  () => {
    assert.deepEqual(
      EXCLUSIONS.map((e) => e.path),
      [SELF_PATH, "plugins/"],
      "EXCLUSIONS must name exactly these two excluded paths, in this order",
    );
    for (const { path, reason } of EXCLUSIONS) {
      assert.ok(reason.trim().length > 0, `EXCLUSIONS entry for ${path} must carry a reason`);
    }
    // T-461's sweep must consume this constant rather than a separately typed exclusion list:
    // confirm the exact-match and prefix exclusions it actually passed to
    // offendersAmong/sweepCandidates trace back to EXCLUSIONS.
    assert.deepEqual(
      exclusionPaths("exact"),
      [SELF_PATH],
      "the sweep's exact-match exclusions must be read from EXCLUSIONS, not restated",
    );
    assert.deepEqual(
      exclusionPaths("prefix"),
      ["plugins/"],
      "the sweep's prefix exclusion must be read from EXCLUSIONS, not restated",
    );
  },
);
