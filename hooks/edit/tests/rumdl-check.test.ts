/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "rumdl_check.ts");

const VIOLATING_MD = "# Heading\n## Another Heading\n";
const FINDING = "violation.md:2:1 [MD022] headings should be surrounded by blank lines";

function installStubRumdl(root: string): string {
  const binDir = path.join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const stub = path.join(binDir, "rumdl");
  writeFileSync(stub, ["#!/bin/sh", `echo "${FINDING}"`, "exit 1"].join("\n") + "\n");
  chmodSync(stub, 0o755);
  return binDir;
}

function runHook(filePath: string, env: NodeJS.ProcessEnv): string {
  const payload = { tool_name: "Write", tool_input: { file_path: filePath } };
  return run(HOOK, payload, env);
}

test("T-384 an edited markdown file reaches rumdl and its findings arrive through notify in the python version's shape, and a missing rumdl binary leaves the hook silent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "rumdl-check-tests-"));
  const mdPath = path.join(root, "violation.md");
  writeFileSync(mdPath, VIOLATING_MD);

  const binDir = installStubRumdl(root);
  const withRumdl = { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH}` };
  const out = runHook(mdPath, withRumdl);
  assert.ok(
    out,
    "an edited .md file with rumdl findings must be reported, but the hook stayed silent",
  );
  const parsed = JSON.parse(out) as {
    systemMessage: string;
    hookSpecificOutput: { hookEventName: string; additionalContext: string };
  };
  assert.match(parsed.systemMessage, /MD022/, "the finding must reach the human channel");
  assert.equal(parsed.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.match(
    parsed.hookSpecificOutput.additionalContext,
    /MD022/,
    "the finding must reach the agent channel too, in the python version's notify shape",
  );

  const withoutRumdl = { ...process.env, PATH: "/usr/bin:/bin" };
  const silent = runHook(mdPath, withoutRumdl);
  assert.equal(silent, "", "a PATH with no rumdl binary must leave the hook silent");
});

test("the real rumdl binary reports the same rule on both channels, run without a PATH override", (t) => {
  const probe = spawnSync("rumdl", ["--version"], { encoding: "utf8" });
  if (probe.error) {
    t.skip("rumdl is not installed in this environment");
    return;
  }

  const root = mkdtempSync(path.join(tmpdir(), "rumdl-check-real-"));
  const mdPath = path.join(root, "violation.md");
  writeFileSync(mdPath, VIOLATING_MD);

  const out = runHook(mdPath, process.env);
  assert.ok(out, "the real rumdl must report the violation, but the hook stayed silent");
  const parsed = JSON.parse(out) as {
    systemMessage: string;
    hookSpecificOutput: { hookEventName: string; additionalContext: string };
  };
  assert.match(parsed.systemMessage, /MD022/, "the finding must reach the human channel");
  assert.equal(parsed.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.match(parsed.hookSpecificOutput.additionalContext, /MD022/);
});
