/// <reference types="node" />
// Full-hook coverage for git_sandbox_guard.ts's probe (unit U-008: PROBE_TIMEOUT_SECONDS,
// UNRESOLVED_PROBE, the rev-parse call inside _toplevel) now that main() (U-009) wires it end
// to end. Spawned through _hook-harness.ts's run rather than imported: the module carries a
// top-level `process.exit(main())` (DR-0114, no isMainModule guard), and main() reads stdin
// synchronously, so importing it in-process hangs the test runner on its own open stdin -- the
// same reason npm-install-guard.test.ts and rm-to-trash.test.ts only ever spawn their hook.
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { denyReason, fixtureRepo, run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "git_sandbox_guard.ts");
const PROBE_TIMEOUT_SECONDS = 10; // git_sandbox_guard.ts's own PROBE_TIMEOUT_SECONDS

function runHook(command: string, cwd: string, env: NodeJS.ProcessEnv): string {
  return run(HOOK, { tool_name: "Bash", cwd, tool_input: { command } }, env);
}

test("T-288 a probe that does not answer within the timeout is denied with the unresolved-probe reason, driven by a git stub that sleeps", () => {
  const shimDir = mkdtempSync(path.join(tmpdir(), "git-sandbox-guard-probe-shim-"));
  const stub = path.join(shimDir, "git");
  writeFileSync(stub, "#!/bin/sh\nsleep 60\n");
  chmodSync(stub, 0o755);

  // PATH, not a patched constant: the bound has to hold around the real subprocess call, the
  // same reasoning the retired Python test's test_a_probe_that_never_answers_is_fail_closed
  // (T-030) used.
  const env = { ...process.env, PATH: `${shimDir}:${process.env.PATH ?? ""}` };
  const started = Date.now();

  // A rewriting subcommand, so main() forks the probe at all before it can stall.
  const reason = denyReason(runHook("git checkout main", process.cwd(), env));
  const elapsedSeconds = (Date.now() - started) / 1000;

  assert.ok(reason, "a stalled probe must be denied rather than let the call through");
  assert.ok(
    (reason as string).startsWith("git-sandbox-guard: この呼び出しがどのリポジトリへ届くかを判定できない。"),
    "the deny reason must carry the unresolved-probe prefix",
  );
  assert.ok(
    elapsedSeconds < PROBE_TIMEOUT_SECONDS + 30,
    `the probe must bound its wait near PROBE_TIMEOUT_SECONDS (${PROBE_TIMEOUT_SECONDS}s), took ${elapsedSeconds}s`,
  );
});

test("T-289 a directory that is not a repository is allowed and one reached through GIT_DIR/GIT_WORK_TREE under the sandbox is denied", () => {
  const outside = mkdtempSync(path.join(tmpdir(), "git-sandbox-guard-probe-outside-"));
  assert.equal(
    denyReason(runHook("git checkout main", outside, { ...process.env, CLAUDE_CONFIG_DIR: outside })),
    null,
    "a directory outside any repository must probe to no target, so the call is allowed",
  );

  // GIT_DIR / GIT_WORK_TREE carry the call into the guarded repository the same way the -C /
  // --git-dir / --work-tree flags do (git_sandbox_guard.ts's GIT_ENV), from a cwd that is not
  // that repository itself.
  const guarded = fixtureRepo("git-sandbox-guard-probe-repo-");
  const elsewhere = mkdtempSync(path.join(tmpdir(), "git-sandbox-guard-probe-elsewhere-"));
  const command = `GIT_DIR=${guarded}/.git GIT_WORK_TREE=${guarded} git checkout main`;
  const reason = denyReason(
    runHook(command, elsewhere, { ...process.env, CLAUDE_CONFIG_DIR: guarded }),
  );
  assert.ok(
    reason,
    "GIT_DIR/GIT_WORK_TREE must redirect the probe into the guarded repository, so the call is denied",
  );
});
