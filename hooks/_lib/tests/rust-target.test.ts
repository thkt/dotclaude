/// <reference types="node" />
// Unit U-001: rust_target.ts's clippy findings pipeline -- cargo clippy's whole stdout+stderr
// is collected before MAX_FINDINGS trims it, and a missing cargo binary must read as nothing to
// say rather than a thrown failure. A stub cargo on PATH plays the same role the retired
// rust-edit hook tests' STUB_CARGO once did for the Python side: the assertions read what
// clippyOutput does with the stub's output, not a real crate.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { clippyOutput, MAX_FINDINGS } from "../rust_target.ts";

const EDITED_RELATIVE = "src/edited.rs";

function makeFixtureRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "rust-target-tests-"));
}

/** Writes an executable `cargo` stub under root/bin and returns that directory. */
function installStubCargo(root: string, script: string): string {
  const binDir = path.join(root, "bin");
  mkdirSync(binDir);
  const stub = path.join(binDir, "cargo");
  writeFileSync(stub, script);
  chmodSync(stub, 0o755);
  return binDir;
}

/** Runs fn with PATH replaced by exactly binDir -- a replaced (not merged) PATH is what makes
 * "cargo absent" true regardless of whether this machine happens to have a real cargo
 * installed, the same reasoning the retired rust-edit hook tests' setUp once documented for
 * own env replacement. */
function withOnlyPath<T>(binDir: string, fn: () => T): T {
  const original = process.env.PATH;
  process.env.PATH = binDir;
  try {
    return fn();
  } finally {
    process.env.PATH = original;
  }
}

test("T-376 a clippy run yielding more than the cap returns exactly the cap, cut after collecting the whole output", () => {
  const root = makeFixtureRoot();
  const fillerCount = MAX_FINDINGS + 10;
  const fillerEchoes = Array.from(
    { length: fillerCount },
    (_, i) => `echo 'src/other.rs:${i}:1: warning: filler finding ${i}'`,
  );
  const script = [
    "#!/bin/sh",
    '[ "$1" = "clippy" ] || exit 0',
    ...fillerEchoes,
    // The 41st line (past a naive top-MAX_FINDINGS cut) names the edited file.
    "echo 'src/edited.rs:1:1: warning: the edited file, last line of the raw output'",
    "exit 0",
  ].join("\n");
  const binDir = installStubCargo(root, script);

  const result = withOnlyPath(binDir, () =>
    clippyOutput("PreToolUse", root, path.join(root, EDITED_RELATIVE)),
  );

  assert.ok(result, "clippy produced findings but clippyOutput returned nothing");
  // clippyOutput returns the JSON.stringify'd hookSpecificOutput envelope, so
  // additionalContext's embedded newlines are the two literal characters \n, not real line
  // breaks -- unwrap before splitting, mirroring how the retired rust-edit hook tests once read
  // the Python side via json.loads(out)["hookSpecificOutput"]["additionalContext"].
  const additionalContext = JSON.parse(result).hookSpecificOutput.additionalContext as string;
  const lines = additionalContext.split("\n");
  assert.equal(
    lines.length,
    MAX_FINDINGS,
    `must cut to exactly MAX_FINDINGS (${MAX_FINDINGS}) lines, got ${lines.length}`,
  );
  const firstLine = lines[0];
  assert.match(
    firstLine,
    /src\/edited\.rs/,
    "the edited file's finding -- last line of a raw output longer than the cap -- must lead " +
      "the result: proof the cut runs after collecting and reordering the whole output, not on " +
      "the first MAX_FINDINGS lines seen",
  );
});

test("T-377 a missing cargo binary leaves the hook silent instead of reporting a failure", () => {
  const root = makeFixtureRoot();
  const emptyBinDir = path.join(root, "empty-bin");
  mkdirSync(emptyBinDir);

  const result = withOnlyPath(emptyBinDir, () =>
    clippyOutput("PreToolUse", root, path.join(root, EDITED_RELATIVE)),
  );

  assert.equal(result, null, "an absent cargo binary must read as nothing to say, not throw");
});

test("T-378 an output larger than node's default maxBuffer is not truncated", () => {
  const root = makeFixtureRoot();
  // node:child_process spawnSync's undocumented-by-default cap is 1024 * 1024 bytes; this
  // stub's filler alone runs past it so a call without an explicit, larger maxBuffer would
  // truncate (or error) before the edited-file line near the end is ever collected.
  const lineCount = 20000; // ~20000 * ~113 bytes ~= 2.2MB of stdout
  const padding = "x".repeat(80);
  const script = [
    "#!/bin/sh",
    '[ "$1" = "clippy" ] || exit 0',
    `awk 'BEGIN { for (i = 0; i < ${lineCount}; i++) print "src/other.rs:" i ":1: warning: ${padding}" }'`,
    "echo 'src/edited.rs:1:1: warning: printed after the default 1MB maxBuffer boundary'",
    "exit 0",
  ].join("\n");
  const binDir = installStubCargo(root, script);

  const result = withOnlyPath(binDir, () =>
    clippyOutput("PreToolUse", root, path.join(root, EDITED_RELATIVE)),
  );

  assert.ok(result, "output past the default maxBuffer must not be dropped as empty");
  // Unwrap the JSON envelope before splitting -- see the matching comment in T-376 above.
  const additionalContext = JSON.parse(result).hookSpecificOutput.additionalContext as string;
  const firstLine = additionalContext.split("\n")[0];
  assert.match(
    firstLine,
    /src\/edited\.rs/,
    "the finding printed after the 1MB boundary must reach clippyOutput -- proof spawnSync was " +
      "given an explicit maxBuffer instead of node's 1MB default",
  );
});
