/// <reference types="node" />
import assert from "node:assert/strict";
import { type ChildProcess, type SpawnSyncReturns, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const SCRIPT = join(HERE, "..", "scripts", "launch.ts");

export const DONE_GATE = resolve(HERE, "..", "..", "..", "hooks", "lifecycle", "done_gate.ts");

export const ISSUE = 42;

export const FEATURE_TITLE = "[Feature] publish_gate.ts が、サブシェルの中の公開を見つける";

export const CONFIG = {
  repository: "owner/repo",
  remote: "origin",
  baseBranch: "main",
  setup: [],
  check: "true",
  ciChecks: ["test"],
  capture: null,
};

export const ISSUE_REPLY = { number: ISSUE, title: FEATURE_TITLE, body: "body", state: "OPEN" };

export const REPO_REPLY = { nameWithOwner: "owner/repo", viewerPermission: "WRITE" };

const REAL_GIT = spawnSync("/bin/sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();

export const remotesOf = (name: string, fetchUrl: string, pushUrl = fetchUrl): string =>
  `${name}\t${fetchUrl} (fetch)\n${name}\t${pushUrl} (push)\n`;

const DEFAULT_REMOTES = remotesOf("origin", "https://github.com/owner/repo.git");

export const digestOf = ({ title, body, state }: Record<string, unknown>): string =>
  createHash("sha256").update(JSON.stringify([title, body, state])).digest("hex");

export function isolatedEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "launch-test",
    GIT_AUTHOR_EMAIL: "launch-test@example.invalid",
    GIT_COMMITTER_NAME: "launch-test",
    GIT_COMMITTER_EMAIL: "launch-test@example.invalid",
  };
  for (const key of ["GIT_DIR", "GIT_INDEX_FILE", "GIT_WORK_TREE", "GIT_OBJECT_DIRECTORY", "GIT_COMMON_DIR", "GH_HOST"]) {
    delete env[key];
  }
  return { ...env, ...extra };
}

export function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, env: isolatedEnv(), encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

export function commitFile(repo: string, name: string, content: string): void {
  writeFileSync(join(repo, name), content);
  git(repo, "add", name);
  git(repo, "commit", "-q", "-m", `add ${name}`);
}

export interface Fixture {
  root: string;
  origin: string;
  repo: string;
  bin: string;
  logs: string;
}

export function fixture(config: Record<string, unknown> | null = CONFIG): Fixture {
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
  const f = { root, origin, repo, bin, logs };
  fakeGh(f, ISSUE_REPLY);
  fakeGit(f, DEFAULT_REMOTES);
  return f;
}

const ghReplyPath = (f: Fixture): string => join(f.logs, "gh-reply.json");

const ghRepoReplyPath = (f: Fixture): string => join(f.logs, "gh-repo-reply.json");

const remotesPath = (f: Fixture): string => join(f.logs, "git-remotes.txt");

const FAIL = "echo 'not found' >&2\nexit 1\n";

const onAdjacent = (first: string, second: string, body: string): string =>
  `prev=""\nfor arg in "$@"; do\n  if [ "$prev" = "${first}" ] && [ "$arg" = "${second}" ]; then\n${body}  fi\n  prev="$arg"\ndone\n`;

const ghUserReplyPath = (f: Fixture): string => join(f.logs, "gh-user-reply.txt");

const ghPullsReplyPath = (f: Fixture): string => join(f.logs, "gh-pulls-reply.json");

export const ghPullsArgsPath = (f: Fixture): string => join(f.logs, "gh-pulls-args");

interface ApiReplies {
  user?: string | null;
  pulls?: string | null;
}

const onPulls = (body: string): string =>
  `api=""\npulls=""\nfor arg in "$@"; do\n  [ "$arg" = "api" ] && api=1\n  case "$arg" in */pulls) pulls=1 ;; esac\ndone\nif [ -n "$api" ] && [ -n "$pulls" ]; then\n${body}fi\n`;

export function fakeGh(
  f: Fixture,
  reply: Record<string, unknown> | null,
  repoReply: Record<string, unknown> | null = REPO_REPLY,
  { user = "launch-test\n", pulls = "[]" }: ApiReplies = {},
): void {
  if (reply !== null) writeFileSync(ghReplyPath(f), JSON.stringify(reply));
  if (repoReply !== null) writeFileSync(ghRepoReplyPath(f), JSON.stringify(repoReply));
  if (user !== null) writeFileSync(ghUserReplyPath(f), user);
  if (pulls !== null) writeFileSync(ghPullsReplyPath(f), pulls);
  const answer = (path: string, value: unknown) => (reply === null || value === null ? FAIL : `cat '${path}'\nexit 0\n`);
  const userBody = answer(ghUserReplyPath(f), user);
  const pullsBody = `printf '%s\\n' "$@" > '${ghPullsArgsPath(f)}'\n${answer(ghPullsReplyPath(f), pulls)}`;
  const repoBody = answer(ghRepoReplyPath(f), repoReply);
  const body = reply === null ? FAIL : `cat '${ghReplyPath(f)}'\n`;
  writeFileSync(
    join(f.bin, "gh"),
    `#!/bin/sh\n${onAdjacent("api", "user", userBody)}${onPulls(pullsBody)}${onAdjacent("repo", "view", repoBody)}${body}`,
    { mode: 0o755 },
  );
}

export function fakeGit(f: Fixture, remotes: string | null): void {
  if (remotes === null) rmSync(remotesPath(f), { force: true });
  else writeFileSync(remotesPath(f), remotes);
  const answer = `if [ -f '${remotesPath(f)}' ]; then cat '${remotesPath(f)}'; exit 0; fi\nexit 1\n`;
  writeFileSync(join(f.bin, "git"), `#!/bin/sh\n${onAdjacent("remote", "-v", answer)}exec '${REAL_GIT}' "$@"\n`, { mode: 0o755 });
}

export function fakeClaude(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\npwd -P > "$LOGS/cwd"\nprintf '%s\\n' "$@" > "$LOGS/args"\ncat > "$LOGS/stdin"\n${body}`,
    { mode: 0o755 },
  );
}

export const SESSION_REPLY = `echo '{"type":"result","session_id":"s-1","result":"finished","total_cost_usd":0.5,"duration_ms":1200}'\n`;

export const PASS_CHECK = `"$NODE" "$DONE_GATE" check >&2\n`;

export function run(f: Fixture, args: string[], env: Record<string, string> = {}): SpawnSyncReturns<string> {
  return spawnSync(SCRIPT, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: isolatedEnv({
      PATH: `${f.bin}:${process.env.PATH}`,
      LOGS: f.logs,
      NODE: process.execPath,
      DONE_GATE,
      ...env,
    }),
  });
}

export function prepare(f: Fixture, ...extra: string[]): SpawnSyncReturns<string> {
  return run(f, ["prepare", "--repo", f.repo, "--issue", String(ISSUE), ...extra]);
}

export function outputOf(result: SpawnSyncReturns<string>): Record<string, unknown> {
  const lines = result.stdout.split("\n").filter((line) => line !== "");
  assert.equal(lines.length, 1, `stdout is one JSON line: ${result.stdout}\nstderr: ${result.stderr}`);
  return JSON.parse(lines[0]);
}

export function assertStopped(result: SpawnSyncReturns<string>, reason: string): Record<string, unknown> {
  assert.equal(result.status, 1, result.stderr);
  const out = outputOf(result);
  assert.equal(out.ok, false);
  assert.equal(out.reason, reason, String(out.detail));
  assert.equal(typeof out.detail, "string");
  return out;
}

export const worktreeOf = (f: Fixture) => join(f.repo, ".claude", "worktrees", `implement-${ISSUE}`);

export const baseOf = (f: Fixture): string => git(f.origin, "rev-parse", "main");

export const launchPathOf = (f: Fixture): string =>
  join(git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch.json");

export function launchRecord(worktree: string): Record<string, unknown> {
  const dir = git(worktree, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  return JSON.parse(readFileSync(join(dir, "launch.json"), "utf8"));
}

export function gateStatus(worktree: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [DONE_GATE, "status"], { cwd: worktree, env: isolatedEnv(), encoding: "utf8" });
}

export const REVIEW_SCHEMA = {
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

export interface Step {
  reply?: Record<string, unknown> | string;
  exit?: number;
  edit?: string;
  git?: string[][];
  issue?: Record<string, unknown>;
}

export const ASSESSMENTS = { code: "code reason", requirements: "requirements reason", tests: "tests reason", documentation: "documentation reason" };

export const PUBLISHED = { assessments: ASSESSMENTS, documents: [], handoff: [] };

export const shaped = (session: string, findings: Record<string, unknown>[] = [], cost = 1): Record<string, unknown> => ({
  session_id: session,
  structured_output: { findings, verified: `${session} checked`, ...PUBLISHED },
  total_cost_usd: cost,
  duration_ms: 10,
});

export const CLEAN: Record<string, Step> = { self: { reply: shaped("self-1") }, independent: { reply: shaped("ind-1") } };

export function fakeReviewer(f: Fixture, plan: Record<string, Step>): void {
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
for (const argv of step.git || []) require("node:child_process").execFileSync("git", argv, { stdio: "ignore" });
if (step.issue) fs.writeFileSync(logs + "/gh-reply.json", JSON.stringify(step.issue));
if (step.reply !== undefined) process.stdout.write(typeof step.reply === "string" ? step.reply : JSON.stringify(step.reply));
process.exit(step.exit || 0);
`,
    { mode: 0o755 },
  );
}

export function implemented(beforeCheck = ""): Fixture {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, beforeCheck + PASS_CHECK + SESSION_REPLY);
  assert.equal(run(f, ["implement", "--worktree", worktreeOf(f)]).status, 0);
  return f;
}

export const review = (f: Fixture, ...extra: string[]) => run(f, ["review", "--worktree", worktreeOf(f), ...extra]);

export const callOf = (f: Fixture, name: string): { cwd: string; args: string[]; stdin: string } =>
  JSON.parse(readFileSync(join(f.logs, `${name}.json`), "utf8"));

export const flagValue = (args: string[], flag: string): string => args[args.indexOf(flag) + 1];

export const SELF_REQUIRED = { required: true, location: "a.ts:1", condition: "c1", problem: "p1", action: "a1" };

export const SELF_OPTIONAL = { required: false, location: "a.ts:2", condition: "c2", problem: "p2", action: "a2" };

export const INDEPENDENT_REQUIRED = { required: true, location: "", condition: "c3", problem: "p3", action: "a3" };

export const REJECTED: Record<string, Step> = {
  self: { reply: shaped("self-1", [SELF_REQUIRED, SELF_OPTIONAL]) },
  independent: { reply: shaped("ind-1", [INDEPENDENT_REQUIRED]) },
};

export const REPAIR_REPLY = `echo '{"type":"result","session_id":"s-1","result":"repaired","total_cost_usd":0.7,"duration_ms":900}'\n`;

export const EDIT_FILE = "echo fixed >> README.md\n";

export function fakeRepairer(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\necho call >> "$LOGS/repair-calls"\npwd -P > "$LOGS/repair-cwd"\nprintf '%s\\n' "$@" > "$LOGS/repair-args"\ncat > "$LOGS/repair-stdin"\n${body}`,
    { mode: 0o755 },
  );
}

export const repair = (f: Fixture, ...extra: string[]) => run(f, ["repair", "--worktree", worktreeOf(f), ...extra]);

export function rejected(): Fixture {
  const f = implemented();
  fakeReviewer(f, REJECTED);
  const result = review(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).verdict, "rejected");
  return f;
}

export type Stored = Record<string, unknown> & { reviews: Record<string, unknown>[]; repairs: Record<string, unknown>[] };

export const EARLIER_KEYS = ["1-self-1", "1-independent-1"];

export const judging = (
  session: string,
  states: Record<string, string>,
  findings: Record<string, unknown>[] = [],
): Record<string, unknown> => ({
  session_id: session,
  structured_output: {
    findings,
    verified: `${session} checked`,
    previous: Object.entries(states).map(([key, state]) => ({ key, state, reason: `${session} saw ${key} ${state}` })),
    ...PUBLISHED,
  },
  total_cost_usd: 1,
  duration_ms: 10,
});

export const allStates = (state: string): Record<string, string> => Object.fromEntries(EARLIER_KEYS.map((key) => [key, state]));

export const BOTH_OPEN: Record<string, Step> = {
  self: { reply: judging("self-2", allStates("open")) },
  independent: { reply: judging("ind-2", allStates("open")) },
};

export const JUDGING_SCHEMA = {
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

export function rewriteLaunch(f: Fixture, change: (stored: Record<string, unknown>) => Record<string, unknown>): void {
  const dir = git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  writeFileSync(join(dir, "launch.json"), `${JSON.stringify(change(launchRecord(worktreeOf(f))), null, 2)}\n`);
}

export function moveBaseToParent(f: Fixture): string {
  const parent = git(f.origin, "rev-parse", "main~1");
  assert.notEqual(parent, baseOf(f));
  assert.notEqual(parent, git(worktreeOf(f), "rev-parse", "HEAD"));
  rewriteLaunch(f, (stored) => ({ ...stored, base: parent }));
  return parent;
}

type ReviewOut = {
  verdict: string;
  required: Record<string, unknown>[];
  reviews: Record<string, { verdict: string; previous: unknown[] }>;
};

export const reviewOut = (f: Fixture): ReviewOut => {
  const result = review(f);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return outputOf(result) as unknown as ReviewOut;
};

export const lastReview = (f: Fixture): Record<string, unknown> & { required: Record<string, unknown>[] } => {
  const reviews = (launchRecord(worktreeOf(f)) as Stored).reviews;
  return reviews[reviews.length - 1] as Record<string, unknown> & { required: Record<string, unknown>[] };
};

export const REQUIRED_FIELDS = ["key", "side", "location", "condition", "problem", "action", "reopened"];

export interface Turn {
  reply?: Record<string, unknown> | string;
  exit?: number;
  edit?: boolean;
  check?: boolean;
  issue?: Record<string, unknown>;
}

export type Script = Partial<Record<"implement" | "self" | "independent" | "repair" | "reread" | "continue", Turn[]>>;

export function fakeRounds(f: Fixture, script: Script): void {
  writeFileSync(join(f.logs, "script.json"), JSON.stringify(script));
  writeFileSync(
    join(f.bin, "claude"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const logs = process.env.LOGS;
const args = process.argv.slice(2);
const stdin = fs.readFileSync(0, "utf8");
const schema = args.includes("--json-schema");
const resumed = args.includes("--resume");
const role = schema
  ? resumed
    ? args.includes("--fork-session")
      ? "self"
      : "again"
    : "independent"
  : stdin.includes("changed after you last read it")
    ? "reread"
    : stdin.includes("does not print") || stdin.includes("CAPTURE_OUTPUT_BEGIN")
      ? "continue"
      : stdin.includes("was interrupted")
        ? "implement"
        : resumed
          ? "repair"
          : "implement";
const log = logs + "/run-calls";
const index = (fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\\n") : []).filter((line) => line.startsWith(role + " ")).length;
fs.appendFileSync(log, role + " " + JSON.stringify(args) + "\\n");
const turn = (JSON.parse(fs.readFileSync(logs + "/script.json", "utf8"))[role] || [])[index] || {};
if (turn.edit) fs.appendFileSync("README.md", role + " " + index + "\\n");
if (turn.check) spawnSync(process.env.NODE, [process.env.DONE_GATE, "check"], { stdio: "ignore" });
if (turn.issue) fs.writeFileSync(logs + "/gh-reply.json", JSON.stringify(turn.issue));
if (turn.reply !== undefined) process.stdout.write(typeof turn.reply === "string" ? turn.reply : JSON.stringify({ type: "result", ...turn.reply }));
process.exit(turn.exit || 0);
`,
    { mode: 0o755 },
  );
}

export const roundCalls = (f: Fixture): { role: string; args: string[] }[] =>
  existsSync(join(f.logs, "run-calls"))
    ? readFileSync(join(f.logs, "run-calls"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => ({ role: line.slice(0, line.indexOf(" ")), args: JSON.parse(line.slice(line.indexOf(" ") + 1)) }))
    : [];

export const IMPLEMENTED: Turn = { check: true, reply: { session_id: "s-1", result: "finished", total_cost_usd: 0.5, duration_ms: 1200 } };

export const REPAIRED: Turn = { edit: true, check: true, reply: { session_id: "s-1", result: "repaired", total_cost_usd: 0.25, duration_ms: 900 } };

export const runLaunch = (f: Fixture, ...extra: string[]) => run(f, ["run", "--worktree", worktreeOf(f), ...extra]);

export const prepared = (): Fixture => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  return f;
};

export const CHANGED_BODY = { ...ISSUE_REPLY, body: "body changed after prepare" };

export function fakeHangingClaude(f: Fixture): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\nprintf '%s\\n' "$@" > "$LOGS/hanging-args"\necho $$ >> "$LOGS/hanging-claude-pids"\nsleep 60 &\necho $! >> "$LOGS/hanging-sleep-pids"\nwait\n`,
    { mode: 0o755 },
  );
}

export const pidsIn = (f: Fixture, name: string): number[] =>
  existsSync(join(f.logs, name)) ? readFileSync(join(f.logs, name), "utf8").split("\n").filter(Boolean).map(Number) : [];

export const isRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export async function waitFor(condition: () => boolean, limitMs: number): Promise<boolean> {
  const until = Date.now() + limitMs;
  while (!condition()) {
    if (Date.now() > until) return false;
    await new Promise((wake) => setTimeout(wake, 50));
  }
  return true;
}

interface Signalled {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  pids: number[];
  survivors: number[];
}

export async function signalWhileClaudeWaits(f: Fixture, args: string[], signal: NodeJS.Signals, claudes: number): Promise<Signalled> {
  fakeHangingClaude(f);
  const child = spawn(SCRIPT, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: isolatedEnv({ PATH: `${f.bin}:${process.env.PATH}`, LOGS: f.logs, NODE: process.execPath, DONE_GATE }),
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((done) =>
    child.on("close", (code, signal) => done({ code, signal })),
  );
  const pids = (): number[] => [...pidsIn(f, "hanging-claude-pids"), ...pidsIn(f, "hanging-sleep-pids")];
  try {
    const started = await waitFor(() => pidsIn(f, "hanging-sleep-pids").length >= claudes, 20_000);
    assert.ok(started, `${claudes} claude started before the signal: ${stderr}`);
    child.kill(signal);
    const ended = await closed;
    await waitFor(() => pids().every((pid) => !isRunning(pid)), 5_000);
    return { ...ended, stdout, stderr, pids: pids(), survivors: pids().filter(isRunning) };
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    for (const pid of pids()) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
  }
}

interface CommandSignalled {
  code: number | null;
  stdout: string;
  pids: number[];
  survivors: number[];
}

export async function signalWhileCommandWaits(f: Fixture, args: string[], pidFile: string, count: number): Promise<CommandSignalled> {
  const child = spawn(SCRIPT, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: isolatedEnv({ PATH: `${f.bin}:${process.env.PATH}`, LOGS: f.logs, NODE: process.execPath, DONE_GATE }),
  });
  let stdout = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  const closed = new Promise<number | null>((done) => child.on("close", (code) => done(code)));
  try {
    assert.ok(await waitFor(() => pidsIn(f, pidFile).length >= count, 20_000), `${count} pids in ${pidFile} before the signal`);
    child.kill("SIGTERM");
    const code = await closed;
    const pids = pidsIn(f, pidFile);
    await waitFor(() => pids.every((pid) => !isRunning(pid)), 5_000);
    return { code, stdout, pids, survivors: pids.filter(isRunning) };
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    for (const pid of pidsIn(f, pidFile)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
  }
}

export function assertEndedBySignal(result: Signalled, claudes: number): void {
  assert.equal(result.code, 143, `exit ${result.code} signal ${result.signal}: ${result.stderr}`);
  assert.equal(result.stdout, "");
  assert.equal(result.pids.length, claudes * 2);
  assert.deepEqual(result.survivors, []);
}

export const launchFile = (f: Fixture): string =>
  readFileSync(join(git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch.json"), "utf8");

export const agree = (f: Fixture, ...extra: string[]) => run(f, ["agree", "--worktree", worktreeOf(f), ...extra]);

export const reread = (f: Fixture, ...extra: string[]) => run(f, ["reread", "--worktree", worktreeOf(f), ...extra]);

export const AGREED_DIGEST = digestOf(CHANGED_BODY);

export const REREAD_REPLY = `echo '{"type":"result","session_id":"s-1","result":"reread","total_cost_usd":0.3,"duration_ms":700}'\n`;

export function fakeRereader(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\necho call >> "$LOGS/reread-calls"\npwd -P > "$LOGS/reread-cwd"\nprintf '%s\\n' "$@" > "$LOGS/reread-args"\ncat > "$LOGS/reread-stdin"\n${body}`,
    { mode: 0o755 },
  );
}

export function agreedAfterChange(arrange: () => Fixture = implemented): Fixture {
  const f = arrange();
  fakeGh(f, CHANGED_BODY);
  const result = agree(f);
  assert.equal(result.status, 0, result.stderr);
  return f;
}

export function accepted(): Fixture {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  return f;
}

export const continueWork = (f: Fixture, ...extra: string[]) => run(f, ["continue", "--worktree", worktreeOf(f), ...extra]);

export const CONTINUE_REPLY = `echo '{"type":"result","session_id":"s-1","result":"continued","total_cost_usd":0.4,"duration_ms":800}'\n`;

export function fakeContinuer(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\necho call >> "$LOGS/continue-calls"\npwd -P > "$LOGS/continue-cwd"\nprintf '%s\\n' "$@" > "$LOGS/continue-args"\ncat > "$LOGS/continue-stdin"\n${body}`,
    { mode: 0o755 },
  );
}

export function unfinished(): Fixture {
  const f = prepared();
  fakeClaude(f, SESSION_REPLY);
  assertStopped(run(f, ["implement", "--worktree", worktreeOf(f)]), "not-done");
  return f;
}

export function gateDisabled(f: Fixture): void {
  rmSync(join(git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "config.json"));
  const status = gateStatus(worktreeOf(f));
  assert.equal(status.status, 2, status.stderr);
}

export type Continued = Record<string, unknown> & { continues: Record<string, unknown>[] };

export interface ImplementTurn {
  exit?: number;
  stderr?: string;
  check?: boolean;
  reply?: Record<string, unknown>;
}

interface ImplementCall {
  args: string[];
  stdin: string;
  launch: Record<string, unknown>;
}

export const NO_SESSION = (id: string): string => `No conversation found with session ID: ${id}\n`;

export const FINISHED: ImplementTurn = { check: true, reply: { session_id: "s-2", result: "finished", total_cost_usd: 0.5, duration_ms: 1200 } };

export function fakeImplementer(f: Fixture, turns: ImplementTurn[]): void {
  writeFileSync(join(f.logs, "implement-plan.json"), JSON.stringify(turns));
  rmSync(join(f.logs, "implement-calls"), { force: true });
  writeFileSync(
    join(f.bin, "claude"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const logs = process.env.LOGS;
const args = process.argv.slice(2);
const stdin = fs.readFileSync(0, "utf8");
const log = logs + "/implement-calls";
const index = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\\n").filter(Boolean).length : 0;
const launch = JSON.parse(fs.readFileSync(${JSON.stringify(launchPathOf(f))}, "utf8"));
fs.appendFileSync(log, JSON.stringify({ args, stdin, launch }) + "\\n");
const turn = JSON.parse(fs.readFileSync(logs + "/implement-plan.json", "utf8"))[index] || {};
if (turn.check) spawnSync(process.env.NODE, [process.env.DONE_GATE, "check"], { stdio: "ignore" });
if (turn.stderr) process.stderr.write(turn.stderr);
if (turn.reply !== undefined) process.stdout.write(JSON.stringify({ type: "result", ...turn.reply }));
process.exit(turn.exit || 0);
`,
    { mode: 0o755 },
  );
}

export const implementCalls = (f: Fixture): ImplementCall[] =>
  existsSync(join(f.logs, "implement-calls"))
    ? readFileSync(join(f.logs, "implement-calls"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

export const implementAt = (f: Fixture, ...extra: string[]) => run(f, ["implement", "--worktree", worktreeOf(f), ...extra]);

export const implementRecordOf = (f: Fixture): Record<string, unknown> => (launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement;

export function interrupted(): Fixture {
  const f = prepared();
  fakeImplementer(f, [{ exit: 3 }]);
  assertStopped(implementAt(f), "child-failed");
  fakeImplementer(f, []);
  return f;
}

export const interruptedId = (f: Fixture): string => String(implementRecordOf(f).session_id);

export const holdersOf = (f: Fixture): string =>
  join(git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch-holders");

export const recordFilesOf = (f: Fixture): string[] =>
  existsSync(holdersOf(f)) ? readdirSync(holdersOf(f)).filter((name) => /^\d+(\.children)?\.json$/.test(name)).sort() : [];

export const holderFile = (f: Fixture, pid: number, kind = ""): string => join(holdersOf(f), `${pid}${kind}.json`);

export const readHolder = (f: Fixture, pid: number, kind = ""): unknown => JSON.parse(readFileSync(holderFile(f, pid, kind), "utf8"));

export const groupRunning = (pid: number): boolean => isRunning(-pid);

interface Waiting {
  pid: number;
  closed: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  child: ChildProcess;
}

export async function startWaiting(f: Fixture, args: string[], claudes = 1): Promise<Waiting> {
  const child = spawn(SCRIPT, args, {
    stdio: ["ignore", "ignore", "pipe"],
    env: isolatedEnv({ PATH: `${f.bin}:${process.env.PATH}`, LOGS: f.logs, NODE: process.execPath, DONE_GATE }),
  });
  let stderr = "";
  child.stderr?.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((done) =>
    child.on("close", (code, signal) => done({ code, signal })),
  );
  const recorded = (): boolean => {
    try {
      const children = readHolder(f, child.pid as number, ".children");
      return Array.isArray(children) && pidsIn(f, "hanging-claude-pids").every((pid) => children.includes(pid));
    } catch {
      return false;
    }
  };
  const started = await waitFor(() => pidsIn(f, "hanging-sleep-pids").length >= claudes && recorded(), 20_000);
  assert.ok(started, `${claudes} claude started and recorded: ${stderr}`);
  return { pid: child.pid as number, closed, child };
}

export function endWaiting(f: Fixture, waiting: Waiting): void {
  if (waiting.child.exitCode === null && waiting.child.signalCode === null) waiting.child.kill("SIGKILL");
  for (const pid of pidsIn(f, "hanging-claude-pids")) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {}
  }
  for (const pid of pidsIn(f, "hanging-sleep-pids")) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
}

export async function implementWaiting(f: Fixture): Promise<Waiting> {
  fakeHangingClaude(f);
  return startWaiting(f, ["implement", "--worktree", worktreeOf(f)]);
}

export const HELD_CALLS = ["implement", "review", "repair", "agree", "reread", "continue", "run", "publishable", "published", "body", "capture"];

export async function killedLaunch(f: Fixture): Promise<Waiting> {
  const waiting = await implementWaiting(f);
  waiting.child.kill("SIGKILL");
  await waiting.closed;
  return waiting;
}

export const BRANCH = `feat/${ISSUE}-publish-gate-ts`;

export const publishable = (f: Fixture, env: Record<string, string> = {}) => run(f, ["publishable", "--worktree", worktreeOf(f)], env);

export function acceptedWithChanges(config: Record<string, unknown> = CONFIG, plan: Record<string, Step> = CLEAN): Fixture {
  const f = fixture(config);
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, `echo changed >> README.md\necho new > NEW.md\n${PASS_CHECK}${SESSION_REPLY}`);
  assert.equal(run(f, ["implement", "--worktree", worktreeOf(f)]).status, 0);
  fakeReviewer(f, plan);
  assert.equal(review(f).status, 0);
  assert.equal(lastReview(f).verdict, "accepted");
  return f;
}

export function committed(config: Record<string, unknown> = CONFIG, plan: Record<string, Step> = CLEAN): Fixture {
  const f = acceptedWithChanges(config, plan);
  git(worktreeOf(f), "add", "-A");
  git(worktreeOf(f), "commit", "-q", "-m", "reviewed change");
  return f;
}

export const PR_URL = "https://github.com/owner/repo/pull/9";

const builtBodies = new WeakMap<Fixture, Map<string, string>>();

function builtBody(f: Fixture): string {
  const result = run(f, ["body", "--worktree", worktreeOf(f)]);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  const file = join(dirname(launchPathOf(f)), "pr-body.md");
  const text = readFileSync(file, "utf8");
  rmSync(file);
  const bodies = builtBodies.get(f) ?? new Map<string, string>();
  bodies.set(git(worktreeOf(f), "rev-parse", "HEAD"), text);
  builtBodies.set(f, bodies);
  return text;
}

export const builtBodyAt = (f: Fixture, sha: string): string | undefined => builtBodies.get(f)?.get(sha);

export const matchingPull = (f: Fixture, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  number: 9,
  html_url: PR_URL,
  state: "open",
  draft: true,
  user: { login: "launch-test" },
  head: { ref: BRANCH, sha: git(worktreeOf(f), "rev-parse", "HEAD"), repo: { full_name: "owner/repo" } },
  base: { ref: "main", repo: { full_name: "owner/repo" } },
  ...("body" in extra ? {} : { body: builtBody(f) }),
  ...extra,
});

export const withPulls = (f: Fixture, pulls: unknown): void => fakeGh(f, ISSUE_REPLY, REPO_REPLY, { pulls: JSON.stringify(pulls) });

export function publishedReady(): Fixture {
  const f = committed();
  withPulls(f, [matchingPull(f)]);
  return f;
}

export const published = (f: Fixture, env: Record<string, string> = {}) => run(f, ["published", "--worktree", worktreeOf(f)], env);

export const PULL_UNREADABLE_DETAIL = `gh listed an open pull request for the branch ${BRANCH} that lacks a positive integer number or a non-empty html_url.`;

export function publishedOnce(): Fixture {
  const f = publishedReady();
  const result = published(f);
  assert.equal(result.status, 0, result.stdout);
  return f;
}

export const publicationsOf = (f: Fixture): Record<string, unknown>[] => launchRecord(worktreeOf(f)).publications as Record<string, unknown>[];

export function reviewedEdit(f: Fixture, text: string): void {
  writeFileSync(join(worktreeOf(f), "README.md"), text);
  const check = spawnSync(process.execPath, [DONE_GATE, "check"], { cwd: worktreeOf(f), env: isolatedEnv(), encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  fakeReviewer(f, CLEAN);
  const result = review(f);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(lastReview(f).verdict, "accepted");
}

export function stackCommit(f: Fixture, text: string): string {
  const published = git(worktreeOf(f), "rev-parse", "HEAD");
  reviewedEdit(f, text);
  git(worktreeOf(f), "add", "-A");
  git(worktreeOf(f), "commit", "-q", "-m", "stacked change");
  return published;
}

export function stacked(): { f: Fixture; published: string } {
  const f = publishedOnce();
  const published = stackCommit(f, "stacked change\n");
  return { f, published };
}

export const pullWithHead = (f: Fixture, sha: string, extra: Record<string, unknown> = {}): Record<string, unknown> =>
  matchingPull(f, { head: { ref: BRANCH, sha, repo: { full_name: "owner/repo" } }, body: builtBodyAt(f, sha), ...extra });

export const recordedNoPrDetail = `No open pull request of owner/repo uses the branch ${BRANCH}. The pull request ${PR_URL} that launch.json records is closed or merged.`;

const FIRST_TURN = { type: "result", session_id: "s-0", result: "first report", total_cost_usd: 0.5, duration_ms: 1200 };

const SECOND_TURN = { type: "result", session_id: "s-1", result: "second note", total_cost_usd: 0.6, duration_ms: 300 };

export const TWO_TURNS = [JSON.stringify(FIRST_TURN), JSON.stringify(SECOND_TURN)];

export const JOINED_REPLY = "first report\n\nsecond note";

export const printing = (f: Fixture, lines: string[]): string => {
  writeFileSync(join(f.logs, "turns.out"), lines.map((line) => `${line}\n`).join(""));
  return `cat "$LOGS/turns.out"\n`;
};

export const writeBody = (f: Fixture, worktree = worktreeOf(f)) => run(f, ["body", "--worktree", worktree]);

export const bodyFileOf = (f: Fixture): string => join(dirname(launchPathOf(f)), "pr-body.md");

interface ExpectedBody {
  commit: string;
  check?: string;
  code?: string;
  findings?: string[];
  documents?: string[];
  handoff?: string[];
}

export const expectedBody = ({ commit, check = '"true"', code = "code reason", findings = [], documents = [], handoff = [] }: ExpectedBody): string =>
  `${[
    "Closes #42",
    "## Changes and rationale",
    code,
    "## Requirements coverage",
    "requirements reason",
    "## Verification and unverified items",
    `Target commit: ${commit}`,
    `launch.ts: the target commit holds the tree that the last review round accepted. The local check (${check}) passed. Self review: accepted. Independent review: accepted.`,
    "tests reason",
    ...(findings.length > 0 ? ["## Findings and responses", ...findings] : []),
    "## Documents and sources",
    "documentation reason",
    ...documents,
    "## Remaining work and owners",
    "When this body was written, the draft publication, CI, the body check, the switch to ready, and human approval were not complete.",
    "- Assigned AI: publish this PR as a draft and confirm that CI on the same head (test) registers and succeeds.",
    ...handoff,
    "- Assigned AI: compare the latest public body with the Issue, the target commit, the accepted review, and the verification results (published_body_check). After confirming the body and CI on the same head, recheck, switch to ready, and read it back (mark_ready). Keep the draft while anything is unconfirmed.",
    "- Human: decide any change to requirements or permissions, and decide review, approval, and merge.",
  ].join("\n\n")}\n`;

export const headOf = (f: Fixture): string => git(worktreeOf(f), "rev-parse", "HEAD");

export function bodyText(f: Fixture): string {
  const result = writeBody(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.equal(outputOf(result).commit, headOf(f));
  return readFileSync(bodyFileOf(f), "utf8");
}

export function rewriteLastIndependent(f: Fixture, change: (independent: Record<string, unknown>) => Record<string, unknown>): void {
  rewriteLaunch(f, (stored) => {
    const reviews = [...(stored.reviews as Record<string, unknown>[])];
    const last = reviews[reviews.length - 1];
    reviews[reviews.length - 1] = { ...last, independent: change(last.independent as Record<string, unknown>) };
    return { ...stored, reviews };
  });
}

export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

export const FAKE = "fake-capture";

export const COUNT_CHECK = '[ -z "$LOGS" ] || echo check >> "$LOGS/check-calls"';

export const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from("0123456789")]);

export const WRITE_PNG = 'cp "$LOGS/shot.png" "$last/list.png"\nexit 0\n';

export interface CaptureSetting {
  command?: string[];
  destination?: string;
  required?: boolean;
  check?: string;
}

export const settingOf = ({ command = [FAKE], destination = "media", required = true }: CaptureSetting) => ({ command, destination, required });

export function fakeCapture(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, FAKE),
    `#!/bin/sh\necho call >> "$LOGS/capture-calls"\npwd -P > "$LOGS/capture-cwd"\nprintf '%s\\n' "$@" > "$LOGS/capture-args"\nfor last; do :; done\nif [ -d "$last" ]; then ls -A "$last"; else echo missing; fi > "$LOGS/capture-listing"\n${body}`,
    { mode: 0o755 },
  );
}

export function capturing(setting: CaptureSetting = {}, body = WRITE_PNG): Fixture {
  const f = fixture({ ...CONFIG, check: setting.check ?? COUNT_CHECK, capture: settingOf(setting) });
  writeFileSync(join(f.logs, "shot.png"), PNG);
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, PASS_CHECK + SESSION_REPLY);
  assert.equal(run(f, ["implement", "--worktree", worktreeOf(f)]).status, 0);
  fakeCapture(f, body);
  return f;
}

export const captureAt = (f: Fixture, env: Record<string, string> = {}) => run(f, ["capture", "--worktree", worktreeOf(f)], env);

export function passCheck(f: Fixture): void {
  const check = spawnSync(process.execPath, [DONE_GATE, "check"], { cwd: worktreeOf(f), env: isolatedEnv(), encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
}

export const allEnded = (pids: number[]) => waitFor(() => pids.every((pid) => !isRunning(pid)), 5_000);

export const recordedBase = (f: Fixture): string => String(launchRecord(worktreeOf(f)).base);

export const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.from("0123")]);

export const WRITE_PNG_AND_MP4 = 'cp "$LOGS/shot.png" "$last/list.png"\ncp "$LOGS/clip.mp4" "$last/clip.mp4"\nexit 0\n';

export const ASSET_A = "https://github.com/user-attachments/assets/0123abcd-4567-89ab-cdef-0123456789ab";

export const ASSET_B = "https://github.com/user-attachments/assets/fedcba98-7654-3210-fedc-ba9876543210";

export const imageAttached = (text: string, path: string, asset: string): string => text.replaceAll(`![${path}](${path})`, `![${path}](${asset})`);

export const videoAttached = (text: string, path: string, asset: string): string => text.replaceAll(`![${path}](${path})`, asset);

export function capturedAndReviewed(f: Fixture): void {
  const captured = captureAt(f);
  assert.equal(outputOf(captured).ok, true, `${captured.stdout}${captured.stderr}`);
  fakeReviewer(f, CLEAN);
  const reviewed = review(f);
  assert.equal(outputOf(reviewed).verdict, "accepted", `${reviewed.stdout}${reviewed.stderr}`);
}

export function commitAll(f: Fixture, message: string): void {
  git(worktreeOf(f), "add", "-A");
  git(worktreeOf(f), "commit", "-q", "-m", message);
}

export function withMedia(setting: CaptureSetting = {}, body?: string): Fixture {
  const f = body === undefined ? capturing(setting) : capturing(setting, body);
  writeFileSync(join(f.logs, "clip.mp4"), MP4);
  capturedAndReviewed(f);
  commitAll(f, "reviewed change with media");
  return f;
}

export const twoMedia = (): Fixture => withMedia({ destination: "trial/evidence/media/" }, WRITE_PNG_AND_MP4);

export const CLIP = "trial/evidence/media/clip.mp4";

export const LIST = "trial/evidence/media/list.png";

export const bothAttached = (text: string): string => videoAttached(imageAttached(text, LIST, ASSET_A), CLIP, ASSET_B);

export type GhCall = "issue" | "pulls" | "create" | "edit";

export type PullsReply = "live" | { live: Record<string, unknown> } | unknown[];

export interface PublishGh {
  repo?: Record<string, unknown>;
  pr?: { number: number; body: string } | null;
  pulls?: PullsReply[];
  failCreate?: number[];
  createdOnFail?: boolean;
  createStdout?: string;
  failEdit?: number[];
  during?: { call: GhCall; index: number; shell: string };
}

export interface RecordedGh {
  args: string[];
  cwd: string;
  body: string | null;
}

const publishGhPlanPath = (f: Fixture): string => join(f.logs, "publish-gh-plan.json");

const publishGhStatePath = (f: Fixture): string => join(f.logs, "publish-gh-state.json");

export function fakePublishGh(f: Fixture, plan: PublishGh = {}): void {
  writeFileSync(ghReplyPath(f), JSON.stringify(ISSUE_REPLY));
  writeFileSync(publishGhPlanPath(f), JSON.stringify(plan));
  writeFileSync(publishGhStatePath(f), JSON.stringify({ pr: plan.pr ?? null, counts: {} }));
  const settings = {
    plan: publishGhPlanPath(f),
    state: publishGhStatePath(f),
    issue: ghReplyPath(f),
    logs: f.logs,
    origin: f.origin,
    branch: BRANCH,
    repo: REPO_REPLY,
    url: PR_URL.slice(0, PR_URL.lastIndexOf("/") + 1),
    image: ASSET_A,
    video: ASSET_B,
  };
  writeFileSync(
    join(f.bin, "gh"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const s = ${JSON.stringify(settings)};
const args = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(s.plan, "utf8"));
const state = JSON.parse(fs.readFileSync(s.state, "utf8"));
const save = () => fs.writeFileSync(s.state, JSON.stringify(state));
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const call =
  args[0] === "issue" && args[1] === "view" ? "issue"
  : args[0] === "api" && args[1] === "user" ? "user"
  : args[0] === "api" && String(args[1]).endsWith("/pulls") ? "pulls"
  : args[0] === "repo" && args[1] === "view" ? "repo"
  : args[0] === "pr" && args[1] === "create" ? "create"
  : args[0] === "pr" && args[1] === "edit" ? "edit"
  : "unknown";
const index = (state.counts[call] || 0) + 1;
state.counts[call] = index;
save();
if (plan.during && plan.during.call === call && plan.during.index === index) {
  spawnSync("/bin/sh", ["-c", plan.during.shell], { stdio: ["ignore", 2, 2] });
}
const record = (body) => fs.writeFileSync(s.logs + "/gh-" + call + "-" + index + ".json", JSON.stringify({ args, cwd: process.cwd(), body }));
const bodyFile = flag("--body-file");
const fail = () => {
  process.stderr.write("gh " + call + "  failed\\n   on purpose\\n");
  process.exit(1);
};
const livePull = () => {
  const head = spawnSync("git", ["-C", s.origin, "rev-parse", "--verify", "--quiet", "refs/heads/" + s.branch], { encoding: "utf8" });
  return {
    number: state.pr.number,
    html_url: s.url + state.pr.number,
    state: "open",
    draft: true,
    user: { login: "launch-test" },
    head: { ref: s.branch, sha: head.status === 0 ? head.stdout.trim() : null, repo: { full_name: "owner/repo" } },
    base: { ref: "main", repo: { full_name: "owner/repo" } },
    body: state.pr.body,
  };
};
if (call === "issue") {
  process.stdout.write(fs.readFileSync(s.issue, "utf8"));
} else if (call === "user") {
  process.stdout.write("launch-test\\n");
} else if (call === "repo") {
  process.stdout.write(JSON.stringify(plan.repo || s.repo));
} else if (call === "pulls") {
  const reply = (plan.pulls || [])[index - 1] || "live";
  const live = state.pr === null ? [] : [livePull()];
  const pulls = Array.isArray(reply) ? reply : reply === "live" ? live : live.map((pull) => ({ ...pull, ...reply.live }));
  process.stdout.write(JSON.stringify(pulls));
} else if (call === "create") {
  const body = fs.readFileSync(bodyFile, "utf8");
  record(body);
  const remember = () => {
    state.pr = { number: 9, body };
    save();
  };
  if ((plan.failCreate || []).includes(index)) {
    if (plan.createdOnFail) remember();
    fail();
  }
  remember();
  process.stdout.write(plan.createStdout === undefined ? s.url + "9\\n" : plan.createStdout);
} else if (call === "edit") {
  const body = bodyFile === null ? null : fs.readFileSync(bodyFile, "utf8");
  record(body);
  if ((plan.failEdit || []).includes(index)) fail();
  if (body !== null) {
    let text = body;
    args.forEach((arg, at) => {
      if (arg !== "--attach") return;
      const path = args[at + 1];
      const attached = /\\.(mp4|webm)$/i.test(path) ? s.video : "![" + path + "](" + s.image + ")";
      text = text.split("![" + path + "](" + path + ")").join(attached);
    });
    state.pr = { ...state.pr, body: text };
    save();
  }
} else {
  process.stderr.write("unknown gh call\\n");
  process.exit(1);
}
`,
    { mode: 0o755 },
  );
}

export const ghCallsOf = (f: Fixture, call: GhCall): RecordedGh[] =>
  readdirSync(f.logs)
    .filter((name) => name.startsWith(`gh-${call}-`) && name.endsWith(".json"))
    .sort((a, b) => Number(a.slice(`gh-${call}-`.length, -5)) - Number(b.slice(`gh-${call}-`.length, -5)))
    .map((name) => JSON.parse(readFileSync(join(f.logs, name), "utf8")));

export function onOrigin(f: Fixture, sha: string, pr: { number: number; body: string }): void {
  git(worktreeOf(f), "push", "-q", f.origin, `${sha}:refs/heads/${BRANCH}`);
  const statePath = publishGhStatePath(f);
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  writeFileSync(statePath, JSON.stringify({ ...state, pr }));
}

export const originBranchOf = (f: Fixture): string | null => {
  const result = spawnSync("git", ["-C", f.origin, "rev-parse", "--verify", "--quiet", `refs/heads/${BRANCH}`], { env: isolatedEnv(), encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
};

export const publish = (f: Fixture, env: Record<string, string> = {}) => run(f, ["publish", "--worktree", worktreeOf(f)], env);

export function assertIncludesAll(text: string, parts: string[], label = ""): void {
  for (const part of parts) assert.ok(text.includes(part), `${label} expected ${JSON.stringify(part)} in:\n${text}`);
}
