/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { clippyOutput, MAX_FINDINGS } from "../rust_target.ts";
import { installStub, withEnv } from "./_stub-bin.ts";

const EDITED_RELATIVE = "src/edited.rs";

function makeFixtureRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "rust-target-tests-"));
}

test("a clippy run yielding more than the cap returns exactly the cap, cut after collecting the whole output", () => {
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
    "echo 'src/edited.rs:1:1: warning: the edited file, last line of the raw output'",
    "exit 0",
  ].join("\n");
  const binDir = installStub(root, "cargo", script);

  const result = withEnv({ PATH: binDir }, () =>
    clippyOutput("PreToolUse", root, path.join(root, EDITED_RELATIVE)),
  );

  assert.ok(result, "clippy produced findings but clippyOutput returned nothing");
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

test("a missing cargo binary leaves the hook silent instead of reporting a failure", () => {
  const root = makeFixtureRoot();
  const emptyBinDir = path.join(root, "empty-bin");
  mkdirSync(emptyBinDir);

  const result = withEnv({ PATH: emptyBinDir }, () =>
    clippyOutput("PreToolUse", root, path.join(root, EDITED_RELATIVE)),
  );

  assert.equal(result, null, "an absent cargo binary must read as nothing to say, not throw");
});

test("an output larger than node's default maxBuffer is not truncated", () => {
  const root = makeFixtureRoot();
  const lineCount = 20000;
  const padding = "x".repeat(80);
  const script = [
    "#!/bin/sh",
    '[ "$1" = "clippy" ] || exit 0',
    `awk 'BEGIN { for (i = 0; i < ${lineCount}; i++) print "src/other.rs:" i ":1: warning: ${padding}" }'`,
    "echo 'src/edited.rs:1:1: warning: printed after the default 1MB maxBuffer boundary'",
    "exit 0",
  ].join("\n");
  const binDir = installStub(root, "cargo", script);

  const result = withEnv({ PATH: binDir }, () =>
    clippyOutput("PreToolUse", root, path.join(root, EDITED_RELATIVE)),
  );

  assert.ok(result, "output past the default maxBuffer must not be dropped as empty");
  const additionalContext = JSON.parse(result).hookSpecificOutput.additionalContext as string;
  const firstLine = additionalContext.split("\n")[0];
  assert.match(
    firstLine,
    /src\/edited\.rs/,
    "the finding printed after the 1MB boundary must reach clippyOutput -- proof spawnSync was " +
      "given an explicit maxBuffer instead of node's 1MB default",
  );
});
