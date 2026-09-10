/// <reference types="node" />
// Ports hooks/pre-bash/tests/client_identifier_gate_test.py's nine observations to
// client_identifier_gate.ts's side (unit U-003), folded into the plan's three scenarios the way
// hooks/lifecycle/tests/recall-index.test.ts folds the retired Python hook test's five cases
// into four. Every scenario spawns the hook (run(), from _hook-harness.ts) rather than
// importing client_identifier_gate.ts in-process: the module carries a top-level
// `process.exit(main())` (DR-0114, no isMainModule guard), so an in-process import would run
// main() and exit the test runner's own process the moment the import ran -- the same hazard
// git-sandbox-guard.test.ts and npm-install-guard.test.ts avoid the same way.
//
// GUARDED_REPO is this repository (fixed, not overridable -- see client_identifier_gate.py's
// docstring), so T-296 stages its fixture directly here rather than in a scratch repository,
// the way the Python test's own comment says the deny path "has to be exercised against it".
// The stage is undone in a finally block: `git add` then `git reset` never touches HEAD or
// history, only the index, so the repository is left exactly as clean as it started.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "client_identifier_gate.ts");
// hooks/pre-bash/tests -> hooks/pre-bash -> hooks -> repo root, the same three levels
// client_identifier_gate_test.py's GUARDED_REPO climbs from its own file.
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

/** The hook's decision for one command, or null for a run that denied nothing -- mirrors the
 * Python test's run_hook + json.loads(stdout) pairing. */
function runHook(command: string, cwd: string, listPath: string): Decision | null {
  const payload = JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd });
  const stdout = run(HOOK, payload, {
    ...process.env,
    CLAUDE_CLIENT_NAMES_FILE: listPath,
  });
  return stdout.trim() ? (JSON.parse(stdout) as Decision) : null;
}

test("T-296 a commit whose added lines carry a listed term is denied with the term and the file named in the reason", () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "client-identifier-gate-hit-"));
  const listPath = path.join(scratch, "client-names.txt");
  writeFileSync(listPath, `# comment\n${TERM}\n\n${OTHER_TERM}\n`);

  // A fixture written directly into GUARDED_REPO (this checkout): the guarded repository is
  // fixed and not overridable, so the deny path can only be exercised here. The term is
  // uppercased to also cover the case-insensitive match the Python original relies on.
  const relPath = "client-identifier-gate-test-fixture.md";
  const absPath = path.join(GUARDED_REPO, relPath);
  writeFileSync(absPath, `${TERM.toUpperCase()} appears here\n`);
  spawnSync("git", ["add", relPath], { cwd: GUARDED_REPO });
  try {
    const out = runHook("git commit -m x", GUARDED_REPO, listPath);
    assert.ok(out, "a staged term must be denied, not passed through");
    const output = out as Decision;
    assert.equal(output.hookSpecificOutput?.permissionDecision, "deny");
    const reason = output.hookSpecificOutput?.permissionDecisionReason ?? "";
    assert.match(reason, new RegExp(relPath), "the reason must name the file the term is in");
    assert.doesNotMatch(
      reason.toLowerCase(),
      new RegExp(TERM.toLowerCase()),
      "the reason must not echo the raw term",
    );
  } finally {
    spawnSync("git", ["reset", "--", relPath], { cwd: GUARDED_REPO });
    rmSync(absPath, { force: true });
  }
});

test("T-297 a dry-run commit and a commit outside the guarded repository are both allowed", () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "client-identifier-gate-dryrun-"));
  const listPath = path.join(scratch, "client-names.txt");
  writeFileSync(listPath, `# comment\n${TERM}\n\n${OTHER_TERM}\n`);

  const dryRun = runHook("git commit --dry-run -m x", GUARDED_REPO, listPath);
  assert.equal(dryRun, null, "--dry-run must pass the commit through unexamined");

  const outside = makeRepo(path.join(scratch, "other"));
  stage(outside, "a.md", `${TERM} is here\n`);
  const outsideResult = runHook("git commit -m x", outside, listPath);
  assert.equal(
    outsideResult,
    null,
    "a commit in a repository other than GUARDED_REPO must pass through even with a term staged",
  );
});

test("T-298 an unreadable term list and a git call that fails leave the commit allowed rather than denying on a guess", () => {
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
