#!/usr/bin/env node
/// <reference types="node" />
// Usage: verify-pr.ts   (PR verification payload JSON on stdin)
//
// Verify against GitHub that the draft pull request the Ship stage reported actually
// exists with the declared head and base, instead of trusting the agent's `pr_url`
// field. build.js returns whatever url the Ship agent hands back; a url string is not
// evidence that a PR was created, that it is a draft, or that it targets the branch
// the build cut.
//
// stdin:  JSON {branch, base_branch, repository, cwd, title}
//   One of repository or cwd is required, so gh knows which repository to ask.
//   repository   "owner/name" of the GitHub repository; omit to let cwd select it
//   branch       the head branch the build pushed
//   base_branch  the base branch the PR must target
//   cwd          optional absolute directory to run gh from
//   title        optional title the PR must carry: the string build.js settled from the
//                issue title. Omitted, the title goes unchecked
//
// stdout: JSON {protocol, verdict, classification, reason_codes, failure_route, blockers,
//   url, is_draft, base_ref_name, head_ref_name, title}
//   verdict is "pass" only when gh returns a PR for the branch and every field matches:
//   isDraft is true, baseRefName is base_branch, headRefName is branch, url is a non-empty
//   string, and title is the given string when one was passed.
// exit 0 on a completed run (read the verdict from JSON). exit 1 on usage / parse error --
// fail-closed: a malformed payload is never reported as a verified PR. A gh failure is a fail
// verdict, not an exit-1: the run completed and the answer is "no".
//
// TypeScript port of the Python PR verifier it replaces. Contract: this CLI's own behavior,
// exercised end to end by workflows/build/tests/verify-pr.test.ts against the frozen fixture
// workflows/build/tests/fixtures/verify-pr-cases.json.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute } from "node:path";
import { parseJson } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

const PROTOCOL = "claude-build-ship/v1";
const FIELDS = "url,isDraft,baseRefName,headRefName,title";

/** A payload validation failure. Its message is written verbatim to stderr -- no prefix --
 * matching the Python verifier's own `fail()`, which just prints the message. */
class Invalid extends Error {}

function fail(message: string): never {
  throw new Invalid(message);
}

/** Mirrors required_string: `payload[key]` trimmed, when it is a non-empty string;
 * otherwise fails with the Python verifier's message. */
function requiredString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${key} must be a non-empty string`);
  }
  return (value as string).trim();
}

/** Mirrors optional_string: absent or null reads as "". Present, it must be a non-empty
 * string. */
function optionalString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${key} must be a non-empty string when present`);
  }
  return (value as string).trim();
}

/** Python's repr() for the handful of JSON value shapes gh's view can carry (string, bool,
 * null) -- used only inside blocker messages, so the fixture's exact wording (`'develop'`,
 * `False`, `None`) is reproduced without pulling in a general-purpose repr library. */
function pyRepr(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") {
    if (value.includes("'") && !value.includes('"')) return `"${value}"`;
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  return String(value);
}

interface ViewPrResult {
  code: number;
  view: Record<string, unknown>;
  stderr: string;
}

/** Spawns `gh pr view <branch> [--repo <repository>] --json <FIELDS>` from `cwd` (the process
 * cwd when null). Mirrors view_pr: stdout that fails to parse as a JSON object (empty output,
 * an error page) reads as `{}` rather than raising, so a gh failure surfaces as blockers on
 * missing fields instead of an unhandled parse error. */
function viewPr(repository: string, branch: string, cwd: string | null): ViewPrResult {
  const scope = repository ? ["--repo", repository] : [];
  const result = spawnSync("gh", ["pr", "view", branch, ...scope, "--json", FIELDS], {
    encoding: "utf8",
    cwd: cwd ?? undefined,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout || "{}");
  } catch {
    parsed = {};
  }
  const view =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return {
    code: result.status === null ? 1 : result.status,
    view,
    stderr: (result.stderr ?? "").trim(),
  };
}

interface VerifyOutput {
  protocol: string;
  verdict: "pass" | "fail";
  classification: string;
  reason_codes: string[];
  failure_route: "blocked" | null;
  blockers: string[];
  url: string | null;
  is_draft: unknown;
  base_ref_name: unknown;
  head_ref_name: unknown;
  title: unknown;
}

/** Verifies against GitHub that the draft PR the payload declares actually exists with the
 * declared head/base/title. Mirrors verify(): validates the payload (throwing Invalid on the
 * five failure conditions required_string/optional_string/the cwd guard can raise), asks gh
 * via view_pr, and folds gh's answer into 0-5 blockers. */
export function verify(payload: unknown): VerifyOutput {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    fail("payload must be a JSON object");
  }
  const record = payload as Record<string, unknown>;
  const repository = optionalString(record, "repository");
  const branch = requiredString(record, "branch");
  const baseBranch = requiredString(record, "base_branch");
  const cwdRaw = record.cwd;
  if (cwdRaw !== undefined && cwdRaw !== null) {
    if (typeof cwdRaw !== "string" || !isAbsolute(cwdRaw)) {
      fail("cwd must be an absolute path when present");
    }
  }
  if (!repository && typeof cwdRaw !== "string") {
    fail("either repository or cwd is required, so gh knows which repository to ask");
  }
  const title = optionalString(record, "title");

  const { code, view, stderr } = viewPr(
    repository,
    branch,
    typeof cwdRaw === "string" ? cwdRaw : null,
  );
  const blockers: string[] = [];
  if (code !== 0) {
    blockers.push(`gh pr view exited ${code}: ${stderr || "no stderr"}`);
  } else {
    if (view.isDraft !== true) {
      blockers.push(`pull request is not a draft (isDraft=${pyRepr(view.isDraft)})`);
    }
    if (view.baseRefName !== baseBranch) {
      blockers.push(
        `base branch is ${pyRepr(view.baseRefName)}, not the declared ${pyRepr(baseBranch)}`,
      );
    }
    if (view.headRefName !== branch) {
      blockers.push(
        `head branch is ${pyRepr(view.headRefName)}, not the declared ${pyRepr(branch)}`,
      );
    }
    if (typeof view.url !== "string" || view.url.trim() === "") {
      blockers.push("pull request carries no url");
    }
    if (title && view.title !== title) {
      blockers.push(
        `pull request title is ${pyRepr(view.title)}, not the declared ${pyRepr(title)}`,
      );
    }
  }

  return {
    protocol: PROTOCOL,
    verdict: blockers.length ? "fail" : "pass",
    classification: blockers.length ? "ship_verification_failed" : "pass",
    reason_codes: blockers.length ? ["ship_verification_failed"] : [],
    failure_route: blockers.length ? "blocked" : null,
    blockers,
    url: blockers.length ? null : ((view.url as string | undefined) ?? null),
    is_draft: view.isDraft ?? null,
    base_ref_name: view.baseRefName ?? null,
    head_ref_name: view.headRefName ?? null,
    title: view.title ?? null,
  };
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const parsed = parseJson(raw);
  if ("error" in parsed) {
    process.stderr.write(`stdin is not valid JSON: ${parsed.error}\n`);
    return 1;
  }
  try {
    const result = verify(parsed.value);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof Invalid) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
