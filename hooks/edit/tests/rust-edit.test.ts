/// <reference types="node" />
// Unit U-003: hooks/edit/rust_pre_edit.ts and hooks/edit/rust_post_edit.ts both compose
// hooks/_lib/rust_target.ts's target/fmt/clippyOutput, which is why the plan folds
// hooks/edit/tests/rust_edit_test.py's two-hook coverage into this one test file. cargo is
// replaced by a stub on PATH exactly as rust_edit_test.py's STUB_CARGO and
// hooks/_lib/tests/rust-target.test.ts's installStubCargo do: the assertions read what the
// hooks do with the stub's clippy output, not a real crate.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRE = path.join(HERE, "..", "rust_pre_edit.ts");
const POST = path.join(HERE, "..", "rust_post_edit.ts");

// Records the subcommand it was called with, and (unless CARGO_SILENT) prints one finding
// naming the edited file -- the smallest stub that lets both the "reports" and the "stays
// silent when there are none" halves of each scenario run. Mirrors rust_edit_test.py's
// STUB_CARGO.
const STUB_CARGO = `#!/bin/sh
echo "$1" >> "$CARGO_CALLS"
[ "$1" = "clippy" ] || exit 0
[ -n "$CARGO_SILENT" ] && exit 0
echo "src/lib.rs:9:1: warning: this looks like the edited file"
exit 0
`;

interface Fixture {
  repo: string;
  env: NodeJS.ProcessEnv;
}

function fixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), "rust-edit-tests-"));
  const repo = path.join(root, "repo");
  mkdirSync(path.join(repo, "src"), { recursive: true });
  execFileSync("git", ["-C", repo, "init", "-q"], { stdio: "ignore" });
  writeFileSync(path.join(repo, "src", "lib.rs"), "");
  writeFileSync(path.join(repo, "README.md"), "");

  const binDir = path.join(root, "bin");
  mkdirSync(binDir);
  const stub = path.join(binDir, "cargo");
  writeFileSync(stub, STUB_CARGO);
  chmodSync(stub, 0o755);

  const calls = path.join(root, "calls");
  writeFileSync(calls, "");

  return {
    repo,
    env: {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      CARGO_CALLS: calls,
    },
  };
}

function runHook(
  hook: string,
  f: Fixture,
  filePath: string,
  extraEnv: NodeJS.ProcessEnv = {},
): string {
  const payload = { tool_name: "Edit", tool_input: { file_path: filePath } };
  return run(hook, payload, { ...f.env, ...extraEnv });
}

test("T-381 the pre-edit hook reports the target it resolves for a .rs path and stays silent for another extension", () => {
  const f = fixture();

  const rustOut = runHook(PRE, f, path.join(f.repo, "src", "lib.rs"));
  assert.ok(rustOut, "a .rs edit must report the target it resolved, but the hook stayed silent");
  const parsed = JSON.parse(rustOut) as {
    hookSpecificOutput: { hookEventName: string; additionalContext: string };
  };
  assert.equal(parsed.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.match(
    parsed.hookSpecificOutput.additionalContext,
    /src\/lib\.rs/,
    "the resolved target's own finding must reach the report",
  );

  const otherOut = runHook(PRE, f, path.join(f.repo, "README.md"));
  assert.equal(otherOut, "", "an edit to a non-.rs path must stay silent");
});

test("T-382 the post-edit hook reports clippy findings for an edited .rs file and stays silent when there are none", () => {
  const f = fixture();

  const withFindings = runHook(POST, f, path.join(f.repo, "src", "lib.rs"));
  assert.ok(
    withFindings,
    "an edited .rs file with clippy findings must be reported, but the hook stayed silent",
  );
  const parsed = JSON.parse(withFindings) as {
    hookSpecificOutput: { hookEventName: string; additionalContext: string };
  };
  assert.equal(parsed.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.match(parsed.hookSpecificOutput.additionalContext, /src\/lib\.rs/);

  const clean = runHook(POST, f, path.join(f.repo, "src", "lib.rs"), { CARGO_SILENT: "1" });
  assert.equal(clean, "", "a clean clippy run must stay silent");
});
