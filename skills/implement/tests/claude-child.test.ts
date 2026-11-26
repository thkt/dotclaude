/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { endAll, runClaudeOnce } from "../scripts/claude-child.ts";
import type { ChildRun } from "../scripts/claude-child.ts";

const argvOfOnce = async (extra: Partial<ChildRun>): Promise<string[]> => {
  const dir = mkdtempSync(join(tmpdir(), "claude-run-once-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "claude"), "#!/usr/bin/env node\nconsole.log(JSON.stringify(process.argv.slice(2)));\n", { mode: 0o755 });
  const before = { PATH: process.env.PATH, settings: process.env.CLAUDE_RUN_SETTINGS };
  process.env.PATH = `${bin}:${before.PATH}`;
  delete process.env.CLAUDE_RUN_SETTINGS;
  try {
    const outcome = await runClaudeOnce({ prompt: "p", model: "opus", effort: undefined, schema: undefined, cwd: dir, timeoutMs: 60_000, ...extra });
    assert.equal(outcome.code, 0, outcome.stderr);
    return JSON.parse(outcome.stdout);
  } finally {
    process.env.PATH = before.PATH;
    if (before.settings !== undefined) process.env.CLAUDE_RUN_SETTINGS = before.settings;
  }
};

test("runClaudeOnce puts --fork-session right after --resume <id> when fork and resume are passed, and leaves it out when fork comes without resume", async () => {
  const forked = await argvOfOnce({ resume: "s-7", fork: true });
  const at = forked.indexOf("--resume");
  assert.deepEqual(forked.slice(at, at + 3), ["--resume", "s-7", "--fork-session"]);
  assert.ok(!(await argvOfOnce({ fork: true })).includes("--fork-session"));
  assert.ok(!(await argvOfOnce({ resume: "s-7" })).includes("--fork-session"));
});

test("runClaudeOnce passes --session-id with the sessionId value when it is given, and no --session-id when it is not", async () => {
  const given = await argvOfOnce({ sessionId: "0b5c1f3e-2a4d-4e6f-8a9b-1c2d3e4f5a6b" });
  const at = given.indexOf("--session-id");
  assert.deepEqual(given.slice(at, at + 2), ["--session-id", "0b5c1f3e-2a4d-4e6f-8a9b-1c2d3e4f5a6b"]);
  assert.ok(!(await argvOfOnce({})).includes("--session-id"));
});

test("runClaudeOnce uses tools as the --allowedTools value when it is passed", async () => {
  const argv = await argvOfOnce({ tools: "Read,Glob,Grep,LS" });
  assert.equal(argv[argv.indexOf("--allowedTools") + 1], "Read,Glob,Grep,LS");
});

test("runClaudeOnce with everyTurn true passes --output-format stream-json --verbose where json was, and keeps every other argument in its order", async () => {
  const plain = await argvOfOnce({ resume: "s-7", sessionId: "s-8" });
  const every = await argvOfOnce({ resume: "s-7", sessionId: "s-8", everyTurn: true });
  const at = plain.indexOf("--output-format");
  assert.deepEqual(plain.slice(at, at + 2), ["--output-format", "json"]);
  assert.deepEqual(every, [...plain.slice(0, at), "--output-format", "stream-json", "--verbose", ...plain.slice(at + 2)]);
});

test("runClaudeOnce with everyTurn false passes the same arguments as without everyTurn", async () => {
  assert.deepEqual(await argvOfOnce({ everyTurn: false }), await argvOfOnce({}));
});

test("runClaudeOnce calls onStart once with the pid of the child it started, which is the pid the child reports for itself", async () => {
  const dir = mkdtempSync(join(tmpdir(), "claude-run-start-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "claude"), "#!/usr/bin/env node\nconsole.log(JSON.stringify({ pid: process.pid }));\n", { mode: 0o755 });
  const before = process.env.PATH;
  process.env.PATH = `${bin}:${before}`;
  try {
    const started: number[] = [];
    const outcome = await runClaudeOnce({
      prompt: "p",
      model: "opus",
      effort: undefined,
      schema: undefined,
      cwd: dir,
      timeoutMs: 60_000,
      onStart: (pid) => started.push(pid),
    });
    assert.equal(outcome.code, 0, outcome.stderr);
    assert.deepEqual(started, [JSON.parse(outcome.stdout).pid]);
  } finally {
    process.env.PATH = before;
  }
});

const withPath = async <T>(path: string, body: () => Promise<T>): Promise<T> => {
  const before = { PATH: process.env.PATH, settings: process.env.CLAUDE_RUN_SETTINGS };
  process.env.PATH = path;
  try {
    return await body();
  } finally {
    process.env.PATH = before.PATH;
    if (before.settings === undefined) delete process.env.CLAUDE_RUN_SETTINGS;
    else process.env.CLAUDE_RUN_SETTINGS = before.settings;
  }
};

const hangingClaude = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "claude-child-hang-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "claude"), "#!/usr/bin/env node\nsetTimeout(() => {}, 60_000);\n", { mode: 0o755 });
  return bin;
};

test("runClaudeOnce starts claude with -p, the model, the output format, the tools, the denied tools, the effort, the schema, and one --settings last, with sandbox.enabled true even when CLAUDE_RUN_SETTINGS disables the sandbox, and the prompt on stdin in cwd", async () => {
  const dir = mkdtempSync(join(tmpdir(), "claude-child-argv-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "claude"),
    `#!/usr/bin/env node
const fs = require("node:fs");
fs.writeFileSync(${JSON.stringify(join(dir, "call.json"))}, JSON.stringify({ argv: process.argv.slice(2), stdin: fs.readFileSync(0, "utf8"), cwd: process.cwd() }));
`,
    { mode: 0o755 },
  );
  const schema = { type: "object", properties: { status: { type: "string" } } };
  const settings = '{"sandbox":{"enabled":false}}';
  const outcome = await withPath(`${bin}:${process.env.PATH}`, () => {
    process.env.CLAUDE_RUN_SETTINGS = settings;
    return runClaudeOnce({ prompt: "implement 本文", model: "opus", effort: "high", schema, cwd: dir, timeoutMs: 60_000 });
  });
  assert.equal(outcome.code, 0, outcome.stderr);
  const call = JSON.parse(readFileSync(join(dir, "call.json"), "utf8"));
  assert.deepEqual(call.argv.slice(0, -1), [
    "-p",
    "--model",
    "opus",
    "--output-format",
    "json",
    "--allowedTools",
    "Read,Write,Edit,MultiEdit,Glob,Grep,LS",
    "--disallowedTools",
    "Agent,Workflow",
    "--effort",
    "high",
    "--json-schema",
    JSON.stringify(schema),
    "--settings",
  ]);
  assert.equal(call.argv.filter((arg: string) => arg === "--settings").length, 1);
  assert.equal(JSON.parse(call.argv[call.argv.length - 1]).sandbox.enabled, true);
  assert.equal(call.stdin, "implement 本文");
  assert.equal(call.cwd, realpathSync(dir));
});

test("runClaudeOnce with no claude on PATH returns code -1, an stderr naming ENOENT, and timedOut false", async () => {
  const dir = mkdtempSync(join(tmpdir(), "claude-child-none-"));
  const outcome = await withPath("/nonexistent", () =>
    runClaudeOnce({ prompt: "p", model: "opus", effort: undefined, schema: undefined, cwd: dir, timeoutMs: 60_000 }),
  );
  assert.equal(outcome.code, -1);
  assert.match(outcome.stderr, /ENOENT/);
  assert.equal(outcome.timedOut, false);
});

test("runClaudeOnce ends a claude that runs past timeoutMs and returns timedOut true with code null", async () => {
  const bin = hangingClaude();
  const outcome = await withPath(`${bin}:${process.env.PATH}`, () =>
    runClaudeOnce({ prompt: "p", model: "opus", effort: undefined, schema: undefined, cwd: bin, timeoutMs: 1_000 }),
  );
  assert.equal(outcome.timedOut, true);
  assert.equal(outcome.code, null);
});

test("endAll ends a running claude before its time limit, and runClaudeOnce returns code null with timedOut false", async () => {
  const bin = hangingClaude();
  const outcome = await withPath(`${bin}:${process.env.PATH}`, () =>
    runClaudeOnce({
      prompt: "p",
      model: "opus",
      effort: undefined,
      schema: undefined,
      cwd: bin,
      timeoutMs: 60_000,
      onStart: () => {
        setTimeout(endAll, 500);
      },
    }),
  );
  assert.equal(outcome.code, null);
  assert.equal(outcome.timedOut, false);
});

const SANDBOX_TABLE = { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false };
const GITHUB_HOSTS = ["github.com", "api.github.com", "*.github.com"];

const recordingClaude = (): { bin: string; dir: string; called: string } => {
  const dir = mkdtempSync(join(tmpdir(), "claude-child-settings-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const called = join(dir, "called");
  writeFileSync(
    join(bin, "claude"),
    `#!/usr/bin/env node
require("node:fs").writeFileSync(${JSON.stringify(called)}, JSON.stringify(process.argv.slice(2)));
`,
    { mode: 0o755 },
  );
  return { bin, dir, called };
};

const runWithSettings = async (settings: string | undefined) => {
  const claude = recordingClaude();
  const outcome = await withPath(`${claude.bin}:${process.env.PATH}`, () => {
    if (settings === undefined) delete process.env.CLAUDE_RUN_SETTINGS;
    else process.env.CLAUDE_RUN_SETTINGS = settings;
    return runClaudeOnce({ prompt: "p", model: "opus", effort: undefined, schema: undefined, cwd: claude.dir, timeoutMs: 60_000 });
  });
  return { outcome, claude };
};

const passedSettingsOf = async (settings: string | undefined): Promise<Record<string, any>> => {
  const { outcome, claude } = await runWithSettings(settings);
  assert.equal(outcome.code, 0, outcome.stderr);
  const argv: string[] = JSON.parse(readFileSync(claude.called, "utf8"));
  assert.equal(argv[argv.length - 2], "--settings");
  return JSON.parse(argv[argv.length - 1]);
};

const assertSandboxTable = (passed: Record<string, any>): void => {
  for (const [key, value] of Object.entries(SANDBOX_TABLE)) assert.equal(passed.sandbox[key], value, `sandbox.${key}`);
  assert.equal(passed.sandbox.network.strictAllowlist, true, "sandbox.network.strictAllowlist");
  for (const host of GITHUB_HOSTS) assert.ok(passed.sandbox.network.deniedDomains.includes(host), `deniedDomains lacks ${host}`);
};

test("runClaudeOnce without CLAUDE_RUN_SETTINGS passes --settings with the sandbox enabled, failIfUnavailable, no unsandboxed commands, strictAllowlist, and the three GitHub hosts denied", async () => {
  assertSandboxTable(await passedSettingsOf(undefined));
});

test("runClaudeOnce keeps the sandbox values when CLAUDE_RUN_SETTINGS sets each of them to the opposite value", async () => {
  const opposite = {
    sandbox: { enabled: false, failIfUnavailable: false, allowUnsandboxedCommands: true, network: { strictAllowlist: false, deniedDomains: [] } },
  };
  assertSandboxTable(await passedSettingsOf(JSON.stringify(opposite)));
});

test("runClaudeOnce keeps the other keys and the deniedDomains entries of CLAUDE_RUN_SETTINGS in the JSON it passes with --settings", async () => {
  const given = {
    env: { FOO: "bar" },
    sandbox: { excludedCommands: ["docker"], network: { allowedDomains: ["example.com"], deniedDomains: ["evil.example", "github.com"] } },
  };
  const passed = await passedSettingsOf(JSON.stringify(given));
  assert.deepEqual(passed.env, { FOO: "bar" });
  assert.deepEqual(passed.sandbox.excludedCommands, ["docker"]);
  assert.deepEqual(passed.sandbox.network.allowedDomains, ["example.com"]);
  assert.deepEqual(passed.sandbox.network.deniedDomains, ["evil.example", "github.com", "api.github.com", "*.github.com"]);
  assertSandboxTable(passed);
});

test("runClaudeOnce reads CLAUDE_RUN_SETTINGS as a file path relative to cwd when it does not start with { or [, and merges the sandbox values into that file's JSON", async () => {
  const claude = recordingClaude();
  writeFileSync(join(claude.dir, "child-settings.json"), JSON.stringify({ env: { FROM_FILE: "1" }, sandbox: { enabled: false } }));
  const outcome = await withPath(`${claude.bin}:${process.env.PATH}`, () => {
    process.env.CLAUDE_RUN_SETTINGS = "child-settings.json";
    return runClaudeOnce({ prompt: "p", model: "opus", effort: undefined, schema: undefined, cwd: claude.dir, timeoutMs: 60_000 });
  });
  assert.equal(outcome.code, 0, outcome.stderr);
  const argv: string[] = JSON.parse(readFileSync(claude.called, "utf8"));
  const passed = JSON.parse(argv[argv.length - 1]);
  assert.deepEqual(passed.env, { FROM_FILE: "1" });
  assertSandboxTable(passed);
});

for (const [label, settings, reason] of [
  ["text that is not JSON", "{not json", /not a JSON object/],
  ["a JSON array", "[1]", /not a JSON object/],
  ["a path to a missing file", "missing-settings.json", /could not be read/],
] as const) {
  test(`runClaudeOnce does not start claude and returns a nonzero code with the reason in stderr when CLAUDE_RUN_SETTINGS is ${label}`, async () => {
    const { outcome, claude } = await runWithSettings(settings);
    assert.notEqual(outcome.code, 0);
    assert.match(outcome.stderr, /CLAUDE_RUN_SETTINGS/);
    assert.match(outcome.stderr, reason);
    assert.equal(outcome.timedOut, false);
    assert.ok(!existsSync(claude.called), "claude was started");
  });
}
