import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canBind } from "../scripts/sandbox_probe.ts";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "sandbox_probe.ts");
const run = (env: Record<string, string | undefined>) =>
  JSON.parse(execFileSync(script, { env: { ...process.env, ...env }, encoding: "utf8" }));

test("the probe runs as a command, the way the skill invokes it", () => {
  accessSync(script, constants.X_OK);
});

test("a command the sandbox runtime wrapped reports sandboxed, and one it did not wrap reports not sandboxed", () => {
  assert.equal(run({ SANDBOX_RUNTIME: "1" }).sandboxed, true);
  assert.equal(run({ SANDBOX_RUNTIME: undefined }).sandboxed, false);
});

test("the probe reports the platform, and for local binding what a listen on 127.0.0.1 finds here", async () => {
  const out = run({});
  assert.equal(out.platform, process.platform);
  assert.equal(out.local_binding, await canBind("127.0.0.1"));
});

test("a listen that the host refuses reads as no binding", async () => {
  assert.equal(await canBind("203.0.113.1"), false);
});
