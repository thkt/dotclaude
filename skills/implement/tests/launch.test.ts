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
import { GIVE_REPLY } from "../../../workflows/_lib/claude-run.ts";

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
    ["review"],
    ["review", "--model", "opus"],
    ["review", "--worktree", "relative/worktree"],
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

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings", "verified"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["required", "location", "condition", "problem", "action"],
        properties: {
          required: { type: "boolean" },
          location: { type: "string" },
          condition: { type: "string" },
          problem: { type: "string" },
          action: { type: "string" },
        },
      },
    },
    verified: { type: "string" },
  },
};

const POINTS = `Assess four separate things:
1. Code: correctness at the input boundaries, state written to disk, behavior when something fails, and concrete redundancy (the same file read or the same judgment computed twice).
2. Requirements and scope: every item the Issue scopes is present and behaves as the Issue's tables say, and nothing the Issue lists as out of scope changed. Check each sentence the Issue says to insert verbatim against the Issue mechanically.
3. Tests: each done condition in the Issue has a test that would fail if the behavior were removed. Run the targeted tests. For at least two tests, break the code in a temporary copy to show the test fails, and say what you broke.
4. Documentation and repository rules that apply to the changed files. Read the repository's instruction files, such as CLAUDE.md and AGENTS.md and the rules they point to, to find them.`;

const CLOSING = `Do not edit any file in this worktree. Do not commit. Scratch files go under the directory in $TMPDIR.

Give the result through the structured output. \`findings\` lists every finding. Set \`required\` to true only for a defect you demonstrated or a requirement of the Issue that is not met, which must be fixed before the change is published. Set it to false for every other concern. \`location\` is \`file:line\`, or an empty string when no line applies. \`condition\` is the input or state that triggers the finding, \`problem\` is what goes wrong, and \`action\` is what to do. \`verified\` says what you checked and how. An empty \`findings\` is a valid result.`;

const SELF_PROMPT = `Before your uncommitted change for Issue #42 is published, review it yourself and try to refute it. Read the change again with \`git diff HEAD\` and \`git status --short\`, each untracked file, and the code the change calls or is called by.

${POINTS}

${CLOSING}`;

const INDEPENDENT_PROMPT = `Independently review the uncommitted change in this worktree against GitHub Issue #42 of owner/repo. You did not write this change, and you have no context from the session that did. New files may be untracked, so read the change with \`git diff HEAD\` and \`git status --short\`, and read each untracked file.

Read the Issue with \`gh issue view 42 --repo owner/repo --json title,body\`, the change, and the code the change calls or is called by.

${POINTS}

${CLOSING}`;

interface Step {
  reply?: Record<string, unknown> | string;
  exit?: number;
  edit?: string;
}

const FINDING = { location: "a.ts:1", condition: "c", problem: "p", action: "a" };

const shaped = (session: string, findings: Record<string, unknown>[] = [], cost = 1): Record<string, unknown> => ({
  session_id: session,
  structured_output: { findings, verified: `${session} checked` },
  total_cost_usd: cost,
  duration_ms: 10,
});

const CLEAN: Record<string, Step> = { self: { reply: shaped("self-1") }, independent: { reply: shaped("ind-1") } };

function fakeReviewer(f: Fixture, plan: Record<string, Step>): void {
  writeFileSync(join(f.logs, "plan.json"), JSON.stringify(plan));
  writeFileSync(
    join(f.bin, "claude"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const logs = process.env.LOGS;
const args = process.argv.slice(2);
const stdin = fs.readFileSync(0, "utf8");
const resumed = args.includes("--resume") ? args[args.indexOf("--resume") + 1] : null;
const name = resumed === null ? "independent" : args.includes("--fork-session") ? "self" : "again-" + resumed;
fs.appendFileSync(logs + "/calls", name + "\\n");
fs.writeFileSync(logs + "/" + name + ".json", JSON.stringify({ cwd: process.cwd(), args, stdin }));
if (name === "self" || name === "independent") {
  fs.writeFileSync(logs + "/started-" + name, "");
  const other = logs + "/started-" + (name === "self" ? "independent" : "self");
  const until = Date.now() + 10000;
  while (!fs.existsSync(other)) {
    if (Date.now() > until) process.exit(9);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
}
const step = JSON.parse(fs.readFileSync(logs + "/plan.json", "utf8"))[name] || {};
if (step.edit) fs.writeFileSync(step.edit, "changed by the reviewer\\n");
if (step.reply !== undefined) process.stdout.write(typeof step.reply === "string" ? step.reply : JSON.stringify(step.reply));
process.exit(step.exit || 0);
`,
    { mode: 0o755 },
  );
}

function implemented(): Fixture {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, PASS_CHECK + SESSION_REPLY);
  assert.equal(run(f, ["implement", "--worktree", worktreeOf(f)]).status, 0);
  return f;
}

const review = (f: Fixture, ...extra: string[]) => run(f, ["review", "--worktree", worktreeOf(f), ...extra]);

const callOf = (f: Fixture, name: string): { cwd: string; args: string[]; stdin: string } =>
  JSON.parse(readFileSync(join(f.logs, `${name}.json`), "utf8"));

const callsOf = (f: Fixture): string[] =>
  existsSync(join(f.logs, "calls")) ? readFileSync(join(f.logs, "calls"), "utf8").split("\n").filter(Boolean) : [];

const flagValue = (args: string[], flag: string): string => args[args.indexOf(flag) + 1];

test("review returns accepted round 1 and appends its record to launch.json when both reviews find nothing", () => {
  const f = implemented();
  const before = launchRecord(worktreeOf(f));
  fakeReviewer(f, CLEAN);
  const result = review(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(typeof out.tree, "string");
  assert.deepEqual(out, {
    action: "review",
    ok: true,
    round: 1,
    tree: out.tree,
    verdict: "accepted",
    reviews: {
      self: { verdict: "accepted", findings: [], verified: "self-1 checked", session_id: "self-1", cost_usd: 1, duration_ms: 10 },
      independent: { verdict: "accepted", findings: [], verified: "ind-1 checked", session_id: "ind-1", cost_usd: 1, duration_ms: 10 },
    },
  });
  const after = launchRecord(worktreeOf(f)) as Record<string, unknown> & { reviews: Record<string, unknown>[] };
  const { reviews, ...rest } = after;
  assert.deepEqual(rest, before);
  assert.equal(reviews.length, 1);
  assert.equal(typeof reviews[0].at, "string");
  assert.ok(!Number.isNaN(Date.parse(String(reviews[0].at))));
  assert.deepEqual(reviews[0], {
    round: 1,
    tree: out.tree,
    at: reviews[0].at,
    verdict: "accepted",
    self: { session_id: "self-1", verdict: "accepted", findings: [], verified: "self-1 checked" },
    independent: { session_id: "ind-1", verdict: "accepted", findings: [], verified: "ind-1 checked" },
  });
});

test("review starts self as a fork of the implement session and independent as a new session, both in the worktree with the read-only tools and the schema", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  const self = callOf(f, "self");
  const independent = callOf(f, "independent");
  const at = self.args.indexOf("--resume");
  assert.deepEqual(self.args.slice(at, at + 3), ["--resume", "s-1", "--fork-session"]);
  assert.ok(!independent.args.includes("--resume"));
  for (const call of [self, independent]) {
    assert.equal(call.cwd, realpathSync(worktreeOf(f)));
    assert.equal(flagValue(call.args, "--allowedTools"), "Read,Glob,Grep,LS");
    assert.deepEqual(JSON.parse(flagValue(call.args, "--json-schema")), REVIEW_SCHEMA);
    assert.equal(flagValue(call.args, "--model"), "opus");
  }
  assert.deepEqual(callsOf(f).sort(), ["independent", "self"]);
});

test("review passes --model to both reviews", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f, "--model", "sonnet").status, 0);
  assert.equal(flagValue(callOf(f, "self").args, "--model"), "sonnet");
  assert.equal(flagValue(callOf(f, "independent").args, "--model"), "sonnet");
});

test("review gives each review its full prompt with the Issue number and repository filled in", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  assert.equal(callOf(f, "self").stdin, SELF_PROMPT);
  assert.equal(callOf(f, "independent").stdin, INDEPENDENT_PROMPT);
});

test("review runs the two reviews at the same time", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  const result = review(f);
  assert.equal(result.status, 0, result.stdout);
  assert.ok(existsSync(join(f.logs, "started-self")));
  assert.ok(existsSync(join(f.logs, "started-independent")));
});

test("review is rejected with ok true when one side returns a required finding, and only that side is rejected", () => {
  for (const side of ["self", "independent"] as const) {
    const f = implemented();
    const other = side === "self" ? "independent" : "self";
    fakeReviewer(f, { ...CLEAN, [side]: { reply: shaped(`${side}-1`, [{ required: true, ...FINDING }]) } });
    const result = review(f);
    assert.equal(result.status, 0, result.stderr);
    const out = outputOf(result) as { ok: boolean; verdict: string; reviews: Record<string, { verdict: string }> };
    assert.equal(out.ok, true);
    assert.equal(out.verdict, "rejected", side);
    assert.equal(out.reviews[side].verdict, "rejected", side);
    assert.equal(out.reviews[other].verdict, "accepted", side);
    const record = (launchRecord(worktreeOf(f)) as { reviews: Record<string, Record<string, unknown>>[] }).reviews[0];
    assert.equal(record.verdict, "rejected");
    assert.equal(record[side].verdict, "rejected");
  }
});

test("review is accepted when every finding has required false", () => {
  const f = implemented();
  fakeReviewer(f, { ...CLEAN, self: { reply: shaped("self-1", [{ required: false, ...FINDING }]) } });
  const result = review(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result) as { verdict: string; reviews: { self: { verdict: string; findings: unknown[] } } };
  assert.equal(out.verdict, "accepted");
  assert.equal(out.reviews.self.verdict, "accepted");
  assert.deepEqual(out.reviews.self.findings, [{ required: false, ...FINDING }]);
});

test("a second review is round 2 and leaves two records in launch.json", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(outputOf(review(f)).round, 1);
  assert.equal(outputOf(review(f)).round, 2);
  const reviews = (launchRecord(worktreeOf(f)) as { reviews: { round: number }[] }).reviews;
  assert.deepEqual(reviews.map((entry) => entry.round), [1, 2]);
});

test("a review that gives no structured_output is asked once more in its own session without a fork, and its reply is used", () => {
  const f = implemented();
  fakeReviewer(f, {
    ...CLEAN,
    self: { reply: { session_id: "self-1", result: "prose", total_cost_usd: 3 } },
    "again-self-1": { reply: shaped("self-1", [], 2) },
  });
  const result = review(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result) as { reviews: { self: Record<string, unknown> } };
  assert.equal(out.reviews.self.cost_usd, 2);
  const again = callOf(f, "again-self-1");
  assert.equal(again.stdin, GIVE_REPLY);
  assert.equal(flagValue(again.args, "--resume"), "self-1");
  assert.ok(!again.args.includes("--fork-session"));
  assert.deepEqual(JSON.parse(flagValue(again.args, "--json-schema")), REVIEW_SCHEMA);
  assert.equal(callsOf(f).filter((name) => name.startsWith("again-")).length, 1);
});

test("review stops with review-failed, keeps launch.json, and returns the readable side when one side gives no readable result", () => {
  const unshaped = { session_id: "ind-1", result: "prose" };
  const cases: [string, Record<string, Step>][] = [
    ["the retry also gives no result", { independent: { reply: unshaped }, "again-ind-1": { reply: unshaped } }],
    ["the child exits non-zero", { independent: { reply: shaped("ind-1"), exit: 3 } }],
    ["the child prints no JSON", { independent: { reply: "not json" } }],
    [
      "required is not boolean",
      {
        independent: { reply: shaped("ind-1", [{ required: "yes", ...FINDING }]) },
        "again-ind-1": { reply: shaped("ind-1", [{ required: "yes", ...FINDING }]) },
      },
    ],
  ];
  for (const [label, plan] of cases) {
    const f = implemented();
    const before = launchRecord(worktreeOf(f));
    fakeReviewer(f, { self: CLEAN.self, ...plan });
    const out = assertStopped(review(f), "review-failed") as { action: string; detail: string; reviews: Record<string, Record<string, unknown>> };
    assert.equal(out.action, "review", label);
    assert.match(out.detail, /independent/, label);
    assert.doesNotMatch(out.detail, /\bself\b/, label);
    assert.deepEqual(Object.keys(out.reviews), ["self"], label);
    assert.equal(out.reviews.self.session_id, "self-1", label);
    assert.deepEqual(launchRecord(worktreeOf(f)), before, label);
    assert.ok(callsOf(f).filter((name) => name.startsWith("again-")).length <= 1, label);
  }
});

test("review stops with review-failed naming both sides when neither gives a readable result", () => {
  const f = implemented();
  fakeReviewer(f, { self: { reply: "not json" }, independent: { exit: 4 } });
  const out = assertStopped(review(f), "review-failed") as { detail: string; reviews: Record<string, unknown> };
  assert.match(out.detail, /self/);
  assert.match(out.detail, /independent/);
  assert.deepEqual(out.reviews, {});
});

test("review stops with tree-changed and keeps launch.json when a review edits the worktree", () => {
  const f = implemented();
  const before = launchRecord(worktreeOf(f));
  fakeReviewer(f, { ...CLEAN, self: { ...CLEAN.self, edit: "README.md" } });
  const out = assertStopped(review(f), "tree-changed") as { reviews: Record<string, unknown> };
  assert.deepEqual(Object.keys(out.reviews).sort(), ["independent", "self"]);
  assert.deepEqual(launchRecord(worktreeOf(f)), before);
});

test("review stops with not-prepared, not-implemented, or not-done and starts no claude", () => {
  const unprepared = fixture();
  fakeReviewer(unprepared, CLEAN);
  assertStopped(run(unprepared, ["review", "--worktree", unprepared.repo]), "not-prepared");
  assert.deepEqual(callsOf(unprepared), []);

  const prepared = fixture();
  assert.equal(prepare(prepared).status, 0);
  fakeReviewer(prepared, CLEAN);
  assertStopped(review(prepared), "not-implemented");
  assert.deepEqual(callsOf(prepared), []);

  const unchecked = fixture();
  assert.equal(prepare(unchecked).status, 0);
  fakeClaude(unchecked, SESSION_REPLY);
  assertStopped(run(unchecked, ["implement", "--worktree", worktreeOf(unchecked)]), "not-done");
  fakeReviewer(unchecked, CLEAN);
  const out = assertStopped(review(unchecked), "not-done");
  assert.match(String(out.detail), /No check result is recorded/);
  assert.deepEqual(callsOf(unchecked), []);
});
