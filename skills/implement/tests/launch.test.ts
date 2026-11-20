/// <reference types="node" />
import assert from "node:assert/strict";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "launch.ts");
const DONE_GATE = resolve(HERE, "..", "..", "..", "hooks", "lifecycle", "done_gate.ts");
const ISSUE = 42;
const FEATURE_TITLE = "[Feature] publish_gate.ts が、サブシェルの中の公開を見つける";

const CONFIG = { repository: "owner/repo", remote: "origin", baseBranch: "main", check: "true" };

function isolatedEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "launch-test",
    GIT_AUTHOR_EMAIL: "launch-test@example.invalid",
    GIT_COMMITTER_NAME: "launch-test",
    GIT_COMMITTER_EMAIL: "launch-test@example.invalid",
    ...extra,
  };
  for (const key of ["GIT_DIR", "GIT_INDEX_FILE", "GIT_WORK_TREE", "GIT_OBJECT_DIRECTORY", "GIT_COMMON_DIR"]) {
    delete env[key];
  }
  return env;
}

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, env: isolatedEnv(), encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function commitFile(repo: string, name: string, content: string): void {
  writeFileSync(join(repo, name), content);
  git(repo, "add", name);
  git(repo, "commit", "-q", "-m", `add ${name}`);
}

interface Fixture {
  root: string;
  origin: string;
  repo: string;
  bin: string;
  logs: string;
}

function fixture(config: Record<string, unknown> | null = CONFIG): Fixture {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "launch-")));
  const origin = join(root, "origin.git");
  const repo = join(root, "repo");
  const bin = join(root, "bin");
  const logs = join(root, "logs");
  mkdirSync(bin);
  mkdirSync(logs);
  git(root, "init", "-q", "--bare", "-b", "main", origin);
  git(root, "clone", "-q", origin, repo);
  git(repo, "checkout", "-q", "-b", "main");
  commitFile(repo, "README.md", "readme\n");
  if (config !== null) commitFile(repo, ".dotagents.json", `${JSON.stringify(config)}\n`);
  git(repo, "push", "-q", "origin", "main");
  fakeGh({ bin, logs, root, origin, repo }, { number: ISSUE, title: FEATURE_TITLE, body: "body", state: "OPEN" });
  return { root, origin, repo, bin, logs };
}

function fakeGh(f: Fixture, reply: Record<string, unknown> | null): void {
  const body = reply === null ? "echo 'not found' >&2\nexit 1\n" : `cat <<'JSON'\n${JSON.stringify(reply)}\nJSON\n`;
  writeFileSync(join(f.bin, "gh"), `#!/bin/sh\n${body}`, { mode: 0o755 });
}

function fakeClaude(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\npwd -P > "$LOGS/cwd"\nprintf '%s\\n' "$@" > "$LOGS/args"\ncat > "$LOGS/stdin"\n${body}`,
    { mode: 0o755 },
  );
}

const SESSION_REPLY = `echo '{"session_id":"s-1","result":"finished","total_cost_usd":0.5,"duration_ms":1200}'\n`;
const PASS_CHECK = `"$NODE" "$DONE_GATE" check >&2\n`;

function run(f: Fixture, args: string[]): SpawnSyncReturns<string> {
  return spawnSync(SCRIPT, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: isolatedEnv({
      PATH: `${f.bin}:${process.env.PATH}`,
      LOGS: f.logs,
      NODE: process.execPath,
      DONE_GATE,
    }),
  });
}

function prepare(f: Fixture, ...extra: string[]): SpawnSyncReturns<string> {
  return run(f, ["prepare", "--repo", f.repo, "--issue", String(ISSUE), ...extra]);
}

function outputOf(result: SpawnSyncReturns<string>): Record<string, unknown> {
  const lines = result.stdout.split("\n").filter((line) => line !== "");
  assert.equal(lines.length, 1, `stdout is one JSON line: ${result.stdout}\nstderr: ${result.stderr}`);
  return JSON.parse(lines[0]);
}

function assertStopped(result: SpawnSyncReturns<string>, reason: string): Record<string, unknown> {
  assert.equal(result.status, 1, result.stderr);
  const out = outputOf(result);
  assert.equal(out.ok, false);
  assert.equal(out.reason, reason, String(out.detail));
  assert.equal(typeof out.detail, "string");
  return out;
}

const worktreeOf = (f: Fixture) => join(f.repo, ".claude", "worktrees", `implement-${ISSUE}`);

function launchRecord(worktree: string): Record<string, unknown> {
  const dir = git(worktree, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  return JSON.parse(readFileSync(join(dir, "launch.json"), "utf8"));
}

function gateStatus(worktree: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [DONE_GATE, "status"], { cwd: worktree, env: isolatedEnv(), encoding: "utf8" });
}

test("the script runs as a command", () => {
  accessSync(SCRIPT, constants.X_OK);
});

test("prepare creates the branch and a worktree at origin's base commit, turns the gate on, and records launch.json", () => {
  const f = fixture();
  const result = prepare(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  const worktree = worktreeOf(f);
  const base = git(f.origin, "rev-parse", "main");
  assert.deepEqual(out, {
    action: "prepare",
    ok: true,
    issue: ISSUE,
    branch: `feat/${ISSUE}-publish-gate-ts`,
    worktree,
    base,
    gate_mode: "record",
  });
  assert.equal(git(worktree, "rev-parse", "HEAD"), base);
  assert.equal(git(worktree, "branch", "--show-current"), `feat/${ISSUE}-publish-gate-ts`);
  const status = gateStatus(worktree);
  assert.equal(status.status, 1, "the gate is on and no check is recorded yet");
  assert.match(status.stdout, /No check result is recorded/);
  assert.deepEqual(launchRecord(worktree), {
    issue: ISSUE,
    repository: "owner/repo",
    branch: `feat/${ISSUE}-publish-gate-ts`,
    base,
  });
});

test("prepare builds the worktree from origin's commit after the fetch, even when the local base branch is behind", () => {
  const f = fixture();
  const other = join(f.root, "other");
  git(f.root, "clone", "-q", f.origin, other);
  commitFile(other, "NEW.md", "new\n");
  git(other, "push", "-q", "origin", "main");
  const pushed = git(other, "rev-parse", "HEAD");
  assert.notEqual(git(f.repo, "rev-parse", "main"), pushed);
  const result = prepare(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).base, pushed);
  assert.equal(git(worktreeOf(f), "rev-parse", "HEAD"), pushed);
});

test("--description replaces the words taken from the title in the branch name", () => {
  const f = fixture();
  const result = prepare(f, "--description", "a-b");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).branch, `feat/${ISSUE}-a-b`);
});

test("--gate-mode enforce turns the gate on in enforce mode", () => {
  const f = fixture();
  const result = prepare(f, "--gate-mode", "enforce");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).gate_mode, "enforce");
  const dir = git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  assert.equal(JSON.parse(readFileSync(join(dir, "config.json"), "utf8")).mode, "enforce");
});

test("prepare runs a shell-string setup and an argv-array setup with the worktree as cwd", () => {
  const shell = fixture({ ...CONFIG, setup: "touch made-by-shell" });
  assert.equal(prepare(shell).status, 0);
  assert.ok(existsSync(join(worktreeOf(shell), "made-by-shell")));
  const argv = fixture({ ...CONFIG, setup: [["touch", "first"], ["touch", "second"]] });
  assert.equal(prepare(argv).status, 0);
  assert.ok(existsSync(join(worktreeOf(argv), "first")));
  assert.ok(existsSync(join(worktreeOf(argv), "second")));
});

test("prepare succeeds when a setup that exits 0 prints more than 1 MB to stdout and stderr", () => {
  const f = fixture({ ...CONFIG, setup: "yes x | head -c 2000000; yes y | head -c 2000000 >&2" });
  const result = prepare(f);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(outputOf(result).ok, true);
});

test("prepare cuts the branch description from a title of five or more English words at four words", () => {
  const f = fixture();
  fakeGh(f, { number: ISSUE, title: "[Bug] alpha beta gamma delta epsilon zeta", body: "body", state: "OPEN" });
  const result = prepare(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).branch, `fix/${ISSUE}-alpha-beta-gamma-delta`);
});

test("prepare stops with no-config when HEAD has no .dotagents.json or it lacks a required field", () => {
  assertStopped(prepare(fixture(null)), "no-config");
  assertStopped(prepare(fixture({ ...CONFIG, baseBranch: "" })), "no-config");
});

test("prepare stops with issue-unreadable when gh cannot read the Issue", () => {
  const f = fixture();
  fakeGh(f, null);
  assertStopped(prepare(f), "issue-unreadable");
});

test("prepare stops with issue-not-open when the Issue is closed", () => {
  const f = fixture();
  fakeGh(f, { number: ISSUE, title: FEATURE_TITLE, body: "body", state: "CLOSED" });
  assertStopped(prepare(f), "issue-not-open");
});

test("prepare stops with issue-untyped when the title has no type prefix", () => {
  const f = fixture();
  fakeGh(f, { number: ISSUE, title: "[Idea] launch the worktree", body: "body", state: "OPEN" });
  assertStopped(prepare(f), "issue-untyped");
});

test("prepare stops with no-description when the title gives fewer than 2 English words and no --description is passed", () => {
  const f = fixture();
  fakeGh(f, { number: ISSUE, title: "[Bug] launch が止まる", body: "body", state: "OPEN" });
  assertStopped(prepare(f), "no-description");
  assert.equal(prepare(f, "--description", "launch-stops").status, 0);
});

test("prepare stops with fetch-failed when the remote cannot be fetched", () => {
  assertStopped(prepare(fixture({ ...CONFIG, remote: "nowhere" })), "fetch-failed");
});

test("prepare stops with branch-exists when the branch is already local", () => {
  const f = fixture();
  git(f.repo, "branch", `feat/${ISSUE}-publish-gate-ts`);
  assertStopped(prepare(f), "branch-exists");
});

test("prepare stops with worktree-exists when the worktree directory is already there", () => {
  const f = fixture();
  mkdirSync(worktreeOf(f), { recursive: true });
  assertStopped(prepare(f), "worktree-exists");
});

test("prepare stops with worktree-failed when git cannot create the worktree", () => {
  const f = fixture();
  mkdirSync(join(f.repo, ".claude"));
  writeFileSync(join(f.repo, ".claude", "worktrees"), "a file, not a directory\n");
  assertStopped(prepare(f), "worktree-failed");
});

test("prepare stops with setup-failed for a failing shell or argv setup, and leaves the worktree and branch", () => {
  for (const setup of ["exit 3", [["false"]]]) {
    const f = fixture({ ...CONFIG, setup });
    const out = assertStopped(prepare(f), "setup-failed");
    const worktree = worktreeOf(f);
    assert.ok(existsSync(worktree), "the worktree is left");
    assert.equal(git(f.repo, "branch", "--list", `feat/${ISSUE}-publish-gate-ts`).replace(/^[*+ ]+/, ""), `feat/${ISSUE}-publish-gate-ts`);
    assert.ok(String(out.detail).includes(worktree), "the detail names where the worktree is left");
  }
});

test("prepare stops with gate-failed when done_gate.ts on fails, and leaves the worktree and branch", () => {
  const { check: _check, ...noCheck } = CONFIG;
  const f = fixture(noCheck);
  const out = assertStopped(prepare(f), "gate-failed");
  assert.ok(existsSync(worktreeOf(f)));
  assert.ok(String(out.detail).includes(worktreeOf(f)));
  assert.notEqual(git(f.repo, "branch", "--list", `feat/${ISSUE}-publish-gate-ts`), "");
});

test("a call the script cannot read prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  const calls = [
    [],
    ["prepare"],
    ["prepare", "--issue", String(ISSUE)],
    ["prepare", "--repo", "relative/repo", "--issue", String(ISSUE)],
    ["prepare", "--repo", f.repo, "--issue", "x"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--description", "A_B"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--description", "one"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--description", "a-b-c-d-e"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--gate-mode", "off"],
    ["implement"],
    ["implement", "--worktree", "relative/worktree"],
    ["launch", "--repo", f.repo],
  ];
  for (const args of calls) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
  assert.ok(!existsSync(worktreeOf(f)));
});

test("implement starts claude in the worktree and passes the prompt on stdin with the Issue, repository, and done_gate path", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, PASS_CHECK + SESSION_REPLY);
  const result = run(f, ["implement", "--worktree", worktreeOf(f)]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(f.logs, "cwd"), "utf8").trim(), realpathSync(worktreeOf(f)));
  const args = readFileSync(join(f.logs, "args"), "utf8").split("\n");
  assert.ok(args.includes("-p"));
  assert.equal(args[args.indexOf("--model") + 1], "opus");
  const prompt = readFileSync(join(f.logs, "stdin"), "utf8");
  assert.ok(prompt.includes(`Issue #${ISSUE} of owner/repo`));
  assert.ok(prompt.includes(`gh issue view ${ISSUE} --repo owner/repo`));
  assert.ok(prompt.includes(`\`${DONE_GATE} check\``));
  assert.ok(prompt.includes(`\`${DONE_GATE} status\``));
});

test("implement passes --model to claude", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, PASS_CHECK + SESSION_REPLY);
  assert.equal(run(f, ["implement", "--worktree", worktreeOf(f), "--model", "sonnet"]).status, 0);
  const args = readFileSync(join(f.logs, "args"), "utf8").split("\n");
  assert.equal(args[args.indexOf("--model") + 1], "sonnet");
});

test("implement reports ok and records the session and tree when the child passes the check", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, PASS_CHECK + SESSION_REPLY);
  const result = run(f, ["implement", "--worktree", worktreeOf(f)]);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(typeof out.tree, "string");
  assert.deepEqual(out, {
    action: "implement",
    ok: true,
    session_id: "s-1",
    tree: out.tree,
    result: "finished",
    cost_usd: 0.5,
    duration_ms: 1200,
  });
  const record = launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> };
  assert.equal(record.implement.session_id, "s-1");
  assert.equal(record.implement.tree, out.tree);
  assert.equal(typeof record.implement.at, "string");
});

test("implement prints its JSON line whole through a pipe when the child's result is longer than 64 KB", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  const long = "r".repeat(200_000);
  writeFileSync(join(f.logs, "reply.json"), JSON.stringify({ session_id: "s-1", result: long, total_cost_usd: 0, duration_ms: 1 }));
  fakeClaude(f, `${PASS_CHECK}cat "$LOGS/reply.json"\n`);
  const piped = spawnSync("/bin/sh", ["-c", '"$0" implement --worktree "$1" | cat', SCRIPT, worktreeOf(f)], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: isolatedEnv({ PATH: `${f.bin}:${process.env.PATH}`, LOGS: f.logs, NODE: process.execPath, DONE_GATE }),
  });
  assert.equal(piped.status, 0, piped.stderr);
  assert.equal(outputOf(piped).result, long);
});

test("implement stops with not-done and still records the session when the child ends without passing the check", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, SESSION_REPLY);
  const out = assertStopped(run(f, ["implement", "--worktree", worktreeOf(f)]), "not-done");
  assert.equal(out.action, "implement");
  assert.equal(out.session_id, "s-1");
  assert.match(String(out.detail), /No check result is recorded/);
  const record = launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> };
  assert.equal(record.implement.session_id, "s-1");
});

test("implement stops with child-failed when claude exits non-zero, prints no JSON, or gives no session_id", () => {
  for (const body of [`${SESSION_REPLY}exit 3\n`, "echo 'not json'\n", `echo '{"result":"finished"}'\n`]) {
    const f = fixture();
    assert.equal(prepare(f).status, 0);
    fakeClaude(f, body);
    assertStopped(run(f, ["implement", "--worktree", worktreeOf(f)]), "child-failed");
    assert.equal((launchRecord(worktreeOf(f)) as Record<string, unknown>).implement, undefined);
  }
});

test("implement stops with not-prepared in a worktree that prepare did not set up", () => {
  const f = fixture();
  fakeClaude(f, SESSION_REPLY);
  assertStopped(run(f, ["implement", "--worktree", f.repo]), "not-prepared");
  assert.ok(!existsSync(join(f.logs, "cwd")), "claude is not started");
});
