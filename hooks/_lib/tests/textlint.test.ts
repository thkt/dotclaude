/// <reference types="node" />
// Golden tests for hooks/_lib/textlint.ts: for a given PATH and edited file, lint() invokes the
// runner and reads its stdout back verbatim, and fix() stays silent when no runner is found.
// These began as a differential suite against a Python sibling (unit U-002,
// docs/decisions/0112-adopt-typescript-for-helper-scripts.md); textlint.py retires with this
// unit (DR-0121), and the expectations the suite already asserted against the TypeScript side
// stay. The module resolves CONFIG from its own file's location (the real repo's
// .textlintrc.json), so this test controls the runner instead: a stub `bun` on PATH plays the
// same role hooks/_lib/tests/rust-target.test.ts's installStubCargo plays for that test's
// binary-resolution cases, since the runner lookup searches PATH.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fix, lint } from "../textlint.ts";

/** Runs fn with PATH replaced by exactly binDir -- a replaced (not merged) PATH is what makes
 * "no runner" true regardless of whether this machine happens to have a real bun/npx
 * installed, the same reasoning hooks/_lib/tests/rust-target.test.ts's withOnlyPath documents
 * for its own cargo stub. */
function withOnlyPath<T>(binDir: string, fn: () => T): T {
  const original = process.env.PATH;
  process.env.PATH = binDir;
  try {
    return fn();
  } finally {
    process.env.PATH = original;
  }
}

/** Writes an executable `bun` stub under root/bin that answers `bun x textlint <path> --config
 * <config>` with a fixed line naming the path it was given, and returns that directory. */
function installStubBun(root: string): string {
  const binDir = join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const stub = join(binDir, "bun");
  writeFileSync(
    stub,
    [
      "#!/bin/sh",
      '[ "$1" = "x" ] && [ "$2" = "textlint" ] || exit 0',
      'echo "STUB_TEXTLINT_FINDING:$3"',
      "exit 1",
    ].join("\n") + "\n",
  );
  chmodSync(stub, 0o755);
  return binDir;
}

function makeFixtureRoot(): string {
  return mkdtempSync(join(tmpdir(), "textlint-tests-"));
}

test("T-379 a lint run returns the runner's stdout verbatim, including the path it was handed", () => {
  const root = makeFixtureRoot();
  const binDir = installStubBun(root);
  const targetPath = join(root, "example.md");
  writeFileSync(targetPath, "# stub target\n");

  const result = withOnlyPath(binDir, () => lint(targetPath));

  // The exact line the stub prints, path included: a prefix match alone would pass even if the
  // runner's argv lost the target path, which is what the stub echoes back to prove it arrived.
  assert.equal(result, `STUB_TEXTLINT_FINDING:${targetPath}\n`);
});

test("T-380 an absent textlint binary leaves the hook silent", () => {
  const root = makeFixtureRoot();
  const emptyBinDir = join(root, "empty-bin");
  mkdirSync(emptyBinDir, { recursive: true });
  const targetPath = join(root, "example.md");
  writeFileSync(targetPath, "# stub target\n");

  const result = withOnlyPath(emptyBinDir, () => lint(targetPath));

  assert.equal(result, "", "an absent runner must read as no findings, not throw");

  assert.doesNotThrow(() => {
    withOnlyPath(emptyBinDir, () => fix(targetPath));
  }, "fix() must stay silent (no throw) when no runner is found");
});
