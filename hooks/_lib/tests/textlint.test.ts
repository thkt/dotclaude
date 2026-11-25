/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fix, lint } from "../textlint.ts";
import { installStub, withEnv } from "./_stub-bin.ts";

const STUB_BUN = [
  "#!/bin/sh",
  '[ "$1" = "x" ] && [ "$2" = "textlint" ] || exit 0',
  'echo "STUB_TEXTLINT_FINDING:$3"',
  "exit 1",
].join("\n") + "\n";

function makeFixtureRoot(): string {
  return mkdtempSync(join(tmpdir(), "textlint-tests-"));
}

test("a lint run returns the runner's stdout verbatim, including the path it was handed", () => {
  const root = makeFixtureRoot();
  const binDir = installStub(root, "bun", STUB_BUN);
  const targetPath = join(root, "example.md");
  writeFileSync(targetPath, "# stub target\n");

  const result = withEnv({ PATH: binDir }, () => lint(targetPath));

  assert.equal(result, `STUB_TEXTLINT_FINDING:${targetPath}\n`);
});

test("an absent textlint binary leaves the hook silent", () => {
  const root = makeFixtureRoot();
  const emptyBinDir = join(root, "empty-bin");
  mkdirSync(emptyBinDir, { recursive: true });
  const targetPath = join(root, "example.md");
  writeFileSync(targetPath, "# stub target\n");

  const result = withEnv({ PATH: emptyBinDir }, () => lint(targetPath));

  assert.equal(result, "", "an absent runner must read as no findings, not throw");

  assert.doesNotThrow(() => {
    withEnv({ PATH: emptyBinDir }, () => fix(targetPath));
  }, "fix() must stay silent (no throw) when no runner is found");
});
