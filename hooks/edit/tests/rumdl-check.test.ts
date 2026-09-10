/// <reference types="node" />
// Unit U-005: hooks/edit/rumdl_check.ts (docs/decisions/0112-adopt-typescript-for-helper-
// scripts.md), composing hooks/_lib/hook_payload.ts's editedFile and notify around a
// `rumdl check <path>` subprocess, the way its retired Python predecessor composed the same
// pieces -- this test drives that composition through a stub `rumdl` on PATH, the way
// hooks/edit/tests/rust-edit.test.ts's STUB_CARGO and hooks/edit/tests/textlint-fix.test.ts's
// installStubBun both already do for this codebase's runner-resolution hooks: the stub prints
// one finding and exits non-zero, the shape rumdl_check.ts's spawnSync call reads
// (status !== 0 and non-empty stdout) before it hands the finding to notify.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "rumdl_check.ts");

// MD022-shaped: what a real rumdl reports for two headings with no blank line between them.
// Mirrors the retired rumdl_check hook tests' VIOLATING_MD and the MD022 finding their
// violation-reaches-both-channels case expected on both notify channels.
const VIOLATING_MD = "# Heading\n## Another Heading\n";
const FINDING = "violation.md:2:1 [MD022] headings should be surrounded by blank lines";

/** Writes an executable `rumdl` stub under root/bin that answers `rumdl check <path>` by
 * printing one finding and exiting 1. Mirrors rust-edit.test.ts's STUB_CARGO. */
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
  // The shape hook_payload.py's notify writes, and hook_payload.ts's notification() mirrors:
  // systemMessage for the human, hookSpecificOutput.additionalContext for the agent, both
  // carrying the same finding, under a hookEventName naming the event actually firing.
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
