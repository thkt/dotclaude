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
    required: [],
    reviews: {
      self: { verdict: "accepted", findings: [], previous: [], verified: "self-1 checked", session_id: "self-1", cost_usd: 1, duration_ms: 10 },
      independent: { verdict: "accepted", findings: [], previous: [], verified: "ind-1 checked", session_id: "ind-1", cost_usd: 1, duration_ms: 10 },
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
    required: [],
    self: { session_id: "self-1", verdict: "accepted", findings: [], previous: [], verified: "self-1 checked" },
    independent: { session_id: "ind-1", verdict: "accepted", findings: [], previous: [], verified: "ind-1 checked" },
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

const SELF_REQUIRED = { required: true, location: "a.ts:1", condition: "c1", problem: "p1", action: "a1" };
const SELF_OPTIONAL = { required: false, location: "a.ts:2", condition: "c2", problem: "p2", action: "a2" };
const INDEPENDENT_REQUIRED = { required: true, location: "", condition: "c3", problem: "p3", action: "a3" };

const REJECTED: Record<string, Step> = {
  self: { reply: shaped("self-1", [SELF_REQUIRED, SELF_OPTIONAL]) },
  independent: { reply: shaped("ind-1", [INDEPENDENT_REQUIRED]) },
};

const repairPromptWith = (lines: string): string => `The reviews of your uncommitted change for Issue #42 reported findings that must be settled before the change is published. Each line below is one finding as a JSON object. \`key\` names the finding, \`side\` is the review that reported it, \`location\` is where it is, \`condition\` is the input or state that triggers it, \`problem\` is what goes wrong, and \`action\` is what the review suggests. \`reopened\` lists the reviews that judged the finding still open after an earlier repair, each with its reason.

${lines}

1. For each finding, read the code it names and reproduce the problem, and judge whether the finding holds. Fix each finding that holds, and add or change a test that fails without the fix. Do not change the scope of the Issue.
2. Run \`${DONE_GATE} check\`. Fix what fails and run it again.
3. You are done when \`${DONE_GATE} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: for each finding, its \`key\` and what you changed, or why you changed nothing; the files you changed; and what \`${DONE_GATE} status\` printed.
`;

const REPAIR_PROMPT = repairPromptWith(`{"key":"1-self-1","side":"self","location":"a.ts:1","condition":"c1","problem":"p1","action":"a1","reopened":[]}
{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3","reopened":[]}`);

const REPAIR_REPLY = `echo '{"session_id":"s-1","result":"repaired","total_cost_usd":0.7,"duration_ms":900}'\n`;
const EDIT_FILE = "echo fixed >> README.md\n";

function fakeRepairer(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\necho call >> "$LOGS/repair-calls"\npwd -P > "$LOGS/repair-cwd"\nprintf '%s\\n' "$@" > "$LOGS/repair-args"\ncat > "$LOGS/repair-stdin"\n${body}`,
    { mode: 0o755 },
  );
}

const repairCalls = (f: Fixture): number =>
  existsSync(join(f.logs, "repair-calls")) ? readFileSync(join(f.logs, "repair-calls"), "utf8").split("\n").filter(Boolean).length : 0;

const repair = (f: Fixture, ...extra: string[]) => run(f, ["repair", "--worktree", worktreeOf(f), ...extra]);

function rejected(): Fixture {
  const f = implemented();
  fakeReviewer(f, REJECTED);
  const result = review(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).verdict, "rejected");
  return f;
}

type Stored = Record<string, unknown> & { reviews: Record<string, unknown>[]; repairs: Record<string, unknown>[] };

test("repair resumes the implement session, appends round 1 to repairs, and reports ok with changed true when the child edits and passes the check", () => {
  const f = rejected();
  const before = launchRecord(worktreeOf(f)) as Stored;
  fakeRepairer(f, EDIT_FILE + PASS_CHECK + REPAIR_REPLY);
  const result = repair(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(typeof out.tree, "string");
  assert.notEqual(out.tree, before.reviews[0].tree);
  assert.deepEqual(out, {
    action: "repair",
    ok: true,
    round: 1,
    review_round: 1,
    session_id: "s-1",
    tree: out.tree,
    changed: true,
    result: "repaired",
    cost_usd: 0.7,
    duration_ms: 900,
  });
  const after = launchRecord(worktreeOf(f)) as Stored;
  const { repairs, ...rest } = after;
  assert.deepEqual(rest, before);
  assert.equal(repairs.length, 1);
  assert.ok(!Number.isNaN(Date.parse(String(repairs[0].at))));
  assert.deepEqual(repairs[0], {
    round: 1,
    review_round: 1,
    session_id: "s-1",
    tree: out.tree,
    changed: true,
    reply: "repaired",
    at: repairs[0].at,
  });
});

test("repair starts claude in the worktree resuming the implement session without a fork or a schema, with implement's tools and model", () => {
  const f = rejected();
  const implementArgs = readFileSync(join(f.logs, "args"), "utf8").split("\n");
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  assert.equal(readFileSync(join(f.logs, "repair-cwd"), "utf8").trim(), realpathSync(worktreeOf(f)));
  const args = readFileSync(join(f.logs, "repair-args"), "utf8").split("\n");
  assert.equal(flagValue(args, "--resume"), "s-1");
  assert.ok(!args.includes("--fork-session"));
  assert.ok(!args.includes("--json-schema"));
  assert.equal(flagValue(args, "--allowedTools"), flagValue(implementArgs, "--allowedTools"));
  assert.equal(flagValue(args, "--model"), "opus");
});

test("repair passes --model to claude", () => {
  const f = rejected();
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f, "--model", "sonnet").status, 0);
  assert.equal(flagValue(readFileSync(join(f.logs, "repair-args"), "utf8").split("\n"), "--model"), "sonnet");
});

test("repair passes every entry of the last review's required list in order as JSON lines with key and reopened in the full prompt", () => {
  const f = rejected();
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  assert.equal(readFileSync(join(f.logs, "repair-stdin"), "utf8"), REPAIR_PROMPT);
});

test("repair reports ok with changed false and records the round when the child changes nothing", () => {
  const f = rejected();
  fakeRepairer(f, REPAIR_REPLY);
  const result = repair(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(out.ok, true);
  assert.equal(out.changed, false);
  const stored = launchRecord(worktreeOf(f)) as Stored;
  assert.equal(stored.repairs.length, 1);
  assert.equal(stored.repairs[0].changed, false);
  assert.equal(out.tree, stored.reviews[0].tree);
});

test("repair stops with not-done and still records the round when the child edits without passing the check", () => {
  const f = rejected();
  fakeRepairer(f, EDIT_FILE + REPAIR_REPLY);
  const out = assertStopped(repair(f), "not-done");
  assert.equal(out.action, "repair");
  assert.equal(out.changed, true);
  assert.equal(out.round, 1);
  assert.deepEqual(Object.keys(out).sort(), [
    "action",
    "changed",
    "cost_usd",
    "detail",
    "duration_ms",
    "ok",
    "reason",
    "result",
    "review_round",
    "round",
    "session_id",
    "tree",
  ]);
  const stored = launchRecord(worktreeOf(f)) as Stored;
  assert.equal(stored.repairs.length, 1);
  assert.equal(stored.repairs[0].changed, true);
});

test("repair run again after a repair that changed the tree stops with review-stale and starts no claude", () => {
  const f = rejected();
  fakeRepairer(f, EDIT_FILE + PASS_CHECK + REPAIR_REPLY);
  const first = outputOf(repair(f));
  assert.equal(repairCalls(f), 1);
  const before = launchRecord(worktreeOf(f));
  const out = assertStopped(repair(f), "review-stale");
  const reviewed = String((before as Stored).reviews[0].tree);
  assert.ok(String(out.detail).includes(reviewed));
  assert.ok(String(out.detail).includes(String(first.tree)));
  assert.equal(repairCalls(f), 1);
  assert.deepEqual(launchRecord(worktreeOf(f)), before);
});

test("repair after a new rejected review is round 2 and leaves two records in repairs", () => {
  const f = rejected();
  fakeRepairer(f, EDIT_FILE + PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  fakeReviewer(f, BOTH_OPEN);
  assert.equal(outputOf(review(f)).round, 2);
  fakeRepairer(f, EDIT_FILE + PASS_CHECK + REPAIR_REPLY);
  const result = repair(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(out.round, 2);
  assert.equal(out.review_round, 2);
  const repairs = (launchRecord(worktreeOf(f)) as Stored).repairs;
  assert.deepEqual(repairs.map((entry) => [entry.round, entry.review_round]), [[1, 1], [2, 2]]);
});

test("repair stops with not-prepared, not-implemented, not-reviewed, or nothing-to-repair, starts no claude, and keeps launch.json", () => {
  const unprepared = fixture();
  fakeRepairer(unprepared, REPAIR_REPLY);
  assertStopped(run(unprepared, ["repair", "--worktree", unprepared.repo]), "not-prepared");
  assert.equal(repairCalls(unprepared), 0);

  const prepared = fixture();
  assert.equal(prepare(prepared).status, 0);
  const preparedRecord = launchRecord(worktreeOf(prepared));
  fakeRepairer(prepared, REPAIR_REPLY);
  assertStopped(repair(prepared), "not-implemented");
  assert.equal(repairCalls(prepared), 0);
  assert.deepEqual(launchRecord(worktreeOf(prepared)), preparedRecord);

  const unreviewed = implemented();
  const unreviewedRecord = launchRecord(worktreeOf(unreviewed));
  fakeRepairer(unreviewed, REPAIR_REPLY);
  assertStopped(repair(unreviewed), "not-reviewed");
  assert.equal(repairCalls(unreviewed), 0);
  assert.deepEqual(launchRecord(worktreeOf(unreviewed)), unreviewedRecord);

  const accepted = implemented();
  fakeReviewer(accepted, CLEAN);
  assert.equal(review(accepted).status, 0);
  const acceptedRecord = launchRecord(worktreeOf(accepted));
  fakeRepairer(accepted, REPAIR_REPLY);
  assertStopped(repair(accepted), "nothing-to-repair");
  assert.equal(repairCalls(accepted), 0);
  assert.deepEqual(launchRecord(worktreeOf(accepted)), acceptedRecord);
});

test("repair stops with not-reviewed when reviews is not an array or is empty", () => {
  for (const reviews of [{}, []]) {
    const f = implemented();
    const dir = git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
    writeFileSync(join(dir, "launch.json"), `${JSON.stringify({ ...launchRecord(worktreeOf(f)), reviews })}\n`);
    fakeRepairer(f, REPAIR_REPLY);
    assertStopped(repair(f), "not-reviewed");
    assert.equal(repairCalls(f), 0);
  }
});

test("repair stops with child-failed and keeps launch.json when claude exits non-zero, prints no JSON, or gives no session_id", () => {
  for (const body of [`${REPAIR_REPLY}exit 3\n`, "echo 'not json'\n", `echo '{"result":"repaired"}'\n`]) {
    const f = rejected();
    const before = launchRecord(worktreeOf(f));
    fakeRepairer(f, body);
    assertStopped(repair(f), "child-failed");
    assert.deepEqual(launchRecord(worktreeOf(f)), before, body);
  }
});

test("a repair call without --worktree or with a relative path prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  for (const args of [["repair"], ["repair", "--model", "opus"], ["repair", "--worktree", "relative/worktree"]]) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
});

const EARLIER_KEYS = ["1-self-1", "1-independent-1"];

const judging = (
  session: string,
  states: Record<string, string>,
  findings: Record<string, unknown>[] = [],
): Record<string, unknown> => ({
  session_id: session,
  structured_output: {
    findings,
    verified: `${session} checked`,
    previous: Object.entries(states).map(([key, state]) => ({ key, state, reason: `${session} saw ${key} ${state}` })),
  },
  total_cost_usd: 1,
  duration_ms: 10,
});

const allStates = (state: string): Record<string, string> => Object.fromEntries(EARLIER_KEYS.map((key) => [key, state]));

const BOTH_OPEN: Record<string, Step> = {
  self: { reply: judging("self-2", allStates("open")) },
  independent: { reply: judging("ind-2", allStates("open")) },
};

const JUDGING_SCHEMA = {
  ...REVIEW_SCHEMA,
  required: ["findings", "verified", "previous"],
  properties: {
    ...REVIEW_SCHEMA.properties,
    previous: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "state", "reason"],
        properties: {
          key: { type: "string" },
          state: { type: "string", enum: ["fixed", "open", "withdrawn"] },
          reason: { type: "string" },
        },
      },
    },
  },
};

const EARLIER = `An earlier review round reported the findings below as required, and the change may have been repaired since. Each line is one finding as a JSON object with its \`key\`.

{"key":"1-self-1","side":"self","location":"a.ts:1","condition":"c1","problem":"p1","action":"a1"}
{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3"}`;

const JUDGE = "Judge each earlier finding against the current change. In `previous`, return exactly one entry for every `key`. `state` is `fixed` when the problem no longer occurs, `open` when it still occurs, and `withdrawn` when you now judge that the finding did not hold. `reason` says what you checked and what you saw. Do not repeat an earlier finding in `findings`. `findings` is for problems the earlier rounds did not report.";

const REPLY_PARAGRAPH = `The implementing session replied to the earlier findings as follows. Treat the reply as a claim to check, not as a fact.

repaired`;

const SELF_JUDGING_PROMPT = `Before your uncommitted change for Issue #42 is published, review it yourself and try to refute it. Read the change again with \`git diff HEAD\` and \`git status --short\`, each untracked file, and the code the change calls or is called by.

${EARLIER}

${JUDGE}

${POINTS}

${CLOSING}`;

const independentJudgingPrompt = (reply: string | null): string => `Independently review the uncommitted change in this worktree against GitHub Issue #42 of owner/repo. You did not write this change, and you have no context from the session that did. New files may be untracked, so read the change with \`git diff HEAD\` and \`git status --short\`, and read each untracked file.

Read the Issue with \`gh issue view 42 --repo owner/repo --json title,body\`, the change, and the code the change calls or is called by.

${EARLIER}

${reply === null ? "" : `${reply}\n\n`}${JUDGE}

${POINTS}

${CLOSING}`;

function rewriteLaunch(f: Fixture, change: (stored: Record<string, unknown>) => Record<string, unknown>): void {
  const dir = git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  writeFileSync(join(dir, "launch.json"), `${JSON.stringify(change(launchRecord(worktreeOf(f))), null, 2)}\n`);
}

type ReviewOut = {
  verdict: string;
  required: Record<string, unknown>[];
  reviews: Record<string, { verdict: string; previous: unknown[] }>;
};

const reviewOut = (f: Fixture): ReviewOut => {
  const result = review(f);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return outputOf(result) as unknown as ReviewOut;
};

const lastReview = (f: Fixture): Record<string, unknown> & { required: Record<string, unknown>[] } => {
  const reviews = (launchRecord(worktreeOf(f)) as Stored).reviews;
  return reviews[reviews.length - 1] as Record<string, unknown> & { required: Record<string, unknown>[] };
};

const REQUIRED_FIELDS = ["key", "side", "location", "condition", "problem", "action", "reopened"];

test("review lists the required findings of round 1 as self then independent with keys named by round, side, and position, and no reopened", () => {
  const f = implemented();
  fakeReviewer(f, {
    self: { reply: shaped("self-1", [SELF_REQUIRED, SELF_OPTIONAL, { ...SELF_REQUIRED, condition: "c4" }]) },
    independent: { reply: shaped("ind-1", [INDEPENDENT_REQUIRED]) },
  });
  const out = reviewOut(f);
  const expected = [
    { key: "1-self-1", side: "self", location: "a.ts:1", condition: "c1", problem: "p1", action: "a1", reopened: [] },
    { key: "1-self-2", side: "self", location: "a.ts:1", condition: "c4", problem: "p1", action: "a1", reopened: [] },
    { key: "1-independent-1", side: "independent", location: "", condition: "c3", problem: "p3", action: "a3", reopened: [] },
  ];
  assert.deepEqual(out.required, expected);
  assert.deepEqual(lastReview(f).required, expected);
  for (const entry of [...out.required, ...lastReview(f).required]) assert.deepEqual(Object.keys(entry), REQUIRED_FIELDS);
});

test("review gives the round-1 prompts and schema when the last record has no required finding, no required array, or reviews is empty", () => {
  const cases: [string, (f: Fixture) => void][] = [
    ["required is empty", (f) => {
      fakeReviewer(f, CLEAN);
      reviewOut(f);
    }],
    ["required is not an array", (f) => rewriteLaunch(f, (stored) => ({ ...stored, reviews: [{ round: 1, verdict: "rejected" }] }))],
    ["reviews is empty", (f) => rewriteLaunch(f, (stored) => ({ ...stored, reviews: [] }))],
  ];
  for (const [label, arrange] of cases) {
    const f = implemented();
    arrange(f);
    fakeReviewer(f, CLEAN);
    reviewOut(f);
    for (const [name, prompt] of [["self", SELF_PROMPT], ["independent", INDEPENDENT_PROMPT]]) {
      assert.equal(callOf(f, name).stdin, prompt, label);
      assert.deepEqual(JSON.parse(flagValue(callOf(f, name).args, "--json-schema")), REVIEW_SCHEMA, label);
    }
  }
});

test("a review after a round with required findings gives both reviews the earlier findings in order and the judging paragraph, with the judging schema", () => {
  const f = rejected();
  fakeReviewer(f, BOTH_OPEN);
  reviewOut(f);
  assert.equal(callOf(f, "self").stdin, SELF_JUDGING_PROMPT);
  assert.equal(callOf(f, "independent").stdin, independentJudgingPrompt(null));
  for (const name of ["self", "independent"]) {
    assert.deepEqual(JSON.parse(flagValue(callOf(f, name).args, "--json-schema")), JUDGING_SCHEMA, name);
  }
});

test("the implementing session's reply to the last reviewed round reaches only the independent review", () => {
  const f = rejected();
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  fakeReviewer(f, BOTH_OPEN);
  reviewOut(f);
  assert.equal(callOf(f, "self").stdin, SELF_JUDGING_PROMPT);
  assert.equal(callOf(f, "independent").stdin, independentJudgingPrompt(REPLY_PARAGRAPH));
});

test("no review gets the reply paragraph when the last repair answered another round, its reply is empty, or there is no repair", () => {
  const cases: [string, (repairs: Record<string, unknown>[]) => unknown][] = [
    ["another round", (repairs) => [{ ...repairs[0], review_round: 0 }]],
    ["empty reply", (repairs) => [{ ...repairs[0], reply: "" }]],
    ["no repairs", () => undefined],
  ];
  for (const [label, change] of cases) {
    const f = rejected();
    fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
    assert.equal(repair(f).status, 0);
    rewriteLaunch(f, (stored) => ({ ...stored, repairs: change((stored as Stored).repairs) }));
    fakeReviewer(f, BOTH_OPEN);
    reviewOut(f);
    assert.equal(callOf(f, "self").stdin, SELF_JUDGING_PROMPT, label);
    assert.equal(callOf(f, "independent").stdin, independentJudgingPrompt(null), label);
  }
});

test("review is accepted with no required finding when both reviews judge every earlier finding fixed and report nothing new", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", allStates("fixed")) },
    independent: { reply: judging("ind-2", allStates("fixed")) },
  });
  const out = reviewOut(f);
  assert.equal(out.verdict, "accepted");
  assert.deepEqual(out.required, []);
  assert.equal(lastReview(f).verdict, "accepted");
});

test("an earlier finding that only independent judges open stays required under its key with independent's reason, and only independent is rejected", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", allStates("fixed")) },
    independent: { reply: judging("ind-2", { "1-self-1": "open", "1-independent-1": "fixed" }) },
  });
  const out = reviewOut(f);
  const expected = [
    {
      key: "1-self-1",
      side: "self",
      location: "a.ts:1",
      condition: "c1",
      problem: "p1",
      action: "a1",
      reopened: [{ side: "independent", reason: "ind-2 saw 1-self-1 open" }],
    },
  ];
  assert.deepEqual(out.required, expected);
  assert.deepEqual(Object.keys(out.required[0]), REQUIRED_FIELDS);
  assert.equal(out.verdict, "rejected");
  assert.equal(out.reviews.self.verdict, "accepted");
  assert.equal(out.reviews.independent.verdict, "rejected");
  const record = lastReview(f) as Record<string, unknown> & { required: unknown[]; self: { previous: unknown[] }; independent: { previous: unknown[] } };
  assert.deepEqual(record.required, expected);
  assert.equal(record.verdict, "rejected");
  assert.deepEqual(record.self.previous, (judging("self-2", allStates("fixed")).structured_output as { previous: unknown[] }).previous);
  assert.deepEqual(out.reviews.independent.previous, record.independent.previous);
  assert.equal(record.independent.previous.length, 2);
});

test("an earlier finding that both reviews judge open lists self then independent in reopened", () => {
  const f = rejected();
  fakeReviewer(f, BOTH_OPEN);
  const out = reviewOut(f);
  assert.deepEqual(out.required.map((entry) => entry.key), EARLIER_KEYS);
  assert.deepEqual(out.required[0].reopened, [
    { side: "self", reason: "self-2 saw 1-self-1 open" },
    { side: "independent", reason: "ind-2 saw 1-self-1 open" },
  ]);
});

test("an earlier finding judged withdrawn does not stay required", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", { "1-self-1": "withdrawn", "1-independent-1": "fixed" }) },
    independent: { reply: judging("ind-2", { "1-self-1": "withdrawn", "1-independent-1": "fixed" }) },
  });
  const out = reviewOut(f);
  assert.deepEqual(out.required, []);
  assert.equal(out.verdict, "accepted");
});

test("in round 2 the earlier finding still open comes before the new required finding 2-self-1", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", { "1-self-1": "fixed", "1-independent-1": "open" }, [SELF_OPTIONAL, { ...SELF_REQUIRED, condition: "c9" }]) },
    independent: { reply: judging("ind-2", allStates("fixed")) },
  });
  const out = reviewOut(f);
  assert.deepEqual(out.required.map((entry) => entry.key), ["1-independent-1", "2-self-1"]);
  assert.deepEqual(out.required[1], {
    key: "2-self-1",
    side: "self",
    location: "a.ts:1",
    condition: "c9",
    problem: "p1",
    action: "a1",
    reopened: [],
  });
});

test("a judging review whose previous is missing, misses a key, names an unknown key, repeats a key, or gives an unknown state is asked once more, then stops with review-failed", () => {
  const withPrevious = (previous: unknown): Record<string, unknown> => ({
    session_id: "ind-2",
    structured_output: { findings: [], verified: "v", ...(previous === undefined ? {} : { previous }) },
  });
  const entry = (key: string, state = "fixed") => ({ key, state, reason: "r" });
  const cases: [string, unknown][] = [
    ["no previous", undefined],
    ["a key is missing", [entry("1-self-1")]],
    ["an unknown key", [entry("1-self-1"), entry("1-independent-1"), entry("9-self-1")]],
    ["a key twice", [entry("1-self-1"), entry("1-self-1")]],
    ["an unknown state", [entry("1-self-1"), entry("1-independent-1", "gone")]],
  ];
  for (const [label, previous] of cases) {
    const f = rejected();
    const before = launchRecord(worktreeOf(f));
    fakeReviewer(f, { self: BOTH_OPEN.self, independent: { reply: withPrevious(previous) }, "again-ind-2": { reply: withPrevious(previous) } });
    const out = assertStopped(review(f), "review-failed") as { detail: string };
    assert.match(out.detail, /independent/, label);
    assert.deepEqual(callsOf(f).filter((name) => name.startsWith("again-")), ["again-ind-2"], label);
    assert.deepEqual(JSON.parse(flagValue(callOf(f, "again-ind-2").args, "--json-schema")), JUDGING_SCHEMA, label);
    assert.deepEqual(launchRecord(worktreeOf(f)), before, label);
  }
});

test("a judging review asked once more for a previous that misses a key uses the reply when it judges every key", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: BOTH_OPEN.self,
    independent: { reply: judging("ind-2", { "1-self-1": "open" }) },
    "again-ind-2": BOTH_OPEN.independent,
  });
  const out = reviewOut(f);
  assert.equal(out.reviews.independent.previous.length, 2);
});

test("repair passes a reopened finding carried from an earlier round with its key and reopened, before the new finding", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", { "1-self-1": "fixed", "1-independent-1": "open" }, [{ ...SELF_REQUIRED, condition: "c9" }]) },
    independent: { reply: judging("ind-2", allStates("fixed")) },
  });
  reviewOut(f);
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  assert.equal(
    readFileSync(join(f.logs, "repair-stdin"), "utf8"),
    repairPromptWith(`{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3","reopened":[{"side":"self","reason":"self-2 saw 1-independent-1 open"}]}
{"key":"2-self-1","side":"self","location":"a.ts:1","condition":"c9","problem":"p1","action":"a1","reopened":[]}`),
  );
});

test("repair stops with not-reviewed when the last record has no required array and with nothing-to-repair when it is empty, and starts no claude", () => {
  const cases: [string, unknown][] = [
    ["not-reviewed", undefined],
    ["not-reviewed", "1-self-1"],
    ["nothing-to-repair", []],
  ];
  for (const [reason, required] of cases) {
    const f = rejected();
    rewriteLaunch(f, (stored) => {
      const reviews = (stored as Stored).reviews;
      return { ...stored, reviews: [{ ...reviews[0], verdict: "rejected", required }] };
    });
    const before = launchRecord(worktreeOf(f));
    fakeRepairer(f, REPAIR_REPLY);
    assertStopped(repair(f), reason);
    assert.equal(repairCalls(f), 0, String(required));
    assert.deepEqual(launchRecord(worktreeOf(f)), before);
  }
});

test("repair records the child's result as reply, and an empty string when the result is not a string", () => {
  const cases: [string, string][] = [
    [REPAIR_REPLY, "repaired"],
    [`echo '{"session_id":"s-1","result":{"text":"x"}}'\n`, ""],
    [`echo '{"session_id":"s-1"}'\n`, ""],
  ];
  for (const [body, reply] of cases) {
    const f = rejected();
    fakeRepairer(f, PASS_CHECK + body);
    const result = repair(f);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!("reply" in outputOf(result)), "the success JSON keeps its fields");
    assert.equal((launchRecord(worktreeOf(f)) as Stored).repairs[0].reply, reply, body);
  }
});

interface Turn {
  reply?: Record<string, unknown> | string;
  exit?: number;
  edit?: boolean;
  check?: boolean;
}

type Script = Partial<Record<"implement" | "self" | "independent" | "repair", Turn[]>>;

function fakeRounds(f: Fixture, script: Script): void {
  writeFileSync(join(f.logs, "script.json"), JSON.stringify(script));
  writeFileSync(
    join(f.bin, "claude"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const logs = process.env.LOGS;
const args = process.argv.slice(2);
fs.readFileSync(0, "utf8");
const schema = args.includes("--json-schema");
const resumed = args.includes("--resume");
const role = schema ? (resumed ? (args.includes("--fork-session") ? "self" : "again") : "independent") : resumed ? "repair" : "implement";
const log = logs + "/run-calls";
const index = (fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\\n") : []).filter((line) => line.startsWith(role + " ")).length;
fs.appendFileSync(log, role + " " + JSON.stringify(args) + "\\n");
const turn = (JSON.parse(fs.readFileSync(logs + "/script.json", "utf8"))[role] || [])[index] || {};
if (turn.edit) fs.appendFileSync("README.md", role + " " + index + "\\n");
if (turn.check) spawnSync(process.env.NODE, [process.env.DONE_GATE, "check"], { stdio: "ignore" });
if (turn.reply !== undefined) process.stdout.write(typeof turn.reply === "string" ? turn.reply : JSON.stringify(turn.reply));
process.exit(turn.exit || 0);
`,
    { mode: 0o755 },
  );
}

const roundCalls = (f: Fixture): { role: string; args: string[] }[] =>
  existsSync(join(f.logs, "run-calls"))
    ? readFileSync(join(f.logs, "run-calls"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => ({ role: line.slice(0, line.indexOf(" ")), args: JSON.parse(line.slice(line.indexOf(" ") + 1)) }))
    : [];

const IMPLEMENTED: Turn = { check: true, reply: { session_id: "s-1", result: "finished", total_cost_usd: 0.5, duration_ms: 1200 } };
const REPAIRED: Turn = { edit: true, check: true, reply: { session_id: "s-1", result: "repaired", total_cost_usd: 0.25, duration_ms: 900 } };
const UNCHANGED: Turn = { reply: { session_id: "s-1", result: "nothing to change", total_cost_usd: 0.25, duration_ms: 900 } };

const judged = (session: string, states: Record<string, string>, findings: Record<string, unknown>[] = []): Turn => ({
  reply: judging(session, states, findings),
});

const runLaunch = (f: Fixture, ...extra: string[]) => run(f, ["run", "--worktree", worktreeOf(f), ...extra]);

type RunOut = {
  action: string;
  ok: boolean;
  verdict: string | null;
  required: Record<string, unknown>[];
  rounds: number;
  steps: Record<string, unknown>[];
  cost_usd: number;
  reason?: string;
  detail?: string;
};

const runOut = (result: SpawnSyncReturns<string>): RunOut => outputOf(result) as unknown as RunOut;

const actionsOf = (out: RunOut): unknown[] => out.steps.map((step) => step.action);

const prepared = (): Fixture => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  return f;
};

test("run on a prepared worktree implements, reviews, and completes with accepted round 1 when both reviews find nothing", () => {
  const f = prepared();
  fakeRounds(f, { implement: [IMPLEMENTED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(
    { action: out.action, ok: out.ok, verdict: out.verdict, required: out.required, rounds: out.rounds },
    { action: "run", ok: true, verdict: "accepted", required: [], rounds: 1 },
  );
  assert.deepEqual(Object.keys(out), ["action", "ok", "verdict", "required", "rounds", "steps", "cost_usd"]);
  assert.deepEqual(out.steps, [
    { action: "implement", ok: true, cost_usd: 0.5, duration_ms: 1200 },
    { action: "review", ok: true, round: 1, verdict: "accepted", required_keys: [], cost_usd: 2 },
  ]);
  assert.equal(out.cost_usd, 2.5);
});

const REJECTED_SCRIPT: Script = {
  implement: [IMPLEMENTED],
  self: [REJECTED.self as Turn],
  independent: [REJECTED.independent as Turn],
};

test("run repairs a rejected round and completes when the next review judges every finding fixed, summing the cost of each step", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, judged("self-2", allStates("fixed"))],
    independent: [REJECTED.independent as Turn, judged("ind-2", allStates("fixed"))],
    repair: [REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.ok, true);
  assert.equal(out.verdict, "accepted");
  assert.equal(out.rounds, 2);
  assert.deepEqual(out.steps, [
    { action: "implement", ok: true, cost_usd: 0.5, duration_ms: 1200 },
    { action: "review", ok: true, round: 1, verdict: "rejected", required_keys: EARLIER_KEYS, cost_usd: 2 },
    { action: "repair", ok: true, round: 1, changed: true, cost_usd: 0.25, duration_ms: 900 },
    { action: "review", ok: true, round: 2, verdict: "accepted", required_keys: [], cost_usd: 2 },
  ]);
  assert.equal(out.cost_usd, 0.5 + 2 + 0.25 + 2);
});

test("run writes one JSON line per action to stderr with the running total, and the last total equals the stdout cost", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, judged("self-2", allStates("fixed"))],
    independent: [REJECTED.independent as Turn, judged("ind-2", allStates("fixed"))],
    repair: [REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  const lines = result.stderr.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  let total = 0;
  assert.deepEqual(
    lines,
    out.steps.map((step) => {
      total += step.cost_usd as number;
      return { ...step, total_cost_usd: total };
    }),
  );
  assert.equal(lines.length, 4);
  assert.equal(lines[lines.length - 1].total_cost_usd, out.cost_usd);
});

test("run stops with disagreement after one repair when the repair changes nothing and the next review keeps the finding open", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, BOTH_OPEN.self as Turn],
    independent: [REJECTED.independent as Turn, BOTH_OPEN.independent as Turn],
    repair: [UNCHANGED, UNCHANGED],
  });
  const out = assertStopped(runLaunch(f), "disagreement") as unknown as RunOut;
  assert.equal(out.action, "run");
  assert.deepEqual(out.required.map((entry) => entry.key), EARLIER_KEYS);
  assert.equal(out.verdict, "rejected");
  assert.equal(out.rounds, 2);
  assert.deepEqual(actionsOf(out), ["implement", "review", "repair", "review"]);
  assert.equal(roundCalls(f).filter((call) => call.role === "repair").length, 1);
});

test("run completes when the repair changes nothing and the next review withdraws every finding", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, judged("self-2", allStates("withdrawn"))],
    independent: [REJECTED.independent as Turn, judged("ind-2", allStates("withdrawn"))],
    repair: [UNCHANGED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.verdict, "accepted");
  assert.deepEqual(actionsOf(out), ["implement", "review", "repair", "review"]);
  assert.equal(out.steps[2].changed, false);
});

test("run repairs again without stopping when the repair changes nothing and the next review withdraws the finding but reports a new one", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [
      REJECTED.self as Turn,
      judged("self-2", allStates("withdrawn"), [SELF_REQUIRED]),
      judged("self-3", { "2-self-1": "fixed" }),
    ],
    independent: [
      REJECTED.independent as Turn,
      judged("ind-2", allStates("withdrawn")),
      judged("ind-3", { "2-self-1": "fixed" }),
    ],
    repair: [UNCHANGED, REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(actionsOf(out), ["implement", "review", "repair", "review", "repair", "review"]);
  assert.deepEqual(out.steps[3].required_keys, ["2-self-1"]);
  assert.equal(out.rounds, 3);
});

test("run stops with not-converging after round 3 when the same finding stays open after two repairs that changed the tree", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, BOTH_OPEN.self as Turn, judged("self-3", allStates("open"))],
    independent: [REJECTED.independent as Turn, BOTH_OPEN.independent as Turn, judged("ind-3", allStates("open"))],
    repair: [REPAIRED, REPAIRED, REPAIRED],
  });
  const out = assertStopped(runLaunch(f), "not-converging") as unknown as RunOut;
  assert.deepEqual(actionsOf(out), ["implement", "review", "repair", "review", "repair", "review"]);
  assert.equal(out.rounds, 3);
  assert.deepEqual(out.required.map((entry) => entry.key), EARLIER_KEYS);
});

test("run keeps repairing while each round reports a required finding under a new key, and completes when round 4 accepts", () => {
  const f = prepared();
  const newFinding = (round: number) => ({ ...SELF_REQUIRED, condition: `c${round}` });
  fakeRounds(f, {
    implement: [IMPLEMENTED],
    self: [
      { reply: shaped("self-1", [SELF_REQUIRED]) },
      judged("self-2", { "1-self-1": "fixed" }, [newFinding(2)]),
      judged("self-3", { "2-self-1": "fixed" }, [newFinding(3)]),
      judged("self-4", { "3-self-1": "fixed" }),
    ],
    independent: [
      { reply: shaped("ind-1") },
      judged("ind-2", { "1-self-1": "fixed" }),
      judged("ind-3", { "2-self-1": "fixed" }),
      judged("ind-4", { "3-self-1": "fixed" }),
    ],
    repair: [REPAIRED, REPAIRED, REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.verdict, "accepted");
  assert.equal(out.rounds, 4);
  assert.deepEqual(
    out.steps.filter((step) => step.action === "review").map((step) => step.required_keys),
    [["1-self-1"], ["2-self-1"], ["3-self-1"], []],
  );
});

test("run stops with the reason and detail of an implement that fails, and implement is the last step", () => {
  const f = prepared();
  fakeRounds(f, { implement: [{ exit: 3 }, { exit: 3 }] });
  const out = assertStopped(runLaunch(f), "child-failed") as unknown as RunOut;
  assert.deepEqual(out.steps, [{ action: "implement", ok: false, reason: "child-failed" }]);
  assert.equal(out.verdict, null);
  assert.deepEqual(out.required, []);
  assert.equal(out.rounds, 0);
  assert.equal(out.cost_usd, 0);
  assert.equal(out.detail, outputOf(run(f, ["implement", "--worktree", worktreeOf(f)])).detail);
});

test("run stops with the reason and detail of a review that fails, and review is the last step", () => {
  const f = prepared();
  fakeRounds(f, {
    implement: [IMPLEMENTED],
    self: [{ reply: shaped("self-1") }, { reply: shaped("self-1") }],
    independent: [{ reply: "not json" }, { reply: "not json" }],
  });
  const out = assertStopped(runLaunch(f), "review-failed") as unknown as RunOut;
  assert.deepEqual(out.steps[out.steps.length - 1], { action: "review", ok: false, cost_usd: 1, reason: "review-failed" });
  assert.equal(out.rounds, 0);
  assert.equal(out.detail, outputOf(review(f)).detail);
});

test("run stops with the reason and detail of a repair that ends without passing the check, and repair is the last step", () => {
  const f = prepared();
  fakeRounds(f, { ...REJECTED_SCRIPT, repair: [{ ...REPAIRED, check: false }] });
  const out = assertStopped(runLaunch(f), "not-done") as unknown as RunOut;
  const last = out.steps[out.steps.length - 1];
  assert.deepEqual(last, { action: "repair", ok: false, round: 1, changed: true, cost_usd: 0.25, duration_ms: 900, reason: "not-done" });
  assert.match(String(out.detail), /^done_gate\.ts status is not done: /);
  assert.equal(out.verdict, "rejected");
});

test("run on a worktree whose round 1 was rejected starts with repair", () => {
  const f = rejected();
  fakeRounds(f, {
    self: [judged("self-2", allStates("fixed"))],
    independent: [judged("ind-2", allStates("fixed"))],
    repair: [REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["repair", "review"]);
});

test("run on an accepted worktree completes with no steps and zero cost, and starts no claude", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  fakeRounds(f, {});
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.ok, true);
  assert.equal(out.verdict, "accepted");
  assert.equal(out.rounds, 1);
  assert.deepEqual(out.steps, []);
  assert.equal(out.cost_usd, 0);
  assert.equal(result.stderr, "");
  assert.deepEqual(roundCalls(f), []);
});

test("run starts with review when the tree changed and passed the check after the last review", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  writeFileSync(join(worktreeOf(f), "README.md"), "edited outside run\n");
  const checked = spawnSync(process.execPath, [DONE_GATE, "check"], { cwd: worktreeOf(f), env: isolatedEnv(), encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
  fakeRounds(f, { self: [{ reply: shaped("self-2") }], independent: [{ reply: shaped("ind-2") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(actionsOf(out), ["review"]);
  assert.equal(out.rounds, 2);
});

test("run stops with not-prepared in a worktree that prepare did not set up, and starts no claude", () => {
  const f = fixture();
  fakeRounds(f, { implement: [IMPLEMENTED] });
  const out = assertStopped(run(f, ["run", "--worktree", f.repo]), "not-prepared") as unknown as RunOut;
  assert.deepEqual(out.steps, []);
  assert.equal(out.rounds, 0);
  assert.equal(out.verdict, null);
  assert.deepEqual(roundCalls(f), []);
});

test("run passes --model to every claude it starts", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, judged("self-2", allStates("fixed"))],
    independent: [REJECTED.independent as Turn, judged("ind-2", allStates("fixed"))],
    repair: [REPAIRED],
  });
  assert.equal(runLaunch(f, "--model", "sonnet").status, 0);
  const calls = roundCalls(f);
  assert.deepEqual(calls.map((call) => call.role).sort(), ["implement", "independent", "independent", "repair", "self", "self"]);
  for (const call of calls) assert.equal(flagValue(call.args, "--model"), "sonnet", call.role);
});

test("a run call without --worktree or with a relative path prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  for (const args of [["run"], ["run", "--model", "opus"], ["run", "--worktree", "relative/worktree"]]) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
});

test("run calls implement once and stops with no-progress when the implement child returns an empty session_id and exits 0", () => {
  const f = prepared();
  const empty: Turn = { ...IMPLEMENTED, reply: { session_id: "", result: "finished", total_cost_usd: 0.5, duration_ms: 1200 } };
  fakeRounds(f, { implement: [empty, empty, empty] });
  const out = assertStopped(runLaunch(f), "no-progress") as unknown as RunOut;
  assert.deepEqual(out.steps, [{ action: "implement", ok: true, cost_usd: 0.5, duration_ms: 1200 }]);
  assert.match(String(out.detail), /\bimplement\b/);
  assert.deepEqual(roundCalls(f).map((call) => call.role), ["implement"]);
});
