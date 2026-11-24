/// <reference types="node" />
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fix, lint } from "../textlint.ts";

function withOnlyPath<T>(binDir: string, fn: () => T): T {
  const original = process.env.PATH;
  process.env.PATH = binDir;
  try {
    return fn();
  } finally {
    process.env.PATH = original;
  }
}

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

test("a lint run returns the runner's stdout verbatim, including the path it was handed", () => {
  const root = makeFixtureRoot();
  const binDir = installStubBun(root);
  const targetPath = join(root, "example.md");
  writeFileSync(targetPath, "# stub target\n");

  const result = withOnlyPath(binDir, () => lint(targetPath));

  assert.equal(result, `STUB_TEXTLINT_FINDING:${targetPath}\n`);
});

test("an absent textlint binary leaves the hook silent", () => {
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
