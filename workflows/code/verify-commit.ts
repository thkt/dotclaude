#!/usr/bin/env node
/// <reference types="node" />
// Usage: verify-commit.ts   (commit postcondition payload JSON on stdin)
//
// TypeScript port of the Python commit verifier it replaces: verify against Git that a unit
// commit landed as the workflow declared it, instead of trusting the commit agent's
// self-report.
//
// stdin: JSON {repo, baseline_head, unit_files, body}
//   repo           absolute path to the repository
//   baseline_head  the commit sha HEAD pointed at before the unit commit
//   unit_files     repo-root-relative paths the unit is allowed to commit
//   body           the block that must follow the subject verbatim (goal + trailers)
//
// stdout: JSON {verdict, classification, reason_codes, failure_route, blockers, ...}
//   verdict is pass only when every check below holds:
//     - HEAD moved off baseline_head, so a commit exists
//     - HEAD's first parent is baseline_head, so exactly one commit landed on the verified
//       head rather than a chain that swept up unrelated work
//     - the committed paths are non-empty and all listed in unit_files
//     - the message is the subject, one blank line, then body verbatim
//     - the subject keeps the Conventional Commits shape the prompt asked for
// exit 0 on a completed run (read the verdict from JSON). exit 1 on usage / parse error --
// fail-closed: a malformed payload is never reported as a verified commit.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

const PROTOCOL = "claude-code-commit/v1";
const SUBJECT_MAX = 72;
export const COMMIT_TYPES = [
  "feat",
  "fix",
  "refactor",
  "docs",
  "test",
  "chore",
  "perf",
  "style",
  "ci",
] as const;
const SUBJECT_SHAPE = new RegExp(`^(?:${COMMIT_TYPES.join("|")})(?:\\([^()]+\\))?!?: \\S.*$`);

/** A payload the verifier refuses. verify() is exported and directly tested, so it raises
 * rather than ending the process the way the Python fail() it replaces did; main() is the one
 * place that turns this into the stderr line and exit 1 the CLI contract names. */
class PayloadError extends Error {}

function fail(message: string): never {
  throw new PayloadError(message);
}

/** Runs `git -C repo <args>`, returning the exit status and stdout. Uses spawnSync rather than
 * execFileSync: `HEAD^` on a root commit exits 128, and execFileSync throws on a non-zero
 * status where this needs the status alongside the output. */
function git(repo: string, args: readonly string[]): { status: number; stdout: string } {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  return { status: result.status ?? 1, stdout: result.stdout };
}

function gitText(repo: string, args: readonly string[]): string | null {
  const { status, stdout } = git(repo, args);
  return status === 0 ? stdout.trim() : null;
}

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item === "")) {
    fail(`${label} must be an array of non-empty strings`);
  }
  return (value as unknown[]).map((item) => String(item));
}

/** Without --root a first commit reports no paths at all. */
function committedPaths(repo: string): string[] | null {
  const { status, stdout } = git(repo, [
    "diff-tree",
    "--root",
    "--no-commit-id",
    "--name-only",
    "-r",
    "-z",
    "HEAD",
  ]);
  if (status !== 0) return null;
  return stdout
    .split("\0")
    .filter((path) => path)
    .sort();
}

function subjectBlockers(subject: string): string[] {
  const blockers: string[] = [];
  if (subject.length > SUBJECT_MAX) {
    blockers.push(`subject is ${subject.length} characters, over the ${SUBJECT_MAX} limit`);
  }
  if (subject.endsWith(".")) {
    blockers.push("subject ends with a period");
  }
  if (!SUBJECT_SHAPE.test(subject)) {
    blockers.push("subject is not in <type>(<scope>): <description> form");
  }
  return blockers;
}

/** Runs the same five postcondition checks the Python verify() it replaces used to run and
 * returns the same report shape, in the same key order. */
export function verify(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    fail("payload must be a JSON object");
  }
  const record = payload as Record<string, unknown>;
  const repo = record.repo;
  const baselineHead = record.baseline_head;
  const body = record.body;
  if (typeof repo !== "string" || !isAbsolute(repo)) {
    fail("repo must be an absolute path");
  }
  if (typeof baselineHead !== "string" || !baselineHead.trim()) {
    fail("baseline_head must be a non-empty string");
  }
  if (typeof body !== "string" || !body.trim()) {
    fail("body must be a non-empty string");
  }
  const unitFiles = new Set(strings(record.unit_files, "unit_files"));
  if (unitFiles.size === 0) {
    fail("unit_files must not be empty");
  }

  const blockers: string[] = [];
  const head = gitText(repo, ["rev-parse", "HEAD"]);
  if (head === null) {
    fail("repo is not a readable Git worktree");
  }
  const parent = gitText(repo, ["rev-parse", "HEAD^"]);
  const paths = committedPaths(repo);
  const message = gitText(repo, ["show", "-s", "--format=%B", "HEAD"]);
  const subject = (message ?? "").split("\n", 1)[0];

  if (head === baselineHead) {
    blockers.push("HEAD did not move, so no commit was created");
  } else if (parent === null) {
    blockers.push("HEAD has no parent, so it did not land on the verified baseline");
  } else if (parent !== baselineHead) {
    blockers.push(
      `HEAD's parent is ${parent}, not the verified baseline ${baselineHead}; ` +
        "exactly one commit must land on it",
    );
  }

  let outside: string[] = [];
  if (paths === null) {
    blockers.push("the committed paths could not be read");
  } else if (paths.length === 0) {
    blockers.push("the commit is empty");
  } else {
    outside = paths.filter((path) => !unitFiles.has(path));
    if (outside.length > 0) {
      blockers.push(`committed paths outside the unit scope: ${outside.join(", ")}`);
    }
  }

  if (message === null) {
    blockers.push("the commit message could not be read");
  } else {
    const expected = `${subject}\n\n${body}`.trim();
    if (message.trim() !== expected) {
      blockers.push("the commit message body does not match the declared block verbatim");
    }
    blockers.push(...subjectBlockers(subject));
  }

  return {
    protocol: PROTOCOL,
    verdict: blockers.length ? "fail" : "pass",
    classification: blockers.length ? "commit_postcondition_failed" : "pass",
    reason_codes: blockers.length ? ["commit_postcondition_failed"] : [],
    failure_route: blockers.length ? "blocked" : null,
    blockers,
    head,
    parent,
    committed_files: paths ?? [],
    outside_scope: outside,
    subject,
  };
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    process.stderr.write(
      `stdin is not valid JSON: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }
  let report: Record<string, unknown>;
  try {
    report = verify(payload);
  } catch (error) {
    if (!(error instanceof PayloadError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
