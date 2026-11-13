// Tier 1 checks on host.ts: /implement decides whether to launch on the host from what `probe` prints.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "host.ts");
// A claude on PATH that answers a probe with the reply given.
const withClaude = (reply: Record<string, unknown>) => {
  const dir = mkdtempSync(join(tmpdir(), "implement-host-"));
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, "bin", "claude"), `#!/bin/sh\ncat > /dev/null\necho '${JSON.stringify(reply)}'\n`, { mode: 0o755 });
  return (args: string[]) =>
    spawnSync(script, args, { encoding: "utf8", env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` } });
};

test("the script runs as a command, the way the skill invokes it", () => {
  accessSync(script, constants.X_OK);
});

test("probe prints whether a child session ran the commands, and the commands the user's rules refused", () => {
  const ran = withClaude({ is_error: false, result: "done", permission_denials: [] })(["probe", "--repo", tmpdir(), "git status --short"]);
  assert.equal(ran.status, 0);
  assert.deepEqual(JSON.parse(ran.stdout), { ran: true, denied: [], why: "" });
  const refused = withClaude({ is_error: false, result: "", permission_denials: [{ tool_name: "Bash", tool_input: { command: "bun --version" } }] })([
    "probe",
    "--repo",
    tmpdir(),
    "bun --version",
  ]);
  assert.equal(refused.status, 0, "a refusal is an answer, not a failure of the probe");
  const out = JSON.parse(refused.stdout);
  assert.deepEqual([out.ran, out.denied], [false, ["bun --version"]]);
});

test("a call the script cannot read prints the usage and exits 2", () => {
  for (const args of [[], ["probe"], ["probe", "--repo", "/abs/repo"], ["launch"], ["run"]]) {
    const ran = spawnSync(script, args, { encoding: "utf8" });
    assert.equal(ran.status, 2, args.join(" "));
    assert.match(ran.stderr, /^usage: /, args.join(" "));
  }
});
