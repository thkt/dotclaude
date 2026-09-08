#!/usr/bin/env node
/// <reference types="node" />
// Usage: diff-files.ts   (diff listing payload JSON on stdin)
//
// Lists the files the build changed since the branch point by asking git, not by having an
// agent replay the steps. build.js's Verify feeds this list into both the scope deviations and
// the untouched plan files, but an agent told to run `git diff <sha>` sometimes swaps the
// baseline for a HEAD it resolved itself. Measured from HEAD after the unit commits, the
// committed implementation files drop out of the list and the PR says the plan files were
// never changed.
//
// stdin:  JSON {repo, base}
//   repo   absolute path of the repository
//   base   the commit to measure from (the branch-point sha, or HEAD when unit commits are off)
//
// stdout: JSON {protocol, files, base, error}
//   files  the union of `git diff <base> --name-only` and `git ls-files --others
//          --exclude-standard`, repo-root-relative, deduplicated, sorted. null when git
//          failed, with its stderr in error; build.js reads null as "the listing was not
//          obtained"
// exit 0 means the run completed (read the result from the JSON). exit 1 is a usage / parse
// error. Fail-closed: a malformed payload is never reported as an empty change list.
//
// TypeScript port of the Python change-listing verifier it replaces. Contract: this CLI's own
// behavior, exercised end to end by workflows/build/tests/diff-files.test.ts against the
// frozen fixture workflows/build/tests/fixtures/diff-files-cases.json.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute } from "node:path";
import { parseJson } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

const PROTOCOL = "claude-build-diff/v1";

/** git exited non-zero. The message is its stderr. */
class GitFailed extends Error {}

/** Turns -z separated stdout into a path list. -z drops the quoting around paths with
 * spaces or non-ASCII names. Throws GitFailed on a non-zero exit, its message the process's
 * stderr (trimmed), falling back to a generic "git <subcommand> exited <code>" when git wrote
 * nothing to stderr. */
function gitPaths(repo: string, args: readonly string[]): string[] {
  const result = spawnSync("git", ["-C", repo, ...args, "-z"], { encoding: "utf8" });
  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").trim();
    throw new GitFailed(stderr || `git ${args[0]} exited ${result.status}`);
  }
  return result.stdout.split("\0").filter((path) => path !== "");
}

/** `payload[key]` trimmed, when it is a non-empty string; otherwise the message the Python
 * verifier's required_string prints when the value is missing, not a string, or blank. */
function requiredString(payload: Record<string, unknown>, key: string): string | { error: string } {
  const value = payload[key];
  if (typeof value !== "string" || value.trim() === "") {
    return { error: `${key} must be a non-empty string` };
  }
  return value.trim();
}

interface ListFilesResult {
  protocol: string;
  files: string[] | null;
  base: string;
  error: string;
}

/** The union of `git diff <base> --name-only` and `git ls-files --others --exclude-standard`
 * against `repo`, repo-root-relative, deduplicated, sorted. `files` is null with git's stderr
 * in `error` when either git invocation fails.
 *
 * The diff between base and the working tree holds committed and uncommitted changes alike.
 * Untracked files never appear in a diff, so ls-files adds them; --exclude-standard applies
 * the same ignore rules as status. */
export function listFiles(repo: string, base: string): ListFilesResult {
  try {
    const changed = gitPaths(repo, ["diff", base, "--name-only"]);
    const untracked = gitPaths(repo, ["ls-files", "--others", "--exclude-standard"]);
    return {
      protocol: PROTOCOL,
      files: [...new Set([...changed, ...untracked])].sort(),
      base,
      error: "",
    };
  } catch (error) {
    if (error instanceof GitFailed) {
      return { protocol: PROTOCOL, files: null, base, error: error.message };
    }
    throw error;
  }
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const parsed = parseJson(raw);
  if ("error" in parsed) {
    process.stderr.write(`stdin is not valid JSON: ${parsed.error}\n`);
    return 1;
  }
  const payload = parsed.value;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    process.stderr.write("payload must be a JSON object\n");
    return 1;
  }
  const record = payload as Record<string, unknown>;
  const repo = requiredString(record, "repo");
  if (typeof repo !== "string") {
    process.stderr.write(`${repo.error}\n`);
    return 1;
  }
  if (!isAbsolute(repo)) {
    process.stderr.write("repo must be an absolute path\n");
    return 1;
  }
  const base = requiredString(record, "base");
  if (typeof base !== "string") {
    process.stderr.write(`${base.error}\n`);
    return 1;
  }

  process.stdout.write(`${JSON.stringify(listFiles(repo, base), null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
