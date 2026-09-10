/// <reference types="node" />
// Red step for unit U-007: TypeScript port of git_sandbox_guard.py's pure judgment (REWRITES /
// HELP / GIT_ENV / READ_FLAGS / WRITE_FLAGS / READ_ARGUMENTS / REASON and _rewrites_tree) --
// the part that never spawns the rev-parse probe. Parity comes from git_sandbox_guard.py
// itself via a one-shot python3 spawn -- hook-payload-parity.test.ts:41's PY_DRIVER shape,
// also used by rm-to-trash.test.ts and npm-install-guard.test.ts -- rather than importing the
// probe-calling parts, which stay out of this unit.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { REASON, _rewrites_tree } from "../git_sandbox_guard.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SECURITY_DIR = path.join(HERE, "..");

// git_sandbox_guard.py inserts _lib onto its own sys.path at import time (relative to
// __file__), so only its own directory has to be added here for `import git_sandbox_guard` to
// resolve.
const PY_DRIVER = `
import json
import sys

sys.path.insert(0, sys.argv[1])
import git_sandbox_guard as gsg

spec = json.loads(sys.stdin.read())
fn = spec["fn"]
if fn == "rewrites_tree":
    result = gsg._rewrites_tree(spec["tokens"])
elif fn == "reason":
    result = gsg.REASON
else:
    raise SystemExit(f"unknown fn: {fn}")
print(json.dumps({"result": result}))
`;

type PythonSpec = { fn: "rewrites_tree"; tokens: string[] } | { fn: "reason" };

function runPython(spec: PythonSpec): unknown {
  const result = spawnSync("python3", ["-c", PY_DRIVER, SECURITY_DIR], {
    input: JSON.stringify(spec),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return (JSON.parse(result.stdout) as { result: unknown }).result;
}

function rewritesTree(tokens: string[]): boolean {
  return runPython({ fn: "rewrites_tree", tokens }) as boolean;
}

// One spawn: every scenario below reads REASON off git_sandbox_guard.py itself instead of a
// copy retyped in this file.
const PY_REASON = runPython({ fn: "reason" }) as string;

test("T-285 a rewriting subcommand is denied with the REASON text and a read-only one is allowed", () => {
  const rewriting = ["git", "checkout", "main"];
  const readOnly = ["git", "status"];

  assert.equal(_rewrites_tree(rewriting), true, "git_sandbox_guard.ts");
  assert.equal(rewritesTree(rewriting), true, "git_sandbox_guard.py");

  assert.equal(REASON, PY_REASON, "REASON must match git_sandbox_guard.py's REASON text");

  assert.equal(_rewrites_tree(readOnly), false, "git_sandbox_guard.ts: a read-only subcommand");
  assert.equal(rewritesTree(readOnly), false, "git_sandbox_guard.py: a read-only subcommand");
});

test("T-286 a help flag turns a rewriting subcommand into an allowed call", () => {
  for (const tokens of [
    ["git", "checkout", "--help"],
    ["git", "stash", "-h"],
  ]) {
    const label = tokens.join(" ");
    assert.equal(_rewrites_tree(tokens), false, `git_sandbox_guard.ts: ${label}`);
    assert.equal(rewritesTree(tokens), false, `git_sandbox_guard.py: ${label}`);
  }
});

test("T-287 a read-only flag or argument on a rewriting subcommand keeps it allowed, and adding a write flag denies it", () => {
  const readFlag = ["git", "rm", "--cached", "x"];
  const readArgument = ["git", "stash", "list"];
  const indexOnly = ["git", "reset", "--mixed", "origin/main"];
  const writeFlag = ["git", "reset", "--hard", "origin/main"];

  assert.equal(_rewrites_tree(readFlag), false, "git_sandbox_guard.ts: read flag");
  assert.equal(rewritesTree(readFlag), false, "git_sandbox_guard.py: read flag");

  assert.equal(_rewrites_tree(readArgument), false, "git_sandbox_guard.ts: read argument");
  assert.equal(rewritesTree(readArgument), false, "git_sandbox_guard.py: read argument");

  assert.equal(_rewrites_tree(indexOnly), false, "git_sandbox_guard.ts: index-only reset");
  assert.equal(rewritesTree(indexOnly), false, "git_sandbox_guard.py: index-only reset");

  assert.equal(_rewrites_tree(writeFlag), true, "git_sandbox_guard.ts: write flag");
  assert.equal(rewritesTree(writeFlag), true, "git_sandbox_guard.py: write flag");
});
