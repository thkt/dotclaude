/// <reference types="node" />
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { isExecutableFile, tsRuntime, which } from "../executable.ts";
import { withEnv } from "./_stub-bin.ts";

function scratch(): { dir: string; exec: (name: string) => string; plain: (name: string) => string } {
  const dir = mkdtempSync(join(tmpdir(), "hooks-executable-"));
  const make = (name: string, mode: number) => {
    const path = join(dir, name);
    writeFileSync(path, "#!/bin/sh\n");
    chmodSync(path, mode);
    return path;
  };
  return { dir, exec: (name) => make(name, 0o755), plain: (name) => make(name, 0o644) };
}

test("isExecutableFile is true only for a regular file carrying the execute bit", () => {
  const { dir, exec, plain } = scratch();
  try {
    mkdirSync(join(dir, "a-directory"));
    assert.equal(isExecutableFile(exec("runnable")), true);
    assert.equal(isExecutableFile(plain("not-runnable")), false);
    assert.equal(isExecutableFile(join(dir, "a-directory")), false);
    assert.equal(isExecutableFile(join(dir, "missing")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("which returns the first PATH entry carrying an executable of that name, skips empty entries, and returns null when none does", () => {
  const { dir, exec, plain } = scratch();
  try {
    const first = join(dir, "first");
    const second = join(dir, "second");
    mkdirSync(first);
    mkdirSync(second);
    plain("first/tool");
    exec("second/tool");
    exec("elsewhere");

    withEnv({ PATH: `:${first}::${second}:` }, () => {
      assert.equal(which("tool"), join(second, "tool"));
      assert.equal(which("elsewhere"), null);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tsRuntime takes CLAUDE_BUN_BIN when it is executable and otherwise falls back to node on PATH, null when neither runs", () => {
  const { dir, exec, plain } = scratch();
  try {
    const bun = exec("bun");
    const brokenBun = plain("broken-bun");
    const node = exec("node");

    withEnv({ CLAUDE_BUN_BIN: bun, PATH: "" }, () => assert.equal(tsRuntime(), bun));
    withEnv({ CLAUDE_BUN_BIN: brokenBun, PATH: dir }, () => assert.equal(tsRuntime(), node));
    withEnv({ CLAUDE_BUN_BIN: brokenBun, PATH: "" }, () => assert.equal(tsRuntime(), null));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
