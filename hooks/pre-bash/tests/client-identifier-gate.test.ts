/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "client_identifier_gate.ts");
const GUARDED_REPO = path.resolve(HERE, "..", "..", "..");

const TERM = "zzplaceholderclient";
const OTHER_TERM = "qqplaceholderorg";

function makeRepo(at: string): string {
  mkdirSync(at, { recursive: true });
  spawnSync("git", ["init", "-q"], { cwd: at });
  return at;
}

function stage(repo: string, name: string, text: string): void {
  writeFileSync(path.join(repo, name), text);
  spawnSync("git", ["add", name], { cwd: repo });
}

interface Decision {
  hookSpecificOutput?: {
    permissionDecision?: string;
    permissionDecisionReason?: string;
  };
}

function runHook(command: string, cwd: string, listPath: string): Decision | null {
  const payload = JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd });
  const stdout = run(HOOK, payload, {
    ...process.env,
    CLAUDE_CLIENT_NAMES_FILE: listPath,
  });
  return stdout.trim() ? (JSON.parse(stdout) as Decision) : null;
}

function scratchGuardedRepo(prefix: string): { repo: string; hook: string } {
  const repo = realpathSync(mkdtempSync(path.join(tmpdir(), prefix)));
  mkdirSync(path.join(repo, "hooks", "pre-bash"), { recursive: true });
  mkdirSync(path.join(repo, "hooks", "_lib"), { recursive: true });
  const hook = path.join(repo, "hooks", "pre-bash", "client_identifier_gate.ts");
  copyFileSync(HOOK, hook);
  copyFileSync(
    path.join(HERE, "..", "..", "_lib", "hook_payload.ts"),
    path.join(repo, "hooks", "_lib", "hook_payload.ts"),
  );
  spawnSync("git", ["init", "-q"], { cwd: repo });
  spawnSync("git", ["config", "gc.auto", "0"], { cwd: repo });
  return { repo, hook };
}

test("a commit whose added lines carry a listed term is denied with the term and the file named in the reason", () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "client-identifier-gate-hit-"));
  const listPath = path.join(scratch, "client-names.txt");
  writeFileSync(listPath, `# comment\n${TERM}\n\n${OTHER_TERM}\n`);

  const { repo, hook } = scratchGuardedRepo("client-identifier-gate-guarded-");
  const relPath = path.join("docs", "fixture.md");
  mkdirSync(path.join(repo, "docs"), { recursive: true });
  writeFileSync(path.join(repo, relPath), `${TERM.toUpperCase()} appears here\n`);
  spawnSync("git", ["add", relPath], { cwd: repo });

  const payload = JSON.stringify({
    tool_name: "Bash",
    tool_input: { command: "git commit -m x" },
    cwd: repo,
  });
  const stdout = run(hook, payload, { ...process.env, CLAUDE_CLIENT_NAMES_FILE: listPath });
  assert.ok(stdout.trim(), "a staged term must be denied, not passed through");
  const output = JSON.parse(stdout) as Decision;
  assert.equal(output.hookSpecificOutput?.permissionDecision, "deny");
  const reason = output.hookSpecificOutput?.permissionDecisionReason ?? "";
  assert.match(reason, /docs\/fixture\.md/, "the reason must name the file the term is in");
  assert.doesNotMatch(
    reason.toLowerCase(),
    new RegExp(TERM.toLowerCase()),
    "the reason must not echo the raw term",
  );
});

test("a dry-run commit and a commit outside the guarded repository are both allowed", () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "client-identifier-gate-dryrun-"));
  const listPath = path.join(scratch, "client-names.txt");
  writeFileSync(listPath, `# comment\n${TERM}\n\n${OTHER_TERM}\n`);

  const { repo, hook } = scratchGuardedRepo("client-identifier-gate-dryrun-guarded-");
  writeFileSync(path.join(repo, "staged.md"), `${TERM.toUpperCase()} appears here\n`);
  spawnSync("git", ["add", "staged.md"], { cwd: repo });
  const dryRunPayload = JSON.stringify({
    tool_name: "Bash",
    tool_input: { command: "git commit --dry-run -m x" },
    cwd: repo,
  });
  assert.equal(
    run(hook, dryRunPayload, { ...process.env, CLAUDE_CLIENT_NAMES_FILE: listPath }),
    "",
    "--dry-run must pass the commit through unexamined",
  );

  const outside = makeRepo(path.join(scratch, "other"));
  stage(outside, "a.md", `${TERM} is here\n`);
  const outsideResult = runHook("git commit -m x", outside, listPath);
  assert.equal(
    outsideResult,
    null,
    "a commit in a repository other than GUARDED_REPO must pass through even with a term staged",
  );
});

test("an unreadable term list and a git call that fails leave the commit allowed rather than denying on a guess", () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "client-identifier-gate-fail-"));

  const missingList = path.join(scratch, "missing.txt");
  const absentListResult = runHook("git commit -m x", GUARDED_REPO, missingList);
  assert.equal(
    absentListResult,
    null,
    "an unreadable term list must disable the gate rather than deny on an empty read",
  );

  const listPath = path.join(scratch, "client-names.txt");
  writeFileSync(listPath, `# comment\n${TERM}\n\n${OTHER_TERM}\n`);
  const loose = path.join(scratch, "loose");
  mkdirSync(loose, { recursive: true });
  const noWorkTreeResult = runHook("git commit -m x", loose, listPath);
  assert.equal(
    noWorkTreeResult,
    null,
    "a cwd outside any git work tree must pass through rather than be guessed as the guarded repo",
  );
});
