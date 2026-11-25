/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { offendersAmong, trackedFiles } from "./_tracked-files.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

interface Exclusion {
  readonly path: string;
  readonly kind: "exact" | "prefix";
  readonly reason: string;
}

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
      "Excluded plugins/'s vendored scripts from the TypeScript migration as code " +
      "this repository does not author; this sweep keeps the same boundary",
  },
];

function exclusionPaths(kind: Exclusion["kind"]): string[] {
  return EXCLUSIONS.filter((e) => e.kind === kind).map((e) => e.path);
}

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

const SETTINGS_COMMAND_INVOCATION = /"command"\s*:\s*"[^"]*\bpython3\b[^"]*"/;

const HEREDOC_LAUNCH_INVOCATION = /\bpython3\b[^\n]*<<[-~]?\s*['"]?\w+/;

function invokesPython3(content: string): boolean {
  return (
    isPython3Shebang(firstLine(content)) ||
    SETTINGS_COMMAND_INVOCATION.test(content) ||
    HEREDOC_LAUNCH_INVOCATION.test(content)
  );
}

test(
  "no tracked file outside the exclusions invokes python3 as a hook command, a shebang " +
    "or a heredoc launcher, and the same predicate flags a fixture line for each of the three " +
    "shapes",
  () => {
    assert.equal(
      invokesPython3("# stale doc example: python3 - <<'PY' < payload.json"),
      true,
      "a python3 heredoc launcher must be detected",
    );
    assert.equal(
      invokesPython3("# stale doc example: REMOVED < payload.json"),
      false,
      "the same line without the heredoc launcher must not be detected",
    );

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

    assert.equal(
      invokesPython3(
        '{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"python3 script.py"}]}]}}',
      ),
      true,
      "a settings.json command field naming python3 must be detected",
    );

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
