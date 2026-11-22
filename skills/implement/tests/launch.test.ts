/// <reference types="node" />
import assert from "node:assert/strict";
import { type ChildProcess, type SpawnSyncReturns, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
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
import test from "node:test";
import { fileURLToPath } from "node:url";
import { GIVE_REPLY } from "../../../workflows/_lib/claude-run.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "launch.ts");
const DONE_GATE = resolve(HERE, "..", "..", "..", "hooks", "lifecycle", "done_gate.ts");
const ISSUE = 42;
const FEATURE_TITLE = "[Feature] publish_gate.ts が、サブシェルの中の公開を見つける";

const CONFIG = {
  repository: "owner/repo",
  remote: "origin",
  baseBranch: "main",
  setup: [],
  check: "true",
  ciChecks: ["test"],
  capture: null,
};
const ISSUE_REPLY = { number: ISSUE, title: FEATURE_TITLE, body: "body", state: "OPEN" };
const REPO_REPLY = { nameWithOwner: "owner/repo", viewerPermission: "WRITE" };
const REAL_GIT = spawnSync("/bin/sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();

const remotesOf = (name: string, fetchUrl: string, pushUrl = fetchUrl): string =>
  `${name}\t${fetchUrl} (fetch)\n${name}\t${pushUrl} (push)\n`;
const DEFAULT_REMOTES = remotesOf("origin", "https://github.com/owner/repo.git");

const digestOf = ({ title, body, state }: Record<string, unknown>): string =>
  createHash("sha256").update(JSON.stringify([title, body, state])).digest("hex");

function isolatedEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
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
const ghPullsArgsPath = (f: Fixture): string => join(f.logs, "gh-pulls-args");

interface ApiReplies {
  user?: string | null;
  pulls?: string | null;
}

const onPulls = (body: string): string =>
  `api=""\npulls=""\nfor arg in "$@"; do\n  [ "$arg" = "api" ] && api=1\n  case "$arg" in */pulls) pulls=1 ;; esac\ndone\nif [ -n "$api" ] && [ -n "$pulls" ]; then\n${body}fi\n`;

function fakeGh(
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

function fakeGit(f: Fixture, remotes: string | null): void {
  if (remotes === null) rmSync(remotesPath(f), { force: true });
  else writeFileSync(remotesPath(f), remotes);
  const answer = `if [ -f '${remotesPath(f)}' ]; then cat '${remotesPath(f)}'; exit 0; fi\nexit 1\n`;
  writeFileSync(join(f.bin, "git"), `#!/bin/sh\n${onAdjacent("remote", "-v", answer)}exec '${REAL_GIT}' "$@"\n`, { mode: 0o755 });
}

function fakeClaude(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\npwd -P > "$LOGS/cwd"\nprintf '%s\\n' "$@" > "$LOGS/args"\ncat > "$LOGS/stdin"\n${body}`,
    { mode: 0o755 },
  );
}

const SESSION_REPLY = `echo '{"type":"result","session_id":"s-1","result":"finished","total_cost_usd":0.5,"duration_ms":1200}'\n`;
const PASS_CHECK = `"$NODE" "$DONE_GATE" check >&2\n`;

function run(f: Fixture, args: string[], env: Record<string, string> = {}): SpawnSyncReturns<string> {
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

function prepare(f: Fixture, ...extra: string[]): SpawnSyncReturns<string> {
  return run(f, ["prepare", "--repo", f.repo, "--issue", String(ISSUE), ...extra]);
}

function prepareWithHost(f: Fixture, host: string): SpawnSyncReturns<string> {
  return run(f, ["prepare", "--repo", f.repo, "--issue", String(ISSUE)], { GH_HOST: host });
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

const baseOf = (f: Fixture): string => git(f.origin, "rev-parse", "main");

const launchPathOf = (f: Fixture): string =>
  join(git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch.json");

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
    issue_digest: digestOf(ISSUE_REPLY),
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

const branchOf = (f: Fixture): string => git(f.repo, "branch", "--list", `feat/${ISSUE}-publish-gate-ts`);

function assertNothingCreated(f: Fixture): void {
  assert.equal(existsSync(worktreeOf(f)), false, "no worktree is created");
  assert.equal(branchOf(f), "", "no branch is created");
}

function withoutField(field: string): Record<string, unknown> {
  const { [field]: _dropped, ...rest } = CONFIG as Record<string, unknown>;
  return rest;
}

function commitAndPush(f: Fixture, content: string): void {
  commitFile(f.repo, ".dotagents.json", content);
  git(f.repo, "push", "-q", "origin", "main");
}

test("prepare stops with no-config when HEAD has no .dotagents.json", () => {
  const f = fixture(null);
  const out = assertStopped(prepare(f), "no-config");
  assert.equal(out.detail, `HEAD of ${f.repo} has no .dotagents.json.`);
  assertNothingCreated(f);
});

test("prepare stops with uncommitted-start-inputs when .dotagents.json has unstaged or staged changes, before reading the Issue", () => {
  const detailOf = (f: Fixture) =>
    `.dotagents.json of ${f.repo} has uncommitted changes. launch.ts reads the committed file, and neither stashes the changes nor carries them over.`;
  const unstaged = fixture();
  writeFileSync(join(unstaged.repo, ".dotagents.json"), `${JSON.stringify({ ...CONFIG, check: "false" })}\n`);
  assert.equal(assertStopped(prepare(unstaged), "uncommitted-start-inputs").detail, detailOf(unstaged));
  assertNothingCreated(unstaged);
  fakeGh(unstaged, null);
  assertStopped(prepare(unstaged), "uncommitted-start-inputs");
  const staged = fixture();
  writeFileSync(join(staged.repo, ".dotagents.json"), `${JSON.stringify({ ...CONFIG, check: "false" })}\n`);
  git(staged.repo, "add", ".dotagents.json");
  assert.equal(assertStopped(prepare(staged), "uncommitted-start-inputs").detail, detailOf(staged));
  assertNothingCreated(staged);
});

test("prepare stops with invalid-config naming only the one rule a config breaks, and creates nothing", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ ...CONFIG, extra: 1 }, "only these fields are allowed: repository, remote, baseBranch, setup, check, feedbackCheck, ciChecks, capture"],
    [{ ...CONFIG, repository: "owner" }, "repository must be owner/name"],
    [withoutField("repository"), "repository must be owner/name"],
    [{ ...CONFIG, remote: "has space" }, "remote must be a remote name"],
    [{ ...CONFIG, baseBranch: "" }, "baseBranch must be a branch name"],
    [{ ...CONFIG, baseBranch: "-main" }, "baseBranch must be a branch name"],
    [withoutField("setup"), "setup must be a shell string or an array of argv arrays ([] when none)"],
    [{ ...CONFIG, setup: "  " }, "setup must be a shell string or an array of argv arrays ([] when none)"],
    [{ ...CONFIG, setup: [[" ", "x"]] }, "setup must be a shell string or an array of argv arrays ([] when none)"],
    [withoutField("check"), "check must be a shell string or a non-empty argv array"],
    [{ ...CONFIG, check: [] }, "check must be a shell string or a non-empty argv array"],
    [{ ...CONFIG, feedbackCheck: "" }, "feedbackCheck must be omitted, a shell string, or a non-empty argv array"],
    [{ ...CONFIG, ciChecks: ["test", "test"] }, "ciChecks must be an array of unique non-empty check names"],
    [{ ...CONFIG, ciChecks: [" "] }, "ciChecks must be an array of unique non-empty check names"],
    [withoutField("ciChecks"), "ciChecks must be an array of unique non-empty check names"],
    [withoutField("capture"), "capture must be null or {command, destination, required} (null when no media is needed)"],
    [
      { ...CONFIG, capture: { command: ["shot"], destination: "../out", required: true } },
      "capture must be null or {command, destination, required} (null when no media is needed)",
    ],
    [
      { ...CONFIG, capture: { command: ["shot"], destination: "out.png", required: "yes" } },
      "capture must be null or {command, destination, required} (null when no media is needed)",
    ],
  ];
  for (const [config, message] of cases) {
    const f = fixture(config);
    const out = assertStopped(prepare(f), "invalid-config");
    assert.equal(out.detail, `.dotagents.json at HEAD of ${f.repo} is not valid: ${message}.`, JSON.stringify(config));
    assertNothingCreated(f);
  }
  const unreadable = fixture({ ...CONFIG, repository: "owner" });
  fakeGh(unreadable, null);
  assertStopped(prepare(unreadable), "invalid-config");
});

test("prepare joins the messages of two broken rules in the order of the rules", () => {
  const f = fixture({ ...CONFIG, check: "", repository: "" });
  const out = assertStopped(prepare(f), "invalid-config");
  assert.equal(
    out.detail,
    `.dotagents.json at HEAD of ${f.repo} is not valid: repository must be owner/name; check must be a shell string or a non-empty argv array.`,
  );
});

test("prepare stops with invalid-config when .dotagents.json is not JSON or is a JSON array", () => {
  for (const content of ["{", "[]\n"]) {
    const f = fixture(null);
    commitAndPush(f, content);
    const out = assertStopped(prepare(f), "invalid-config");
    assert.equal(out.detail, `.dotagents.json at HEAD of ${f.repo} is not valid: .dotagents.json is not a JSON object.`);
    assertNothingCreated(f);
  }
});

test("prepare accepts an argv check, a feedbackCheck, and a capture object", () => {
  const configs = [
    { ...CONFIG, check: ["true"] },
    { ...CONFIG, feedbackCheck: "true" },
    { ...CONFIG, capture: { command: ["shot"], destination: "media/out.png", required: false } },
  ];
  for (const config of configs) {
    const result = prepare(fixture(config));
    assert.equal(result.status, 0, `${JSON.stringify(config)}\n${result.stdout}\n${result.stderr}`);
  }
});

test("prepare stops with no-ci-checks when ciChecks is empty, and creates nothing", () => {
  const f = fixture({ ...CONFIG, ciChecks: [] });
  const out = assertStopped(prepare(f), "no-ci-checks");
  assert.equal(out.detail, `ciChecks in .dotagents.json of ${f.repo} is empty, so no check can confirm the published change.`);
  assertNothingCreated(f);
  fakeGh(f, null);
  assertStopped(prepare(f), "no-ci-checks");
});

test("prepare stops with config-differs when HEAD has an unpushed change to .dotagents.json, and creates nothing", () => {
  const f = fixture();
  commitFile(f.repo, ".dotagents.json", `${JSON.stringify({ ...CONFIG, check: "false" })}\n`);
  const out = assertStopped(prepare(f), "config-differs");
  assert.equal(
    out.detail,
    `.dotagents.json at HEAD of ${f.repo} is not the file at origin/main. The worktree is created from origin/main, so push or pull until the two are the same.`,
  );
  assertNothingCreated(f);
});

test("prepare stops with config-differs when origin's base branch has no .dotagents.json", () => {
  const f = fixture(null);
  commitFile(f.repo, ".dotagents.json", `${JSON.stringify(CONFIG)}\n`);
  assertStopped(prepare(f), "config-differs");
  assertNothingCreated(f);
});

test("prepare succeeds when HEAD has an unpushed commit that leaves .dotagents.json unchanged", () => {
  const f = fixture();
  commitFile(f.repo, "LOCAL.md", "local\n");
  const result = prepare(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).base, git(f.origin, "rev-parse", "main"));
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
  const f = fixture({ ...CONFIG, remote: "nowhere" });
  fakeGit(f, remotesOf("nowhere", "https://github.com/owner/repo.git"));
  assertStopped(prepare(f), "fetch-failed");
});

test("prepare stops with gh-host when GH_HOST points at another host, even when gh fails", () => {
  for (const ghWorks of [true, false]) {
    const f = fixture();
    if (!ghWorks) fakeGh(f, null);
    const out = assertStopped(prepareWithHost(f, " ghe.example.com "), "gh-host");
    assert.equal(out.detail, "GH_HOST points at ghe.example.com. launch.ts handles only github.com.");
    assertNothingCreated(f);
  }
});

test("prepare succeeds when GH_HOST is github.com or only whitespace", () => {
  for (const host of ["github.com", "  "]) {
    const f = fixture();
    const result = prepareWithHost(f, host);
    assert.equal(result.status, 0, `${host}: ${result.stdout}${result.stderr}`);
  }
});

test("prepare succeeds when the remote URLs name the repository in https, scp-like ssh, or ssh form", () => {
  for (const url of ["https://github.com/owner/repo", "git@github.com:owner/repo.git", "ssh://git@github.com/owner/repo.git"]) {
    const f = fixture();
    fakeGit(f, remotesOf("origin", url));
    const result = prepare(f);
    assert.equal(result.status, 0, `${url}: ${result.stdout}${result.stderr}`);
  }
});

test("prepare stops with remote-mismatch when the remote does not point at the repository on github.com", () => {
  const cases: Record<string, string | null> = {
    "fetch URL names another repo": remotesOf("origin", "https://github.com/other/repo.git", "https://github.com/owner/repo.git"),
    "push URL names another repo": remotesOf("origin", "https://github.com/owner/repo.git", "https://github.com/other/repo.git"),
    "URL names another host": remotesOf("origin", "https://example.com/owner/repo.git"),
    "URL is a directory path": remotesOf("origin", "/tmp/launch-origin.git"),
    "the remote has no push line": "origin\thttps://github.com/owner/repo.git (fetch)\n",
    "only another remote is listed": remotesOf("upstream", "https://github.com/owner/repo.git"),
    "git remote -v exits 1": null,
  };
  for (const [name, remotes] of Object.entries(cases)) {
    const f = fixture();
    fakeGit(f, remotes);
    const out = assertStopped(prepare(f), "remote-mismatch");
    assert.equal(
      out.detail,
      `The fetch and push URLs of remote origin in ${f.repo} do not all point at owner/repo on github.com. Fix .dotagents.json or the remote.`,
      name,
    );
    assertNothingCreated(f);
  }
});

test("prepare stops with remote-mismatch even when gh fails", () => {
  const f = fixture();
  fakeGh(f, null);
  fakeGit(f, remotesOf("origin", "https://github.com/other/repo.git"));
  assertStopped(prepare(f), "remote-mismatch");
});

test("prepare stops with repo-unreadable when gh cannot read the repository but can read the Issue", () => {
  const f = fixture();
  fakeGh(f, ISSUE_REPLY, null);
  const out = assertStopped(prepare(f), "repo-unreadable");
  assert.ok(String(out.detail).startsWith("gh could not read the repository owner/repo: "), String(out.detail));
  assert.match(String(out.detail), /not found/);
  assertNothingCreated(f);
});

test("prepare stops with repo-unreadable when the repository reply has no nameWithOwner", () => {
  const f = fixture();
  fakeGh(f, ISSUE_REPLY, { viewerPermission: "WRITE" });
  assertStopped(prepare(f), "repo-unreadable");
});

test("prepare stops with repository-mismatch when GitHub names the repository differently", () => {
  const f = fixture();
  fakeGh(f, ISSUE_REPLY, { nameWithOwner: "other/repo", viewerPermission: "WRITE" });
  const out = assertStopped(prepare(f), "repository-mismatch");
  assert.equal(
    out.detail,
    "GitHub names the repository other/repo, which differs from repository owner/repo in .dotagents.json.",
  );
  assertNothingCreated(f);
});

test("prepare stops with no-permission when the gh user cannot push, naming the permission or unknown", () => {
  for (const [reply, shown] of [
    [{ nameWithOwner: "owner/repo", viewerPermission: "READ" }, "READ"],
    [{ nameWithOwner: "owner/repo" }, "unknown"],
  ] as const) {
    const f = fixture();
    fakeGh(f, ISSUE_REPLY, reply);
    const out = assertStopped(prepare(f), "no-permission");
    assert.equal(out.detail, `The permission of the gh user on owner/repo is ${shown}, which cannot push.`);
    assertNothingCreated(f);
  }
});

test("prepare stops with gh-host, remote-mismatch, repo-unreadable, repository-mismatch, or no-permission with action prepare and the issue", () => {
  const cases: [string, (f: Fixture) => SpawnSyncReturns<string>][] = [
    ["gh-host", (f) => prepareWithHost(f, "ghe.example.com")],
    [
      "remote-mismatch",
      (f) => {
        fakeGit(f, remotesOf("origin", "https://github.com/other/repo.git"));
        return prepare(f);
      },
    ],
    [
      "repo-unreadable",
      (f) => {
        fakeGh(f, ISSUE_REPLY, null);
        return prepare(f);
      },
    ],
    [
      "repository-mismatch",
      (f) => {
        fakeGh(f, ISSUE_REPLY, { nameWithOwner: "other/repo", viewerPermission: "WRITE" });
        return prepare(f);
      },
    ],
    [
      "no-permission",
      (f) => {
        fakeGh(f, ISSUE_REPLY, { nameWithOwner: "owner/repo", viewerPermission: "READ" });
        return prepare(f);
      },
    ],
  ];
  for (const [reason, call] of cases) {
    const out = assertStopped(call(fixture()), reason);
    assert.equal(out.action, "prepare", reason);
    assert.equal(out.issue, ISSUE, reason);
  }
});

test("prepare succeeds when the gh user has ADMIN or MAINTAIN permission", () => {
  for (const viewerPermission of ["ADMIN", "MAINTAIN"]) {
    const f = fixture();
    fakeGh(f, ISSUE_REPLY, { nameWithOwner: "owner/repo", viewerPermission });
    const result = prepare(f);
    assert.equal(result.status, 0, `${viewerPermission}: ${result.stdout}${result.stderr}`);
  }
});

test("prepare does not fetch when the publish target check stops it", () => {
  const f = fixture();
  const before = git(f.repo, "rev-parse", "refs/remotes/origin/main");
  const other = join(f.root, "other");
  git(f.root, "clone", "-q", f.origin, other);
  commitFile(other, "NEW.md", "new\n");
  git(other, "push", "-q", "origin", "main");
  assert.notEqual(git(other, "rev-parse", "HEAD"), before);
  fakeGh(f, ISSUE_REPLY, { nameWithOwner: "owner/repo", viewerPermission: "READ" });
  assertStopped(prepare(f), "no-permission");
  assert.equal(git(f.repo, "rev-parse", "refs/remotes/origin/main"), before);
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
  const f = fixture({ ...CONFIG, setup: "printf '{' > .dotagents.json" });
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
  fakeClaude(f, PASS_CHECK + SESSION_REPLY.replace('"result":"finished"', '"result":"pass reply"'));
  const result = run(f, ["implement", "--worktree", worktreeOf(f)]);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(typeof out.tree, "string");
  assert.deepEqual(out, {
    action: "implement",
    ok: true,
    session_id: "s-1",
    tree: out.tree,
    result: "pass reply",
    cost_usd: 0.5,
    duration_ms: 1200,
  });
  const record = launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> };
  assert.deepEqual(Object.keys(record.implement).sort(), ["at", "issue_digest", "reply", "session_id", "tree"]);
  assert.equal(record.implement.reply, "pass reply");
  assert.equal(record.implement.session_id, "s-1");
  assert.equal(record.implement.tree, out.tree);
  assert.equal(record.implement.issue_digest, digestOf(ISSUE_REPLY));
  assert.equal(typeof record.implement.at, "string");
});

test("implement prints its JSON line whole through a pipe when the child's result is longer than 64 KB", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  const long = "r".repeat(200_000);
  writeFileSync(join(f.logs, "reply.json"), JSON.stringify({ type: "result", session_id: "s-1", result: long, total_cost_usd: 0, duration_ms: 1 }));
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
  fakeClaude(f, SESSION_REPLY.replace('"result":"finished"', '"result":"not-done reply"'));
  const out = assertStopped(run(f, ["implement", "--worktree", worktreeOf(f)]), "not-done");
  assert.equal(out.action, "implement");
  assert.equal(out.session_id, "s-1");
  assert.match(String(out.detail), /No check result is recorded/);
  const record = launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> };
  assert.equal(record.implement.session_id, "s-1");
  assert.equal(record.implement.reply, "not-done reply");
});

test("implement exits 0 with an empty string result in its JSON and records an empty reply when the child that passes the check gives no result", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, `${PASS_CHECK}echo '{"type":"result","session_id":"s-1"}'\n`);
  const result = run(f, ["implement", "--worktree", worktreeOf(f)]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).result, "");
  assert.equal((launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement.reply, "");
});

test("implement exits 0 with an empty string result in its JSON and records an empty reply when the child that passes the check gives the result 3", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, `${PASS_CHECK}echo '{"type":"result","session_id":"s-1","result":3}'\n`);
  const result = run(f, ["implement", "--worktree", worktreeOf(f)]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).result, "");
  assert.equal((launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement.reply, "");
});

test("implement stops with child-failed when claude exits non-zero, prints no JSON, or gives no session_id", () => {
  for (const body of [`${SESSION_REPLY}exit 3\n`, "echo 'not json'\n", `echo '{"type":"result","result":"finished"}'\n`]) {
    const f = fixture();
    assert.equal(prepare(f).status, 0);
    fakeClaude(f, body);
    assertStopped(run(f, ["implement", "--worktree", worktreeOf(f)]), "child-failed");
    const record = (launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement;
    assert.deepEqual(Object.keys(record).sort(), ["issue_digest", "session_id", "started_at"], body);
    const args = readFileSync(join(f.logs, "args"), "utf8").split("\n");
    assert.equal(record.session_id, args[args.indexOf("--session-id") + 1], body);
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

const PUBLISHED_PROPERTIES = {
  assessments: {
    type: "object",
    additionalProperties: false,
    required: ["code", "requirements", "tests", "documentation"],
    properties: {
      code: { type: "string" },
      requirements: { type: "string" },
      tests: { type: "string" },
      documentation: { type: "string" },
    },
  },
  documents: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["path", "role", "reason"],
      properties: {
        path: { type: "string" },
        role: { type: "string", enum: ["current", "historical", "proposal"] },
        reason: { type: "string" },
      },
    },
  },
  handoff: { type: "array", items: { type: "string" } },
};

const INDEPENDENT_REVIEW_SCHEMA = {
  ...REVIEW_SCHEMA,
  required: ["findings", "verified", "assessments", "documents", "handoff"],
  properties: { ...REVIEW_SCHEMA.properties, ...PUBLISHED_PROPERTIES },
};

const POINTS = `Assess four separate things:
1. Code: correctness at the input boundaries, state written to disk, behavior when something fails, and concrete redundancy (the same file read or the same judgment computed twice).
2. Requirements and scope: every item the Issue scopes is present and behaves as the Issue's tables say, and nothing the Issue lists as out of scope changed. Check each sentence the Issue says to insert verbatim against the Issue mechanically.
3. Tests: each done condition in the Issue has a test that would fail if the behavior were removed. Run the targeted tests. For at least two tests, break the code in a temporary copy to show the test fails, and say what you broke.
4. Documentation and repository rules that apply to the changed files. Read the repository's instruction files, such as CLAUDE.md and AGENTS.md and the rules they point to, to find them.`;

const CLOSING = `Do not edit any file in this worktree. Do not commit. Scratch files go under the directory in $TMPDIR.

Give the result through the structured output. \`findings\` lists every finding. Set \`required\` to true only for a defect you demonstrated or a requirement of the Issue that is not met, which must be fixed before the change is published. Set it to false for every other concern. \`location\` is \`file:line\`, or an empty string when no line applies. \`condition\` is the input or state that triggers the finding, \`problem\` is what goes wrong, and \`action\` is what to do. \`verified\` says what you checked and how. An empty \`findings\` is a valid result.`;

const PUBLISHED_FIELDS = `The pull request body publishes these fields of your result: \`assessments\`, \`documents\`, \`handoff\`, the \`reason\` of each judgment in \`previous\`, and \`condition\`, \`problem\`, and \`action\` of each finding that is not required.

Give each explanation one home. \`assessments.code\` explains the final change and why. \`assessments.requirements\` maps the change to the behavior the Issue agreed. \`assessments.tests\` states what was actually verified and the limits of that verification. \`assessments.documentation\` explains which documents and sources apply, where they agree with the change, and which premises changed. Give a substantive reason in all four, also when one of them does not apply. Do not repeat the same change, conclusion, or caveat across them, and do not retell the history of review rounds and repairs.

For a judgment of \`fixed\` or \`withdrawn\`, \`reason\` is the complete public response: name the problem and its conditions, and the current resolution or why the finding did not hold.

In \`documents\`, list the principal repository documents you actually consulted. \`path\` is relative to the repository root and must be a regular file in this worktree. \`role\` is \`current\` for a document that states what holds now, \`historical\` for a record of the past, and \`proposal\` for something not adopted. \`reason\` says why you consulted it.

\`handoff\` lists only what is specific to this Issue: conditions left unverified, required follow-up, and steps handed to a named owner. The publishing side adds the routine tasks itself (publication, CI, the check of the published body, and human review, approval, and merge), so do not repeat them. Return \`[]\` when nothing remains.`;

const selfPrompt = (base: string): string => `Before your change for Issue #42 is published, review it yourself and try to refute it. The change is everything in this worktree that differs from commit ${base}, committed or not. Read the change again with \`git diff ${base}\` and \`git status --short\`, each untracked file, and the code the change calls or is called by.

${POINTS}

${CLOSING}`;

const independentPrompt = (base: string): string => `Independently review the change in this worktree against GitHub Issue #42 of owner/repo. The change is everything in this worktree that differs from commit ${base}, committed or not. You did not write this change, and you have no context from the session that did. New files may be untracked, so read the change with \`git diff ${base}\` and \`git status --short\`, and read each untracked file.

Read the Issue with \`gh issue view 42 --repo owner/repo --json title,body\`, the change, and the code the change calls or is called by.

${POINTS}

${PUBLISHED_FIELDS}

${CLOSING}`;

interface Step {
  reply?: Record<string, unknown> | string;
  exit?: number;
  edit?: string;
  issue?: Record<string, unknown>;
}

const FINDING = { location: "a.ts:1", condition: "c", problem: "p", action: "a" };

const ASSESSMENTS = { code: "code reason", requirements: "requirements reason", tests: "tests reason", documentation: "documentation reason" };

const PUBLISHED = { assessments: ASSESSMENTS, documents: [], handoff: [] };

const shaped = (session: string, findings: Record<string, unknown>[] = [], cost = 1): Record<string, unknown> => ({
  session_id: session,
  structured_output: { findings, verified: `${session} checked`, ...PUBLISHED },
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
if (step.issue) fs.writeFileSync(logs + "/gh-reply.json", JSON.stringify(step.issue));
if (step.reply !== undefined) process.stdout.write(typeof step.reply === "string" ? step.reply : JSON.stringify(step.reply));
process.exit(step.exit || 0);
`,
    { mode: 0o755 },
  );
}

function implemented(beforeCheck = ""): Fixture {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, beforeCheck + PASS_CHECK + SESSION_REPLY);
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
      independent: {
        verdict: "accepted",
        findings: [],
        previous: [],
        verified: "ind-1 checked",
        session_id: "ind-1",
        cost_usd: 1,
        duration_ms: 10,
        ...PUBLISHED,
      },
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
    issue_digest: digestOf(ISSUE_REPLY),
    at: reviews[0].at,
    verdict: "accepted",
    required: [],
    self: { session_id: "self-1", verdict: "accepted", findings: [], previous: [], verified: "self-1 checked" },
    independent: { session_id: "ind-1", verdict: "accepted", findings: [], previous: [], verified: "ind-1 checked", ...PUBLISHED },
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
    assert.equal(flagValue(call.args, "--model"), "opus");
  }
  assert.deepEqual(JSON.parse(flagValue(self.args, "--json-schema")), REVIEW_SCHEMA);
  assert.deepEqual(JSON.parse(flagValue(independent.args, "--json-schema")), INDEPENDENT_REVIEW_SCHEMA);
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
  assert.equal(callOf(f, "self").stdin, selfPrompt(baseOf(f)));
  assert.equal(callOf(f, "independent").stdin, independentPrompt(baseOf(f)));
});

test("review gives both reviews the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = implemented();
  const base = moveBaseToParent(f);
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  assert.equal(callOf(f, "self").stdin, selfPrompt(base));
  assert.equal(callOf(f, "independent").stdin, independentPrompt(base));
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

const repairPromptWith = (base: string, lines: string): string => `The reviews of your change for Issue #42 reported findings that must be settled before the change is published. The change is everything in this worktree that differs from commit ${base}, committed or not. Each line below is one finding as a JSON object. \`key\` names the finding, \`side\` is the review that reported it, \`location\` is where it is, \`condition\` is the input or state that triggers it, \`problem\` is what goes wrong, and \`action\` is what the review suggests. \`reopened\` lists the reviews that judged the finding still open after an earlier repair, each with its reason.

${lines}

1. For each finding, read the code it names and reproduce the problem, and judge whether the finding holds. Fix each finding that holds, and add or change a test that fails without the fix. Do not change the scope of the Issue.
2. Run \`${DONE_GATE} check\`. Fix what fails and run it again.
3. You are done when \`${DONE_GATE} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: for each finding, its \`key\` and what you changed, or why you changed nothing; the files you changed; what \`${DONE_GATE} status\` printed; each decision you made for this Issue that the Issue does not state, including the ones from your earlier turns and leaving out the ones you later undid; and each step the Issue hands over to a named person.
`;

const repairPrompt = (base: string): string => repairPromptWith(base, `{"key":"1-self-1","side":"self","location":"a.ts:1","condition":"c1","problem":"p1","action":"a1","reopened":[]}
{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3","reopened":[]}`);

const REPAIR_REPLY = `echo '{"type":"result","session_id":"s-1","result":"repaired","total_cost_usd":0.7,"duration_ms":900}'\n`;
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
  assert.equal(readFileSync(join(f.logs, "repair-stdin"), "utf8"), repairPrompt(baseOf(f)));
});

test("repair gives claude the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = rejected();
  const base = moveBaseToParent(f);
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  assert.equal(readFileSync(join(f.logs, "repair-stdin"), "utf8"), repairPrompt(base));
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
  for (const body of [`${REPAIR_REPLY}exit 3\n`, "echo 'not json'\n", `echo '{"type":"result","result":"repaired"}'\n`]) {
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
    ...PUBLISHED,
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

const INDEPENDENT_JUDGING_SCHEMA = {
  ...JUDGING_SCHEMA,
  required: ["findings", "verified", "previous", "assessments", "documents", "handoff"],
  properties: { ...JUDGING_SCHEMA.properties, ...PUBLISHED_PROPERTIES },
};

const EARLIER = `An earlier review round reported the findings below as required, and the change may have been repaired since. Each line is one finding as a JSON object with its \`key\`.

{"key":"1-self-1","side":"self","location":"a.ts:1","condition":"c1","problem":"p1","action":"a1"}
{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3"}`;

const JUDGE = "Judge each earlier finding against the current change. In `previous`, return exactly one entry for every `key`. `state` is `fixed` when the problem no longer occurs, `open` when it still occurs, and `withdrawn` when you now judge that the finding did not hold. `reason` says what you checked and what you saw. Do not repeat an earlier finding in `findings`. `findings` is for problems the earlier rounds did not report.";

const REPLY_PARAGRAPH = `The implementing session replied to the earlier findings as follows. Treat the reply as a claim to check, not as a fact.

repaired`;

const selfJudgingPrompt = (base: string): string => `Before your change for Issue #42 is published, review it yourself and try to refute it. The change is everything in this worktree that differs from commit ${base}, committed or not. Read the change again with \`git diff ${base}\` and \`git status --short\`, each untracked file, and the code the change calls or is called by.

${EARLIER}

${JUDGE}

${POINTS}

${CLOSING}`;

const independentJudgingPrompt = (base: string, reply: string | null): string => `Independently review the change in this worktree against GitHub Issue #42 of owner/repo. The change is everything in this worktree that differs from commit ${base}, committed or not. You did not write this change, and you have no context from the session that did. New files may be untracked, so read the change with \`git diff ${base}\` and \`git status --short\`, and read each untracked file.

Read the Issue with \`gh issue view 42 --repo owner/repo --json title,body\`, the change, and the code the change calls or is called by.

${EARLIER}

${reply === null ? "" : `${reply}\n\n`}${JUDGE}

${POINTS}

${PUBLISHED_FIELDS}

${CLOSING}`;

function rewriteLaunch(f: Fixture, change: (stored: Record<string, unknown>) => Record<string, unknown>): void {
  const dir = git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  writeFileSync(join(dir, "launch.json"), `${JSON.stringify(change(launchRecord(worktreeOf(f))), null, 2)}\n`);
}

function moveBaseToParent(f: Fixture): string {
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
    const expected: [string, string, Record<string, unknown>][] = [
      ["self", selfPrompt(baseOf(f)), REVIEW_SCHEMA],
      ["independent", independentPrompt(baseOf(f)), INDEPENDENT_REVIEW_SCHEMA],
    ];
    for (const [name, prompt, schema] of expected) {
      assert.equal(callOf(f, name).stdin, prompt, label);
      assert.deepEqual(JSON.parse(flagValue(callOf(f, name).args, "--json-schema")), schema, label);
    }
  }
});

test("a review after a round with required findings gives both reviews the earlier findings in order and the judging paragraph, with the judging schema", () => {
  const f = rejected();
  fakeReviewer(f, BOTH_OPEN);
  reviewOut(f);
  assert.equal(callOf(f, "self").stdin, selfJudgingPrompt(baseOf(f)));
  assert.equal(callOf(f, "independent").stdin, independentJudgingPrompt(baseOf(f), null));
  assert.deepEqual(JSON.parse(flagValue(callOf(f, "self").args, "--json-schema")), JUDGING_SCHEMA);
  assert.deepEqual(JSON.parse(flagValue(callOf(f, "independent").args, "--json-schema")), INDEPENDENT_JUDGING_SCHEMA);
});

test("the implementing session's reply to the last reviewed round reaches only the independent review", () => {
  const f = rejected();
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  fakeReviewer(f, BOTH_OPEN);
  reviewOut(f);
  assert.equal(callOf(f, "self").stdin, selfJudgingPrompt(baseOf(f)));
  assert.equal(callOf(f, "independent").stdin, independentJudgingPrompt(baseOf(f), REPLY_PARAGRAPH));
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
    assert.equal(callOf(f, "self").stdin, selfJudgingPrompt(baseOf(f)), label);
    assert.equal(callOf(f, "independent").stdin, independentJudgingPrompt(baseOf(f), null), label);
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
    structured_output: { findings: [], verified: "v", ...PUBLISHED, ...(previous === undefined ? {} : { previous }) },
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
    assert.deepEqual(JSON.parse(flagValue(callOf(f, "again-ind-2").args, "--json-schema")), INDEPENDENT_JUDGING_SCHEMA, label);
    assert.deepEqual(launchRecord(worktreeOf(f)), before, label);
  }
});

const independentReply = (published: Record<string, unknown>): Record<string, unknown> => ({
  session_id: "ind-1",
  structured_output: { findings: [], verified: "ind-1 checked", ...published },
  total_cost_usd: 1,
  duration_ms: 10,
});

const DOCUMENT = { path: "README.md", role: "current", reason: "states what the fixture holds" };

const PATH_KINDS = "mkdir -p docs\nprintf 'doc\\n' > docs/new.md\nln -s README.md link.md\nprintf 'ignored.md\\n' > .gitignore\nprintf 'ignored\\n' > ignored.md\n";

const UNSHAPED_INDEPENDENT =
  "its structured_output is not an object whose findings array has a boolean required in every element and whose assessments, documents, and handoff are as the prompt asks";

test("an accepted review records the independent review's assessments, documents, and handoff after its other keys as returned, and self has none of them", () => {
  const f = implemented();
  const published: Record<string, unknown> = {
    assessments: ASSESSMENTS,
    documents: [{ ...DOCUMENT, extra: "kept" }],
    handoff: ["confirm the first real run"],
  };
  fakeReviewer(f, { self: CLEAN.self, independent: { reply: independentReply(published) } });
  const out = reviewOut(f) as unknown as { reviews: Record<string, Record<string, unknown>> };
  const record = lastReview(f) as unknown as Record<string, Record<string, unknown>>;
  assert.deepEqual(Object.keys(record.independent), ["session_id", "verdict", "findings", "previous", "verified", "assessments", "documents", "handoff"]);
  for (const key of ["assessments", "documents", "handoff"]) {
    assert.deepEqual(record.independent[key], published[key], key);
    assert.deepEqual(out.reviews.independent[key], published[key], key);
    assert.ok(!Object.hasOwn(record.self, key), key);
    assert.ok(!Object.hasOwn(out.reviews.self, key), key);
  }
});

test("a review succeeds when self returns none of assessments, documents, and handoff", () => {
  const f = implemented();
  const self = { session_id: "self-1", structured_output: { findings: [], verified: "self-1 checked" }, total_cost_usd: 1, duration_ms: 10 };
  fakeReviewer(f, { self: { reply: self }, independent: CLEAN.independent });
  assert.equal(reviewOut(f).verdict, "accepted");
  assert.deepEqual(callsOf(f).sort(), ["independent", "self"]);
});

test("the independent review passes with a document that is an untracked new file, and with empty documents and handoff", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["untracked new file", { assessments: ASSESSMENTS, documents: [{ ...DOCUMENT, path: "docs/new.md" }], handoff: [] }],
    ["empty arrays", { assessments: ASSESSMENTS, documents: [], handoff: [] }],
  ];
  for (const [label, published] of cases) {
    const f = implemented(PATH_KINDS);
    fakeReviewer(f, { self: CLEAN.self, independent: { reply: independentReply(published) } });
    const out = reviewOut(f) as unknown as { reviews: Record<string, Record<string, unknown>> };
    assert.deepEqual(out.reviews.independent.documents, published.documents, label);
    assert.deepEqual(callsOf(f).filter((name) => name.startsWith("again-")), [], label);
  }
});

test("an independent review without assessments is asked once more in its session, and the reply that passes is used", () => {
  const f = implemented();
  fakeReviewer(f, {
    self: CLEAN.self,
    independent: { reply: independentReply({ documents: [], handoff: [] }) },
    "again-ind-1": { reply: independentReply({ assessments: ASSESSMENTS, documents: [DOCUMENT], handoff: [] }) },
  });
  reviewOut(f);
  assert.deepEqual(callsOf(f).filter((name) => name.startsWith("again-")), ["again-ind-1"]);
  assert.equal(callOf(f, "again-ind-1").stdin, GIVE_REPLY);
  assert.deepEqual((lastReview(f) as unknown as Record<string, Record<string, unknown>>).independent.documents, [DOCUMENT]);
});

test("an independent review whose assessments, documents, or handoff fails twice stops with review-failed naming the published fields and adds no record", () => {
  const withoutDocumentation = Object.fromEntries(Object.entries(ASSESSMENTS).filter(([name]) => name !== "documentation"));
  const documented = (documents: unknown[]) => ({ assessments: ASSESSMENTS, documents, handoff: [] });
  const cases: [string, Record<string, unknown>][] = [
    ["tests is only spaces", { assessments: { ...ASSESSMENTS, tests: "  " }, documents: [], handoff: [] }],
    ["documentation is missing", { assessments: withoutDocumentation, documents: [], handoff: [] }],
    ["a document is not an object", documented(["README.md"])],
    ["the path is not in the tree", documented([{ ...DOCUMENT, path: "missing.md" }])],
    ["the path is written as ./README.md", documented([{ ...DOCUMENT, path: "./README.md" }])],
    ["the path is a directory", documented([{ ...DOCUMENT, path: "docs" }])],
    ["the path is a symlink", documented([{ ...DOCUMENT, path: "link.md" }])],
    ["the path is ignored by git", documented([{ ...DOCUMENT, path: "ignored.md" }])],
    ["two documents share a path", documented([DOCUMENT, DOCUMENT])],
    ["the role is draft", documented([{ ...DOCUMENT, role: "draft" }])],
    ["the reason is empty", documented([{ ...DOCUMENT, reason: "" }])],
    ["handoff holds an empty string", { assessments: ASSESSMENTS, documents: [], handoff: [""] }],
    ["handoff is not an array", { assessments: ASSESSMENTS, documents: [], handoff: "nothing" }],
  ];
  const f = implemented(PATH_KINDS);
  const before = launchRecord(worktreeOf(f));
  for (const [label, published] of cases) {
    for (const name of ["calls", "started-self", "started-independent"]) rmSync(join(f.logs, name), { force: true });
    const reply = independentReply(published);
    fakeReviewer(f, { self: CLEAN.self, independent: { reply }, "again-ind-1": { reply } });
    const out = assertStopped(review(f), "review-failed") as { detail: string };
    assert.ok(out.detail.includes(`The independent review gave no readable result: ${UNSHAPED_INDEPENDENT}, also after asking once more.`), `${label}: ${out.detail}`);
    assert.deepEqual(callsOf(f).filter((name) => name.startsWith("again-")), ["again-ind-1"], label);
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
    repairPromptWith(baseOf(f), `{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3","reopened":[{"side":"self","reason":"self-2 saw 1-independent-1 open"}]}
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
    [`echo '{"type":"result","session_id":"s-1","result":{"text":"x"}}'\n`, ""],
    [`echo '{"type":"result","session_id":"s-1"}'\n`, ""],
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
  issue?: Record<string, unknown>;
}

type Script = Partial<Record<"implement" | "self" | "independent" | "repair" | "reread" | "continue", Turn[]>>;

function fakeRounds(f: Fixture, script: Script): void {
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
  : stdin.startsWith("GitHub Issue #")
    ? "reread"
    : stdin.startsWith("Your work on GitHub Issue #")
      ? "continue"
      : stdin.startsWith("Your turn implementing")
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
  launch_file: string | null;
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
  const implemented: Turn = { ...IMPLEMENTED, reply: { session_id: "s-1", result: "run implement reply", total_cost_usd: 0.5, duration_ms: 1200 } };
  fakeRounds(f, { implement: [implemented], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(
    { action: out.action, ok: out.ok, verdict: out.verdict, required: out.required, rounds: out.rounds },
    { action: "run", ok: true, verdict: "accepted", required: [], rounds: 1 },
  );
  assert.deepEqual(Object.keys(out), ["action", "ok", "verdict", "required", "rounds", "steps", "cost_usd", "launch_file"]);
  assert.equal(out.launch_file, launchPathOf(f));
  assert.equal(JSON.parse(readFileSync(String(out.launch_file), "utf8")).implement.reply, "run implement reply");
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
  assert.equal(out.launch_file, launchPathOf(f));
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
  assert.equal(out.launch_file, join(git(f.repo, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch.json"));
  assert.ok(!existsSync(String(out.launch_file)));
  assert.deepEqual(roundCalls(f), []);
});

test("run stops with not-prepared and a null launch_file when --worktree names a path that does not exist", () => {
  const f = fixture();
  const out = assertStopped(run(f, ["run", "--worktree", join(f.root, "missing")]), "not-prepared") as unknown as RunOut;
  assert.equal(out.launch_file, null);
});

test("run stops with not-prepared and a null launch_file when --worktree names a directory outside any git work tree", () => {
  const f = fixture();
  const out = assertStopped(run(f, ["run", "--worktree", f.logs]), "not-prepared") as unknown as RunOut;
  assert.equal(out.launch_file, null);
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

const CHANGED_BODY = { ...ISSUE_REPLY, body: "body changed after prepare" };

test("prepare records issue_digest as the sha256 of the title, body, and state that gh returned", () => {
  const f = fixture();
  const reply = { number: ISSUE, title: FEATURE_TITLE, body: "本文 with \"quotes\"\nand lines", state: "OPEN" };
  fakeGh(f, reply);
  assert.equal(prepare(f).status, 0);
  const digest = launchRecord(worktreeOf(f)).issue_digest;
  assert.equal(digest, createHash("sha256").update(JSON.stringify([reply.title, reply.body, reply.state])).digest("hex"));
  assert.match(String(digest), /^[0-9a-f]{64}$/);
});

test("implement stops with requirements-changed, starts no claude, and keeps launch.json when the body, title, or state changed after prepare", () => {
  const changes: [string, Record<string, unknown>][] = [
    ["body", CHANGED_BODY],
    ["title", { ...ISSUE_REPLY, title: `${FEATURE_TITLE} again` }],
    ["state", { ...ISSUE_REPLY, state: "CLOSED" }],
  ];
  for (const [label, reply] of changes) {
    const f = prepared();
    const before = launchRecord(worktreeOf(f));
    fakeGh(f, reply);
    fakeRounds(f, { implement: [IMPLEMENTED] });
    const out = assertStopped(run(f, ["implement", "--worktree", worktreeOf(f)]), "requirements-changed");
    assert.equal(out.action, "implement", label);
    assert.match(String(out.detail), /Issue #42 of owner\/repo/, label);
    assert.deepEqual(roundCalls(f), [], label);
    assert.deepEqual(launchRecord(worktreeOf(f)), before, label);
  }
});

test("implement, review, and repair stop with issue-unreadable and start no claude when gh fails after prepare", () => {
  const cases: [string, () => Fixture][] = [
    ["implement", prepared],
    ["review", implemented],
    ["repair", rejected],
  ];
  for (const [action, arrange] of cases) {
    const f = arrange();
    const before = launchRecord(worktreeOf(f));
    fakeGh(f, null);
    fakeRounds(f, { implement: [IMPLEMENTED], repair: [REPAIRED] });
    const out = assertStopped(run(f, [action, "--worktree", worktreeOf(f)]), "issue-unreadable");
    assert.equal(out.action, action);
    assert.match(String(out.detail), /Issue #42 of owner\/repo: not found/, action);
    assert.deepEqual(roundCalls(f), [], action);
    assert.deepEqual(launchRecord(worktreeOf(f)), before, action);
  }
});

test("review stops with requirements-changed, starts no claude, and keeps launch.json when the body changed after implement", () => {
  const f = implemented();
  const before = launchRecord(worktreeOf(f));
  fakeGh(f, CHANGED_BODY);
  fakeReviewer(f, CLEAN);
  const out = assertStopped(review(f), "requirements-changed");
  assert.equal(out.action, "review");
  assert.deepEqual(callsOf(f), []);
  assert.deepEqual(launchRecord(worktreeOf(f)), before);
});

test("review stops with requirements-changed, records nothing, and returns both reviews when the body changes while the reviews run", () => {
  const f = implemented();
  const before = launchRecord(worktreeOf(f));
  fakeReviewer(f, { ...CLEAN, self: { ...CLEAN.self, issue: CHANGED_BODY } });
  const out = assertStopped(review(f), "requirements-changed") as { reviews: Record<string, Record<string, unknown>> };
  assert.deepEqual(Object.keys(out.reviews).sort(), ["independent", "self"]);
  assert.equal(out.reviews.self.session_id, "self-1");
  assert.equal(out.reviews.independent.session_id, "ind-1");
  assert.deepEqual(launchRecord(worktreeOf(f)), before);
});

test("repair stops with requirements-changed, starts no claude, and keeps launch.json when the body changed after a rejected review", () => {
  const f = rejected();
  const before = launchRecord(worktreeOf(f));
  fakeGh(f, CHANGED_BODY);
  fakeRepairer(f, EDIT_FILE + PASS_CHECK + REPAIR_REPLY);
  const out = assertStopped(repair(f), "requirements-changed");
  assert.equal(out.action, "repair");
  assert.equal(repairCalls(f), 0);
  assert.deepEqual(launchRecord(worktreeOf(f)), before);
});

test("run on an accepted worktree stops with requirements-changed and no steps when the body changed, and starts no claude", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  fakeGh(f, CHANGED_BODY);
  fakeRounds(f, {});
  const out = assertStopped(runLaunch(f), "requirements-changed") as unknown as RunOut;
  assert.equal(out.action, "run");
  assert.deepEqual(out.steps, []);
  assert.equal(out.verdict, "accepted");
  assert.equal(out.rounds, 1);
  assert.deepEqual(roundCalls(f), []);
});

test("run stops at the review after implement with requirements-changed when the body changes while the implement child runs", () => {
  const f = prepared();
  fakeRounds(f, { implement: [{ ...IMPLEMENTED, issue: CHANGED_BODY }], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const out = assertStopped(runLaunch(f), "requirements-changed") as unknown as RunOut;
  assert.deepEqual(actionsOf(out), ["implement", "review"]);
  assert.equal(out.steps[out.steps.length - 1].ok, false);
  assert.equal(out.steps[out.steps.length - 1].reason, "requirements-changed");
  assert.deepEqual(roundCalls(f).map((call) => call.role), ["implement"]);
});

test("implement, review, repair, and run stop with not-prepared and start no claude when issue_digest is missing or not 64 lowercase hex characters", () => {
  const digest = digestOf(ISSUE_REPLY);
  const values: unknown[] = [undefined, digest.toUpperCase(), digest.slice(1), `${digest}0`, 42];
  for (const value of values) {
    const f = rejected();
    rewriteLaunch(f, ({ issue_digest: _digest, ...rest }) => (value === undefined ? rest : { ...rest, issue_digest: value }));
    const before = launchRecord(worktreeOf(f));
    fakeRounds(f, { implement: [IMPLEMENTED], repair: [REPAIRED] });
    for (const action of ["implement", "review", "repair", "run"]) {
      const out = assertStopped(run(f, [action, "--worktree", worktreeOf(f)]), "not-prepared");
      assert.equal(out.action, action, String(value));
    }
    assert.deepEqual(roundCalls(f), [], String(value));
    assert.deepEqual(launchRecord(worktreeOf(f)), before, String(value));
  }
});

function fakeHangingClaude(f: Fixture): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\nprintf '%s\\n' "$@" > "$LOGS/hanging-args"\necho $$ >> "$LOGS/hanging-claude-pids"\nsleep 60 &\necho $! >> "$LOGS/hanging-sleep-pids"\nwait\n`,
    { mode: 0o755 },
  );
}

const pidsIn = (f: Fixture, name: string): number[] =>
  existsSync(join(f.logs, name)) ? readFileSync(join(f.logs, name), "utf8").split("\n").filter(Boolean).map(Number) : [];

const isRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

async function waitFor(condition: () => boolean, limitMs: number): Promise<boolean> {
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

async function signalWhileClaudeWaits(f: Fixture, args: string[], signal: NodeJS.Signals, claudes: number): Promise<Signalled> {
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

function assertEndedBySignal(result: Signalled, claudes: number): void {
  assert.equal(result.code, 143, `exit ${result.code} signal ${result.signal}: ${result.stderr}`);
  assert.equal(result.stdout, "");
  assert.equal(result.pids.length, claudes * 2);
  assert.deepEqual(result.survivors, []);
}

const launchFile = (f: Fixture): string =>
  readFileSync(join(git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch.json"), "utf8");

for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
  test(`implement ends claude and its child, exits 143, prints nothing, and keeps the record written before the launch on ${signal}`, async () => {
    const f = prepared();
    const before = JSON.parse(launchFile(f));
    const result = await signalWhileClaudeWaits(f, ["implement", "--worktree", worktreeOf(f)], signal, 1);
    assertEndedBySignal(result, 1);
    const after = JSON.parse(launchFile(f));
    const args = readFileSync(join(f.logs, "hanging-args"), "utf8").split("\n");
    assert.equal(typeof after.implement.started_at, "string");
    assert.deepEqual(after, {
      ...before,
      implement: { session_id: args[args.indexOf("--session-id") + 1], issue_digest: before.issue_digest, started_at: after.implement.started_at },
    });
  });
}

test("review ends both claude and their children, exits 143, and adds no record to launch.json on SIGTERM", async () => {
  const f = implemented();
  const before = launchFile(f);
  const result = await signalWhileClaudeWaits(f, ["review", "--worktree", worktreeOf(f)], "SIGTERM", 2);
  assertEndedBySignal(result, 2);
  assert.equal(launchFile(f), before);
});

test("repair ends claude and its child and exits 143 on SIGTERM", async () => {
  const f = rejected();
  const before = launchFile(f);
  const result = await signalWhileClaudeWaits(f, ["repair", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  assert.equal(launchFile(f), before);
});

test("run ends the claude of the action it called, exits 143, and starts no claude after it on SIGTERM", async () => {
  const f = prepared();
  const result = await signalWhileClaudeWaits(f, ["run", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  assert.equal(pidsIn(f, "hanging-claude-pids").length, 1);
});

const agree = (f: Fixture, ...extra: string[]) => run(f, ["agree", "--worktree", worktreeOf(f), ...extra]);

const reread = (f: Fixture, ...extra: string[]) => run(f, ["reread", "--worktree", worktreeOf(f), ...extra]);

const AGREED_DIGEST = digestOf(CHANGED_BODY);

const rereadPrompt = (base: string): string => `GitHub Issue #42 of owner/repo changed after you last read it. The Issue as it is now is the agreed requirement.

1. Read the Issue again with \`gh issue view 42 --repo owner/repo --json title,body\`, and find what changed from the version you read before.
2. Compare every requirement, done condition, and out-of-scope item of the Issue with your change. The change is everything in this worktree that differs from commit ${base}, committed or not. Read it with \`git diff ${base}\` and \`git status --short\`. Change the code, the tests, and the documents that no longer match the Issue. Do not change what the Issue does not ask for.
3. Run \`${DONE_GATE} check\`. Fix what fails and run it again.
4. You are done when \`${DONE_GATE} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: what changed in the Issue; for each change, what you changed or why you changed nothing; the files you changed; what \`${DONE_GATE} status\` printed; each decision you made for this Issue that the Issue does not state, including the ones from your earlier turns and leaving out the ones you later undid; and each step the Issue hands over to a named person.
`;

const REREAD_REPLY = `echo '{"type":"result","session_id":"s-1","result":"reread","total_cost_usd":0.3,"duration_ms":700}'\n`;

function fakeRereader(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\necho call >> "$LOGS/reread-calls"\npwd -P > "$LOGS/reread-cwd"\nprintf '%s\\n' "$@" > "$LOGS/reread-args"\ncat > "$LOGS/reread-stdin"\n${body}`,
    { mode: 0o755 },
  );
}

const rereadCalls = (f: Fixture): number =>
  existsSync(join(f.logs, "reread-calls")) ? readFileSync(join(f.logs, "reread-calls"), "utf8").split("\n").filter(Boolean).length : 0;

function agreedAfterChange(arrange: () => Fixture = implemented): Fixture {
  const f = arrange();
  fakeGh(f, CHANGED_BODY);
  const result = agree(f);
  assert.equal(result.status, 0, result.stderr);
  return f;
}

function accepted(): Fixture {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  return f;
}

const REREAD_EDITED: Turn = { edit: true, check: true, reply: { session_id: "s-1", result: "reread", total_cost_usd: 0.3, duration_ms: 700 } };
const REREAD_UNCHANGED: Turn = { reply: { session_id: "s-1", result: "reread", total_cost_usd: 0.3, duration_ms: 700 } };

test("implement records the agreed issue_digest in launch.json's implement, and review records it in its round", () => {
  const f = implemented();
  assert.equal((launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement.issue_digest, digestOf(ISSUE_REPLY));
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  assert.equal(lastReview(f).issue_digest, digestOf(ISSUE_REPLY));
});

test("agree after the body changed returns changed true with the title and body gh returned, rewrites only issue_digest, and starts no claude", () => {
  const f = implemented();
  const before = launchRecord(worktreeOf(f));
  fakeGh(f, CHANGED_BODY);
  fakeRounds(f, {});
  const result = agree(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(outputOf(result), {
    action: "agree",
    ok: true,
    issue: ISSUE,
    issue_digest: AGREED_DIGEST,
    changed: true,
    title: CHANGED_BODY.title,
    body: CHANGED_BODY.body,
  });
  assert.deepEqual(launchRecord(worktreeOf(f)), { ...before, issue_digest: AGREED_DIGEST });
  assert.deepEqual(roundCalls(f), []);
});

test("agree on an unchanged Issue succeeds with changed false and leaves launch.json as it was", () => {
  const f = implemented();
  const before = launchFile(f);
  fakeRounds(f, {});
  const result = agree(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(out.changed, false);
  assert.equal(out.issue_digest, digestOf(ISSUE_REPLY));
  assert.equal(launchFile(f), before);
  assert.deepEqual(roundCalls(f), []);
});

test("agree stops with not-prepared, issue-unreadable, or issue-not-open and leaves launch.json as it was", () => {
  const unprepared = fixture();
  assertStopped(run(unprepared, ["agree", "--worktree", unprepared.repo]), "not-prepared");

  const cases: [string, Record<string, unknown> | null][] = [
    ["issue-unreadable", null],
    ["issue-unreadable", { number: ISSUE, title: FEATURE_TITLE, state: "OPEN" }],
    ["issue-not-open", { ...CHANGED_BODY, state: "CLOSED" }],
  ];
  for (const [reason, reply] of cases) {
    const f = implemented();
    const before = launchFile(f);
    fakeGh(f, reply);
    const out = assertStopped(agree(f), reason);
    assert.equal(out.action, "agree", reason);
    assert.equal(launchFile(f), before, reason);
    if (reason === "issue-not-open") assert.match(String(out.detail), /CLOSED/);
  }
});

test("reread after agree resumes the implement session without a fork in the worktree and passes the full prompt on stdin", () => {
  const f = agreedAfterChange();
  fakeRereader(f, PASS_CHECK + REREAD_REPLY);
  const result = reread(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(f.logs, "reread-cwd"), "utf8").trim(), realpathSync(worktreeOf(f)));
  const args = readFileSync(join(f.logs, "reread-args"), "utf8").split("\n");
  assert.equal(flagValue(args, "--resume"), "s-1");
  assert.ok(!args.includes("--fork-session"));
  assert.ok(!args.includes("--json-schema"));
  assert.equal(flagValue(args, "--model"), "opus");
  assert.equal(readFileSync(join(f.logs, "reread-stdin"), "utf8"), rereadPrompt(baseOf(f)));
});

test("reread gives claude the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = agreedAfterChange();
  const base = moveBaseToParent(f);
  fakeRereader(f, PASS_CHECK + REREAD_REPLY);
  assert.equal(reread(f).status, 0);
  assert.equal(readFileSync(join(f.logs, "reread-stdin"), "utf8"), rereadPrompt(base));
});

test("reread passes --model to claude", () => {
  const f = agreedAfterChange();
  fakeRereader(f, REREAD_REPLY);
  assert.equal(reread(f, "--model", "sonnet").status, 0);
  assert.equal(flagValue(readFileSync(join(f.logs, "reread-args"), "utf8").split("\n"), "--model"), "sonnet");
});

test("reread appends round 1 to rereads and reports it, with changed true when the child edits and false when it does not", () => {
  const cases: [string, string, boolean][] = [
    ["edits", EDIT_FILE + PASS_CHECK + REREAD_REPLY, true],
    ["no edit", REREAD_REPLY, false],
  ];
  for (const [label, body, changed] of cases) {
    const f = agreedAfterChange();
    const before = launchRecord(worktreeOf(f)) as Record<string, unknown> & { implement: Record<string, unknown> };
    fakeRereader(f, body);
    const result = reread(f);
    assert.equal(result.status, 0, result.stderr);
    const out = outputOf(result);
    assert.deepEqual(
      out,
      {
        action: "reread",
        ok: true,
        round: 1,
        session_id: "s-1",
        tree: out.tree,
        changed,
        issue_digest: AGREED_DIGEST,
        result: "reread",
        cost_usd: 0.3,
        duration_ms: 700,
      },
      label,
    );
    assert.equal(out.tree === before.implement.tree, !changed, label);
    const { rereads, ...rest } = launchRecord(worktreeOf(f)) as Record<string, unknown> & { rereads: Record<string, unknown>[] };
    assert.deepEqual(rest, before, label);
    assert.ok(!Number.isNaN(Date.parse(String(rereads[0]?.at))), label);
    assert.deepEqual(
      rereads,
      [{ round: 1, session_id: "s-1", tree: out.tree, changed, issue_digest: AGREED_DIGEST, reply: "reread", at: rereads[0].at }],
      label,
    );
  }
});

test("reread stops with nothing-to-reread and starts no claude when the session read the agreed version, also right after a reread", () => {
  const f = implemented();
  fakeRereader(f, REREAD_REPLY);
  assertStopped(reread(f), "nothing-to-reread");
  assert.equal(rereadCalls(f), 0);

  const g = agreedAfterChange();
  fakeRereader(g, REREAD_REPLY);
  assert.equal(reread(g).status, 0);
  const before = launchFile(g);
  const out = assertStopped(reread(g), "nothing-to-reread");
  assert.equal(out.action, "reread");
  assert.equal(rereadCalls(g), 1);
  assert.equal(launchFile(g), before);
});

test("reread stops with requirements-changed and starts no claude when the Issue changed again after agree", () => {
  const f = agreedAfterChange();
  const before = launchFile(f);
  fakeGh(f, { ...CHANGED_BODY, body: "changed once more" });
  fakeRereader(f, REREAD_REPLY);
  const out = assertStopped(reread(f), "requirements-changed");
  assert.equal(out.detail, "The title, body, or state of Issue #42 of owner/repo changed after the agreed version was recorded.");
  assert.equal(rereadCalls(f), 0);
  assert.equal(launchFile(f), before);
});

test("reread stops with not-prepared, not-implemented, issue-unreadable, child-failed, or not-done and leaves launch.json as it was", () => {
  const unprepared = fixture();
  fakeRereader(unprepared, REREAD_REPLY);
  assertStopped(run(unprepared, ["reread", "--worktree", unprepared.repo]), "not-prepared");
  assert.equal(rereadCalls(unprepared), 0);

  const cases: [string, () => Fixture, string][] = [
    ["not-implemented", () => agreedAfterChange(prepared), REREAD_REPLY],
    [
      "issue-unreadable",
      () => {
        const f = agreedAfterChange();
        fakeGh(f, null);
        return f;
      },
      REREAD_REPLY,
    ],
    ["child-failed", agreedAfterChange, `${REREAD_REPLY}exit 3\n`],
    ["child-failed", agreedAfterChange, "echo 'not json'\n"],
    ["child-failed", agreedAfterChange, `echo '{"type":"result","result":"reread"}'\n`],
    ["not-done", agreedAfterChange, EDIT_FILE + REREAD_REPLY],
  ];
  for (const [reason, arrange, body] of cases) {
    const f = arrange();
    const before = launchFile(f);
    fakeRereader(f, body);
    const out = assertStopped(reread(f), reason);
    assert.equal(out.action, "reread", reason);
    assert.equal(launchFile(f), before, reason);
    if (reason === "not-done") {
      assert.deepEqual(Object.keys(out).sort(), [
        "action",
        "changed",
        "cost_usd",
        "detail",
        "duration_ms",
        "issue_digest",
        "ok",
        "reason",
        "result",
        "round",
        "session_id",
        "tree",
      ]);
      assert.equal(out.changed, true);
      assert.equal(out.round, 1);
      assert.equal(out.issue_digest, AGREED_DIGEST);
    }
  }
});

test("run on a worktree whose reread stopped with not-done starts with reread", () => {
  const f = agreedAfterChange();
  fakeRereader(f, EDIT_FILE + REREAD_REPLY);
  assertStopped(reread(f), "not-done");
  fakeRounds(f, { reread: [REREAD_EDITED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["reread", "review"]);
});

test("run starts with reread when implement wrote no issue_digest, and with review when only the current review lacks it", () => {
  const f = implemented();
  rewriteLaunch(f, (stored) => {
    const { issue_digest: _digest, ...implement } = stored.implement as Record<string, unknown>;
    return { ...stored, implement };
  });
  fakeRounds(f, { reread: [REREAD_UNCHANGED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const fromImplement = runLaunch(f);
  assert.equal(fromImplement.status, 0, fromImplement.stderr);
  assert.equal(runOut(fromImplement).steps[0].action, "reread");

  const g = accepted();
  rewriteLaunch(g, (stored) => {
    const reviews = stored.reviews as Record<string, unknown>[];
    const { issue_digest: _digest, ...last } = reviews[reviews.length - 1];
    return { ...stored, reviews: [...reviews.slice(0, -1), last] };
  });
  fakeRounds(g, { self: [{ reply: shaped("self-2") }], independent: [{ reply: shaped("ind-2") }] });
  const fromReview = runLaunch(g);
  assert.equal(fromReview.status, 0, fromReview.stderr);
  assert.deepEqual(actionsOf(runOut(fromReview)), ["review"]);
});

test("repair names the working tree in review-stale when both the tree and issue_digest differ from the last review", () => {
  const f = agreedAfterChange(rejected);
  writeFileSync(join(worktreeOf(f), "README.md"), "edited after the review\n");
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  const out = assertStopped(repair(f), "review-stale");
  assert.match(String(out.detail), /^The last review saw the working tree /);
  assert.equal(repairCalls(f), 0);
});

test("repair stops with review-stale and starts no claude when the last review judged another version of the Issue than the agreed one", () => {
  const f = agreedAfterChange(rejected);
  const before = launchFile(f);
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  const out = assertStopped(repair(f), "review-stale");
  assert.match(String(out.detail), /Issue #42/);
  assert.doesNotMatch(String(out.detail), /working tree/);
  assert.equal(repairCalls(f), 0);
  assert.equal(launchFile(f), before);
});

test("the usage printed for a call with no arguments has the agree and reread lines", () => {
  const result = run(fixture(), []);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes("launch.ts agree --worktree <abs path>\n"), result.stderr);
  assert.ok(result.stderr.includes("launch.ts reread --worktree <abs path> [--model <name>]\n"), result.stderr);
});

test("an agree or reread call without --worktree, with a relative path, or agree with --model prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  const calls = [
    ["agree"],
    ["agree", "--worktree", "relative/worktree"],
    ["agree", "--worktree", worktreeOf(f), "--model", "opus"],
    ["reread"],
    ["reread", "--model", "opus"],
    ["reread", "--worktree", "relative/worktree"],
  ];
  for (const args of calls) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
});

test("reread ends claude and its child, exits 143, and keeps launch.json on SIGTERM", async () => {
  const f = agreedAfterChange();
  const before = launchFile(f);
  const result = await signalWhileClaudeWaits(f, ["reread", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  assert.equal(launchFile(f), before);
});

test("run after agree on an accepted worktree rereads, reviews again, and completes, whether or not the reread edits", () => {
  for (const turn of [REREAD_EDITED, REREAD_UNCHANGED]) {
    const label = turn.edit ? "edited" : "unchanged";
    const f = agreedAfterChange(accepted);
    fakeRounds(f, { reread: [turn], self: [{ reply: shaped("self-2") }], independent: [{ reply: shaped("ind-2") }] });
    const result = runLaunch(f);
    assert.equal(result.status, 0, `${label}: ${result.stderr}`);
    const out = runOut(result);
    assert.equal(out.verdict, "accepted", label);
    assert.equal(out.rounds, 2, label);
    assert.deepEqual(actionsOf(out), ["reread", "review"], label);
    assert.deepEqual(out.steps[0], { action: "reread", ok: true, round: 1, changed: turn.edit === true, cost_usd: 0.3, duration_ms: 700 }, label);
    const first = JSON.parse(result.stderr.split("\n")[0]);
    assert.deepEqual(Object.keys(first).sort(), ["action", "changed", "cost_usd", "duration_ms", "ok", "round", "total_cost_usd"], label);
  }
});

test("run after agree on a rejected worktree rereads first and then reviews the earlier findings with the judging schema", () => {
  const f = agreedAfterChange(rejected);
  fakeRounds(f, {
    reread: [REREAD_EDITED],
    self: [judged("self-2", allStates("fixed"))],
    independent: [judged("ind-2", allStates("fixed"))],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["reread", "review"]);
  const self = roundCalls(f).find((call) => call.role === "self");
  assert.ok(self);
  assert.deepEqual(JSON.parse(flagValue(self.args, "--json-schema")), JUDGING_SCHEMA);
});

test("run after agree before implement starts with implement and does not reread", () => {
  const f = agreedAfterChange(prepared);
  fakeRounds(f, { implement: [IMPLEMENTED], reread: [REREAD_UNCHANGED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["implement", "review"]);
  assert.ok(!roundCalls(f).some((call) => call.role === "reread"));
});

test("run without agree after the body changed stops with requirements-changed and starts no claude on an accepted or a rejected worktree", () => {
  for (const [label, arrange] of [
    ["accepted", accepted],
    ["rejected", rejected],
  ] as const) {
    const f = arrange();
    fakeGh(f, CHANGED_BODY);
    fakeRounds(f, { reread: [REREAD_UNCHANGED], repair: [REPAIRED] });
    assertStopped(runLaunch(f), "requirements-changed");
    assert.deepEqual(roundCalls(f), [], label);
  }
});

test("run stops with the reason and detail of a reread that fails, and reread is the last step", () => {
  const f = agreedAfterChange();
  fakeRounds(f, { reread: [{ exit: 3 }, { exit: 3 }] });
  const out = assertStopped(runLaunch(f), "child-failed") as unknown as RunOut;
  assert.equal(out.steps[out.steps.length - 1].action, "reread");
  assert.equal(out.detail, outputOf(reread(f)).detail);
});

const continueWork = (f: Fixture, ...extra: string[]) => run(f, ["continue", "--worktree", worktreeOf(f), ...extra]);

const continuePrompt = (base: string): string => `Your work on GitHub Issue #42 of owner/repo in this worktree is not finished. \`${DONE_GATE} status\` does not print \`done\`. Your last turn may have been interrupted, or the check may have failed or gone stale after an edit.

1. Find where the work stopped. Read \`git status --short\` and \`git diff ${base}\`, and recall what you were doing: implementing the Issue, settling review findings, or bringing the change in line with a changed Issue. Keep the changes that are in the worktree, and finish that work.
2. Run \`${DONE_GATE} check\`. Fix what fails and run it again.
3. You are done when \`${DONE_GATE} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: what was unfinished; what you changed; the files you changed; what \`${DONE_GATE} status\` printed; each decision you made for this Issue that the Issue does not state, including the ones from your earlier turns and leaving out the ones you later undid; and each step the Issue hands over to a named person.
`;

const CONTINUE_REPLY = `echo '{"type":"result","session_id":"s-1","result":"continued","total_cost_usd":0.4,"duration_ms":800}'\n`;

function fakeContinuer(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh\necho call >> "$LOGS/continue-calls"\npwd -P > "$LOGS/continue-cwd"\nprintf '%s\\n' "$@" > "$LOGS/continue-args"\ncat > "$LOGS/continue-stdin"\n${body}`,
    { mode: 0o755 },
  );
}

const continueCalls = (f: Fixture): number =>
  existsSync(join(f.logs, "continue-calls")) ? readFileSync(join(f.logs, "continue-calls"), "utf8").split("\n").filter(Boolean).length : 0;

function unfinished(): Fixture {
  const f = prepared();
  fakeClaude(f, SESSION_REPLY);
  assertStopped(run(f, ["implement", "--worktree", worktreeOf(f)]), "not-done");
  return f;
}

function gateDisabled(f: Fixture): void {
  rmSync(join(git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "config.json"));
  const status = gateStatus(worktreeOf(f));
  assert.equal(status.status, 2, status.stderr);
}

type Continued = Record<string, unknown> & { continues: Record<string, unknown>[] };

const CONTINUED: Turn = { check: true, reply: { session_id: "s-1", result: "continued", total_cost_usd: 0.4, duration_ms: 800 } };
const CONTINUED_UNCHECKED: Turn = { reply: { session_id: "s-1", result: "continued", total_cost_usd: 0.4, duration_ms: 800 } };

test("continue on a worktree whose implement stopped with not-done resumes the implement session without a fork and passes the full prompt on stdin", () => {
  const f = unfinished();
  const implementArgs = readFileSync(join(f.logs, "args"), "utf8").split("\n");
  fakeContinuer(f, PASS_CHECK + CONTINUE_REPLY);
  const result = continueWork(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(f.logs, "continue-cwd"), "utf8").trim(), realpathSync(worktreeOf(f)));
  const args = readFileSync(join(f.logs, "continue-args"), "utf8").split("\n");
  assert.equal(flagValue(args, "--resume"), "s-1");
  assert.ok(!args.includes("--fork-session"));
  assert.ok(!args.includes("--json-schema"));
  assert.equal(flagValue(args, "--allowedTools"), flagValue(implementArgs, "--allowedTools"));
  assert.equal(flagValue(args, "--model"), "opus");
  assert.equal(readFileSync(join(f.logs, "continue-stdin"), "utf8"), continuePrompt(baseOf(f)));
});

test("continue gives claude the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = unfinished();
  const base = moveBaseToParent(f);
  fakeContinuer(f, PASS_CHECK + CONTINUE_REPLY);
  assert.equal(continueWork(f).status, 0);
  assert.equal(readFileSync(join(f.logs, "continue-stdin"), "utf8"), continuePrompt(base));
});

test("continue reports ok, appends round 1 to continues with done true, and passes --model when the child passes the check", () => {
  const f = unfinished();
  const before = launchRecord(worktreeOf(f)) as Record<string, unknown> & { implement: Record<string, unknown> };
  fakeContinuer(f, EDIT_FILE + PASS_CHECK + CONTINUE_REPLY);
  const result = continueWork(f, "--model", "sonnet");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(flagValue(readFileSync(join(f.logs, "continue-args"), "utf8").split("\n"), "--model"), "sonnet");
  const out = outputOf(result);
  assert.equal(typeof out.tree, "string");
  assert.notEqual(out.tree, before.implement.tree);
  assert.deepEqual(out, {
    action: "continue",
    ok: true,
    round: 1,
    session_id: "s-1",
    tree: out.tree,
    changed: true,
    result: "continued",
    cost_usd: 0.4,
    duration_ms: 800,
  });
  const { continues, ...rest } = launchRecord(worktreeOf(f)) as Continued;
  assert.deepEqual(rest, before);
  assert.ok(!Number.isNaN(Date.parse(String(continues[0]?.at))));
  assert.deepEqual(continues, [
    { round: 1, session_id: "s-1", tree: out.tree, changed: true, done: true, reply: "continued", at: continues[0].at },
  ]);
});

test("continue stops with not-done and appends a record with done false, with changed true when the child edits and false when it does not", () => {
  for (const [label, body, changed] of [
    ["edits", EDIT_FILE + CONTINUE_REPLY, true],
    ["no edit", CONTINUE_REPLY, false],
  ] as const) {
    const f = unfinished();
    fakeContinuer(f, body);
    const out = assertStopped(continueWork(f), "not-done");
    assert.match(String(out.detail), /^done_gate\.ts status is not done: /, label);
    assert.deepEqual(
      Object.keys(out).sort(),
      ["action", "changed", "cost_usd", "detail", "duration_ms", "ok", "reason", "result", "round", "session_id", "tree"],
      label,
    );
    assert.equal(out.action, "continue", label);
    assert.equal(out.changed, changed, label);
    const { continues } = launchRecord(worktreeOf(f)) as Continued;
    assert.equal(continues.length, 1, label);
    assert.equal(continues[0].done, false, label);
    assert.equal(continues[0].changed, changed, label);
    assert.equal(continues[0].tree, out.tree, label);
  }
});

test("continue records round 1 when continues is not an array, and an empty reply when the child's result is not a string", () => {
  const f = unfinished();
  rewriteLaunch(f, (stored) => ({ ...stored, continues: { round: 5 } }));
  fakeContinuer(f, `${PASS_CHECK}echo '{"type":"result","session_id":"s-1","result":7,"total_cost_usd":0.4,"duration_ms":800}'\n`);
  const result = continueWork(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).round, 1);
  const { continues } = launchRecord(worktreeOf(f)) as Continued;
  assert.equal(continues.length, 1);
  assert.equal(continues[0].round, 1);
  assert.equal(continues[0].reply, "");
});

test("continue on a worktree whose status is done stops with nothing-to-continue and starts no claude, also when the Issue changed", () => {
  for (const issue of [ISSUE_REPLY, CHANGED_BODY]) {
    const f = implemented();
    const before = launchFile(f);
    fakeGh(f, issue);
    fakeContinuer(f, PASS_CHECK + CONTINUE_REPLY);
    assertStopped(continueWork(f), "nothing-to-continue");
    assert.equal(continueCalls(f), 0);
    assert.equal(launchFile(f), before);
  }
});

test("continue stops with not-prepared, not-implemented, gate-unreadable, requirements-changed, issue-unreadable, or child-failed and leaves launch.json as it was", () => {
  const unprepared = fixture();
  fakeContinuer(unprepared, CONTINUE_REPLY);
  assertStopped(run(unprepared, ["continue", "--worktree", unprepared.repo]), "not-prepared");
  assert.equal(continueCalls(unprepared), 0);

  const withGh = (reply: Record<string, unknown> | null) => () => {
    const f = unfinished();
    fakeGh(f, reply);
    return f;
  };
  const withGateOff = () => {
    const f = unfinished();
    gateDisabled(f);
    return f;
  };
  const cases: [string, () => Fixture, string, number][] = [
    ["not-implemented", prepared, CONTINUE_REPLY, 0],
    ["gate-unreadable", withGateOff, CONTINUE_REPLY, 0],
    ["requirements-changed", withGh(CHANGED_BODY), CONTINUE_REPLY, 0],
    ["issue-unreadable", withGh(null), CONTINUE_REPLY, 0],
    ["child-failed", unfinished, `${CONTINUE_REPLY}exit 3\n`, 1],
    ["child-failed", unfinished, "echo 'not json'\n", 1],
    ["child-failed", unfinished, `echo '{"type":"result","result":"continued"}'\n`, 1],
  ];
  for (const [reason, arrange, body, calls] of cases) {
    const f = arrange();
    const before = launchFile(f);
    fakeContinuer(f, body);
    const out = assertStopped(continueWork(f), reason);
    assert.equal(out.action, "continue", reason);
    assert.equal(continueCalls(f), calls, reason);
    assert.equal(launchFile(f), before, reason);
    if (reason === "gate-unreadable") assert.match(String(out.detail), /not on in this worktree/);
  }
});

test("continue starts claude when called directly after a continue that ended with done false and left the tree unchanged", () => {
  const f = unfinished();
  fakeContinuer(f, CONTINUE_REPLY);
  assertStopped(continueWork(f), "not-done");
  const result = continueWork(f);
  assert.equal(continueCalls(f), 2);
  assertStopped(result, "not-done");
  const { continues } = launchRecord(worktreeOf(f)) as Continued;
  assert.deepEqual(continues.map((entry) => entry.round), [1, 2]);
});

test("run on a worktree whose implement stopped with not-done continues, reviews, and completes", () => {
  const f = unfinished();
  fakeRounds(f, { continue: [CONTINUED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.verdict, "accepted");
  assert.deepEqual(actionsOf(out), ["continue", "review"]);
  assert.deepEqual(out.steps[0], { action: "continue", ok: true, round: 1, changed: false, cost_usd: 0.4, duration_ms: 800 });
  const first = JSON.parse(result.stderr.split("\n")[0]);
  assert.deepEqual(Object.keys(first).sort(), ["action", "changed", "cost_usd", "duration_ms", "ok", "round", "total_cost_usd"]);
  assert.equal(first.total_cost_usd, 0.4);
});

test("run on a worktree whose repair stopped with not-done continues and then reviews the earlier findings with the judging schema", () => {
  const f = rejected();
  fakeRepairer(f, EDIT_FILE + REPAIR_REPLY);
  assertStopped(repair(f), "not-done");
  fakeRounds(f, {
    continue: [CONTINUED],
    self: [judged("self-2", allStates("fixed"))],
    independent: [judged("ind-2", allStates("fixed"))],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["continue", "review"]);
  const self = roundCalls(f).find((call) => call.role === "self");
  assert.ok(self);
  assert.deepEqual(JSON.parse(flagValue(self.args, "--json-schema")), JUDGING_SCHEMA);
});

test("run on a worktree whose repair child edited a file and then failed continues and then reviews", () => {
  const f = rejected();
  fakeRepairer(f, `${EDIT_FILE}exit 3\n`);
  assertStopped(repair(f), "child-failed");
  fakeRounds(f, {
    continue: [CONTINUED],
    self: [judged("self-2", allStates("fixed"))],
    independent: [judged("ind-2", allStates("fixed"))],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["continue", "review"]);
});

test("run on an accepted worktree edited outside run without a check starts with continue", () => {
  const f = accepted();
  writeFileSync(join(worktreeOf(f), "README.md"), "edited outside run\n");
  fakeRounds(f, { continue: [CONTINUED], self: [{ reply: shaped("self-2") }], independent: [{ reply: shaped("ind-2") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(runOut(result).steps[0].action, "continue");
});

test("run on an accepted worktree with an unchanged tree completes without starting claude after the gate is disabled", () => {
  const f = accepted();
  gateDisabled(f);
  fakeRounds(f, { continue: [CONTINUED] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.ok, true);
  assert.deepEqual(out.steps, []);
  assert.deepEqual(roundCalls(f), []);
});

test("run after agree on a worktree whose check has not passed starts with reread and does not continue", () => {
  const f = agreedAfterChange(unfinished);
  fakeRounds(f, {
    reread: [REREAD_EDITED],
    continue: [CONTINUED],
    self: [{ reply: shaped("self-1") }],
    independent: [{ reply: shaped("ind-1") }],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["reread", "review"]);
  assert.ok(!roundCalls(f).some((call) => call.role === "continue"));
});

test("run stops with not-done after a continue that edits nothing and passes no check, and a second run stops with not-done and starts no claude", () => {
  const f = unfinished();
  fakeRounds(f, { continue: [CONTINUED_UNCHECKED, CONTINUED_UNCHECKED] });
  const first = assertStopped(runLaunch(f), "not-done") as unknown as RunOut;
  assert.deepEqual(actionsOf(first), ["continue"]);
  assert.equal(roundCalls(f).length, 1);
  const before = launchFile(f);
  const second = assertStopped(runLaunch(f), "not-done") as unknown as RunOut;
  assert.deepEqual(second.steps, []);
  assert.match(String(second.detail), /continue round 1\b/);
  assert.equal(roundCalls(f).length, 1);
  assert.equal(launchFile(f), before);
});

test("run starts with continue when the last continue ended with done false and the tree was edited outside run since", () => {
  const f = unfinished();
  fakeRounds(f, { continue: [CONTINUED_UNCHECKED, CONTINUED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  assertStopped(runLaunch(f), "not-done");
  writeFileSync(join(worktreeOf(f), "README.md"), "edited outside run\n");
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(actionsOf(out), ["continue", "review"]);
  assert.equal(out.steps[0].round, 2);
});

test("continue ends claude and its child, exits 143, and keeps launch.json on SIGTERM", async () => {
  const f = unfinished();
  const before = launchFile(f);
  const result = await signalWhileClaudeWaits(f, ["continue", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  assert.equal(launchFile(f), before);
});

test("the usage has the continue line, and a continue call without --worktree or with a relative path prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  const bare = run(f, []);
  assert.ok(bare.stderr.includes("launch.ts continue --worktree <abs path> [--model <name>]\n"), bare.stderr);
  for (const args of [["continue"], ["continue", "--model", "opus"], ["continue", "--worktree", "relative/worktree"]]) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const IMPLEMENT_PROMPT = `Implement GitHub Issue #42 of owner/repo in this worktree.

1. Read the Issue with \`gh issue view 42 --repo owner/repo --json title,body\`. The Issue is the agreed requirement. Do not change its scope, and do not do what it lists as out of scope.
2. Make the change the Issue asks for, following the repository's rules that apply to the files you touch.
3. Run \`${DONE_GATE} check\`. It runs the repository's full check and records the result for the current working tree. Fix what fails and run it again.
4. You are done when \`${DONE_GATE} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: the files you changed, what \`${DONE_GATE} status\` printed, each decision you made that the Issue does not state, and each step the Issue hands over to a named person.
`;

const resumePrompt = (base: string): string => `Your turn implementing GitHub Issue #42 of owner/repo in this worktree was interrupted before you replied.

1. Find where the work stopped. Read \`git status --short\` and \`git diff ${base}\`, and recall what you had done and what was left. Keep the changes that are in the worktree. If you had not read the Issue yet, read it with \`gh issue view 42 --repo owner/repo --json title,body\`. The Issue is the agreed requirement. Do not change its scope, and do not do what it lists as out of scope.
2. Finish the change the Issue asks for, following the repository's rules that apply to the files you touch.
3. Run \`${DONE_GATE} check\`. It runs the repository's full check and records the result for the current working tree. Fix what fails and run it again.
4. You are done when \`${DONE_GATE} status\` prints \`done\`. Any edit after a passing check makes the record stale, so run the check again after your last edit.

Do not commit, push, or open a pull request. Do not edit files outside this worktree.

When you are done, reply with: the files you changed, what \`${DONE_GATE} status\` printed, each decision you made that the Issue does not state, and each step the Issue hands over to a named person.
`;

interface ImplementTurn {
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

const NO_SESSION = (id: string): string => `No conversation found with session ID: ${id}\n`;
const FINISHED: ImplementTurn = { check: true, reply: { session_id: "s-2", result: "finished", total_cost_usd: 0.5, duration_ms: 1200 } };
const UNCHECKED: ImplementTurn = { reply: { session_id: "s-2", result: "finished", total_cost_usd: 0.5, duration_ms: 1200 } };

function fakeImplementer(f: Fixture, turns: ImplementTurn[]): void {
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

const implementCalls = (f: Fixture): ImplementCall[] =>
  existsSync(join(f.logs, "implement-calls"))
    ? readFileSync(join(f.logs, "implement-calls"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

const implementAt = (f: Fixture, ...extra: string[]) => run(f, ["implement", "--worktree", worktreeOf(f), ...extra]);

const implementRecordOf = (f: Fixture): Record<string, unknown> => (launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement;

function interrupted(): Fixture {
  const f = prepared();
  fakeImplementer(f, [{ exit: 3 }]);
  assertStopped(implementAt(f), "child-failed");
  fakeImplementer(f, []);
  return f;
}

const interruptedId = (f: Fixture): string => String(implementRecordOf(f).session_id);

test("implement on a prepared worktree starts a new session with --session-id set to a UUID and no --resume, and passes the implement prompt", () => {
  const f = prepared();
  fakeImplementer(f, [FINISHED]);
  assert.equal(implementAt(f).status, 0);
  const [call] = implementCalls(f);
  assert.ok(!call.args.includes("--resume"));
  assert.match(flagValue(call.args, "--session-id"), UUID);
  assert.equal(call.stdin, IMPLEMENT_PROMPT);
});

test("while the new session runs, launch.json holds the agreed fields and an implement record of session_id, issue_digest, and started_at only", () => {
  const f = prepared();
  fakeImplementer(f, [FINISHED]);
  assert.equal(implementAt(f).status, 0);
  const [{ args, launch }] = implementCalls(f);
  const record = launch.implement as Record<string, unknown>;
  assert.deepEqual(Object.keys(launch).sort(), ["base", "branch", "implement", "issue", "issue_digest", "repository"]);
  assert.deepEqual(Object.keys(record).sort(), ["issue_digest", "session_id", "started_at"]);
  assert.equal(record.session_id, flagValue(args, "--session-id"));
  assert.equal(record.issue_digest, digestOf(ISSUE_REPLY));
  assert.ok(!Number.isNaN(Date.parse(String(record.started_at))));
});

test("implement on an unfinished worktree resumes the recorded session with --model and the resume prompt, and no --session-id or --fork-session", () => {
  const f = interrupted();
  const id = interruptedId(f);
  fakeImplementer(f, [FINISHED]);
  assert.equal(implementAt(f, "--model", "sonnet").status, 0);
  const calls = implementCalls(f);
  assert.equal(calls.length, 1);
  assert.equal(flagValue(calls[0].args, "--resume"), id);
  assert.ok(!calls[0].args.includes("--session-id"));
  assert.ok(!calls[0].args.includes("--fork-session"));
  assert.equal(flagValue(calls[0].args, "--model"), "sonnet");
  assert.equal(calls[0].stdin, resumePrompt(baseOf(f)));
});

test("a resumed implement gives claude the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = interrupted();
  const base = moveBaseToParent(f);
  fakeImplementer(f, [FINISHED]);
  assert.equal(implementAt(f).status, 0);
  assert.equal(implementCalls(f)[0].stdin, resumePrompt(base));
});

test("a resumed implement that passes the check returns resumed true, keeps launch.json while it runs, and records the digest the session started with", () => {
  const f = interrupted();
  rewriteLaunch(f, (stored) => ({ ...stored, implement: { ...(stored.implement as Record<string, unknown>), issue_digest: "a".repeat(64) } }));
  const started = launchRecord(worktreeOf(f));
  fakeImplementer(f, [{ ...FINISHED, reply: { ...FINISHED.reply, result: "resumed reply" } }]);
  const result = implementAt(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(out.resumed, true);
  assert.equal(out.session_id, "s-2");
  assert.deepEqual(implementCalls(f)[0].launch, started);
  const record = implementRecordOf(f);
  assert.deepEqual(Object.keys(record).sort(), ["at", "issue_digest", "reply", "session_id", "tree"]);
  assert.equal(record.reply, "resumed reply");
  assert.equal(record.issue_digest, "a".repeat(64));
  assert.equal(record.session_id, "s-2");
});

test("a resumed implement that ends without passing the check stops with not-done, resumed true, and writes the finished record", () => {
  const f = interrupted();
  fakeImplementer(f, [UNCHECKED]);
  const out = assertStopped(implementAt(f), "not-done");
  assert.equal(out.resumed, true);
  const record = implementRecordOf(f);
  assert.equal(record.session_id, "s-2");
  assert.equal(typeof record.at, "string");
});

test("run on an unfinished worktree whose Issue changed and was agreed resumes implement and then rereads", () => {
  const f = interrupted();
  fakeGh(f, CHANGED_BODY);
  assert.equal(agree(f).status, 0);
  fakeRounds(f, { implement: [IMPLEMENTED], reread: [REREAD_UNCHANGED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const out = runOut(runLaunch(f));
  assert.deepEqual(actionsOf(out).slice(0, 2), ["implement", "reread"]);
  assert.ok(roundCalls(f)[0].args.includes("--resume"));
});

test("a resumed implement that fails without the no-session message stops with child-failed, keeps launch.json, and the next call resumes the same session", () => {
  const f = interrupted();
  const id = interruptedId(f);
  const text = readFileSync(launchPathOf(f), "utf8");
  fakeImplementer(f, [{ exit: 3, stderr: "boom\n" }, { exit: 3, stderr: "boom\n" }]);
  assertStopped(implementAt(f), "child-failed");
  assert.equal(readFileSync(launchPathOf(f), "utf8"), text);
  assert.equal(implementCalls(f).length, 1);
  assertStopped(implementAt(f), "child-failed");
  assert.equal(flagValue(implementCalls(f)[1].args, "--resume"), id);
});

test("when the recorded session does not exist, implement starts a new session with a new id and the implement prompt in the same call", () => {
  const f = interrupted();
  const id = interruptedId(f);
  fakeImplementer(f, [
    { exit: 1, stderr: NO_SESSION(id), reply: { session_id: "s-old", result: "resumed reply" } },
    { ...FINISHED, reply: { ...FINISHED.reply, result: "new session reply" } },
  ]);
  const result = implementAt(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).resumed, undefined);
  assert.equal(implementRecordOf(f).reply, "new session reply");
  const calls = implementCalls(f);
  assert.equal(calls.length, 2);
  const fresh = flagValue(calls[1].args, "--session-id");
  assert.match(fresh, UUID);
  assert.notEqual(fresh, id);
  assert.ok(!calls[1].args.includes("--resume"));
  assert.equal(calls[1].stdin, IMPLEMENT_PROMPT);
});

test("a new session started for a missing session after an agreed Issue change records the agreed digest, and run then reviews without rereading", () => {
  const f = interrupted();
  fakeGh(f, CHANGED_BODY);
  assert.equal(agree(f).status, 0);
  fakeImplementer(f, [{ exit: 1, stderr: NO_SESSION(interruptedId(f)) }, FINISHED]);
  assert.equal(implementAt(f).status, 0);
  assert.equal(implementRecordOf(f).issue_digest, AGREED_DIGEST);
  fakeRounds(f, { self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["review"]);
});

test("when the new session for a missing session also reports no session, implement stops with child-failed after two claude calls and keeps the new record", () => {
  const f = interrupted();
  const id = interruptedId(f);
  fakeImplementer(f, [
    { exit: 1, stderr: NO_SESSION(id) },
    { exit: 1, stderr: NO_SESSION("other") },
  ]);
  assertStopped(implementAt(f), "child-failed");
  const calls = implementCalls(f);
  assert.equal(calls.length, 2);
  const record = implementRecordOf(f);
  assert.deepEqual(Object.keys(record).sort(), ["issue_digest", "session_id", "started_at"]);
  assert.equal(record.session_id, flagValue(calls[1].args, "--session-id"));
  assert.notEqual(record.session_id, id);
});

test("a resumed implement that exits 0 with the no-session message and a JSON session_id is taken as resumed", () => {
  const f = interrupted();
  fakeImplementer(f, [{ ...FINISHED, stderr: NO_SESSION(interruptedId(f)) }]);
  const result = implementAt(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).resumed, true);
  assert.equal(implementCalls(f).length, 1);
});

test("implement on an unfinished worktree stops with requirements-changed and starts no claude when the Issue changed", () => {
  const f = interrupted();
  fakeGh(f, CHANGED_BODY);
  assertStopped(implementAt(f), "requirements-changed");
  assert.deepEqual(implementCalls(f), []);
});

test("implement --fresh on an unfinished worktree starts a new session with a new id and the implement prompt", () => {
  const f = interrupted();
  const id = interruptedId(f);
  fakeImplementer(f, [FINISHED]);
  assert.equal(implementAt(f, "--fresh").status, 0);
  const [call] = implementCalls(f);
  assert.ok(!call.args.includes("--resume"));
  assert.match(flagValue(call.args, "--session-id"), UUID);
  assert.notEqual(flagValue(call.args, "--session-id"), id);
  assert.equal(call.stdin, IMPLEMENT_PROMPT);
});

test("implement on a finished worktree stops with already-implemented, starts no claude, and keeps launch.json, also when the Issue changed", () => {
  for (const changeIssue of [false, true]) {
    const f = implemented();
    if (changeIssue) fakeGh(f, CHANGED_BODY);
    const text = readFileSync(launchPathOf(f), "utf8");
    fakeImplementer(f, [FINISHED]);
    const out = assertStopped(implementAt(f), "already-implemented");
    assert.equal(
      out.detail,
      `The implementing session of ${worktreeOf(f)} has finished. Call implement with --fresh to discard its records and start a new session.`,
    );
    assert.deepEqual(implementCalls(f), [], String(changeIssue));
    assert.equal(readFileSync(launchPathOf(f), "utf8"), text);
  }
});

test("implement --fresh on a reviewed worktree starts a new session and drops reviews, repairs, rereads, and continues while it runs", () => {
  const f = accepted();
  rewriteLaunch(f, (stored) => ({ ...stored, repairs: [], rereads: [], continues: [] }));
  fakeImplementer(f, [FINISHED]);
  const result = implementAt(f, "--fresh");
  assert.equal(result.status, 0, result.stderr);
  const [{ args, launch }] = implementCalls(f);
  assert.match(flagValue(args, "--session-id"), UUID);
  for (const key of ["reviews", "repairs", "rereads", "continues"]) assert.ok(!(key in launch), key);
});

test("--fresh twice, --fresh with a value, or --fresh on another action prints the usage and nothing on stdout, and exits 2", () => {
  const f = prepared();
  const w = worktreeOf(f);
  const calls = [
    ["implement", "--worktree", w, "--fresh", "--fresh"],
    ["implement", "--worktree", w, "--fresh", "yes"],
    ["review", "--worktree", w, "--fresh"],
    ["repair", "--worktree", w, "--fresh"],
    ["agree", "--worktree", w, "--fresh"],
    ["reread", "--worktree", w, "--fresh"],
    ["continue", "--worktree", w, "--fresh"],
    ["run", "--worktree", w, "--fresh"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--fresh"],
  ];
  fakeImplementer(f, []);
  for (const args of calls) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
  assert.deepEqual(implementCalls(f), []);
  assert.ok(run(f, []).stderr.includes("launch.ts implement --worktree <abs path> [--model <name>] [--fresh]\n"));
});

test("review, repair, reread, and continue on an unfinished worktree stop with not-implemented naming the unfinished session, start no claude, and keep launch.json", () => {
  const f = interrupted();
  const text = readFileSync(launchPathOf(f), "utf8");
  for (const action of ["review", "repair", "reread", "continue"]) {
    const out = assertStopped(run(f, [action, "--worktree", worktreeOf(f)]), "not-implemented");
    assert.equal(out.detail, `The implementing session of ${worktreeOf(f)} has not finished. Call implement or run to resume it.`, action);
    assert.deepEqual(implementCalls(f), [], action);
    assert.equal(readFileSync(launchPathOf(f), "utf8"), text, action);
  }
});

test("run on an unfinished worktree resumes implement, reviews, and completes, with resumed true in the implement step and its stderr line", () => {
  const f = interrupted();
  const id = interruptedId(f);
  fakeRounds(f, { implement: [IMPLEMENTED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(actionsOf(out), ["implement", "review"]);
  assert.equal(out.steps[0].resumed, true);
  assert.equal(JSON.parse(result.stderr.split("\n")[0]).resumed, true);
  assert.equal(flagValue(roundCalls(f)[0].args, "--resume"), id);
});

test("run stopped by SIGTERM while implement waits resumes the same session on the next run", async () => {
  const f = prepared();
  const result = await signalWhileClaudeWaits(f, ["run", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  const first = readFileSync(join(f.logs, "hanging-args"), "utf8").split("\n");
  fakeRounds(f, { implement: [IMPLEMENTED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const again = runLaunch(f);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(runOut(again).steps[0].resumed, true);
  assert.equal(flagValue(roundCalls(f)[0].args, "--resume"), flagValue(first, "--session-id"));
});

const holdersOf = (f: Fixture): string =>
  join(git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch-holders");

const recordFilesOf = (f: Fixture): string[] =>
  existsSync(holdersOf(f)) ? readdirSync(holdersOf(f)).filter((name) => /^\d+(\.children)?\.json$/.test(name)).sort() : [];

const holderFile = (f: Fixture, pid: number, kind = ""): string => join(holdersOf(f), `${pid}${kind}.json`);

const readHolder = (f: Fixture, pid: number, kind = ""): unknown => JSON.parse(readFileSync(holderFile(f, pid, kind), "utf8"));

const groupRunning = (pid: number): boolean => isRunning(-pid);

const deadPid = (): number => spawnSync("true").pid as number;

interface Waiting {
  pid: number;
  closed: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  child: ChildProcess;
}

async function startWaiting(f: Fixture, args: string[], claudes = 1): Promise<Waiting> {
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

function endWaiting(f: Fixture, waiting: Waiting): void {
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

async function implementWaiting(f: Fixture): Promise<Waiting> {
  fakeHangingClaude(f);
  return startWaiting(f, ["implement", "--worktree", worktreeOf(f)]);
}

const busyDetail = (pid: number, action: string, at: unknown, worktree: string, file: string): string =>
  `launch.ts ${action} (pid ${pid}, started ${at}) is working on ${worktree}. Wait for it to end, or end it, and call again. Its record is ${file}. Delete the record only when \`ps -p ${pid} -o command=\`, run outside any sandbox, shows a process that is not launch.ts.`;

const leftDetail = (pid: number, action: string, at: unknown, worktree: string, ids: string, file: string): string =>
  `launch.ts ${action} (pid ${pid}, started ${at}) ended and left claude running on ${worktree}. Process group ids still running: ${ids}. A claude that launch.ts ended on a signal is gone within a second, so call again first. If the groups stay, list their processes with \`ps -axo pid,pgid,command\`, run outside any sandbox, end each group that is claude with \`kill -TERM -- -<id>\`, and call again. Its record is ${file}. Delete the record only when ps shows that no process in those groups is claude.`;

const unreadableDetail = (file: string, worktree: string): string =>
  `The record ${file} of a launch.ts working on ${worktree} cannot be read. Confirm with \`ps -axo pid,pgid,command\`, run outside any sandbox, that no launch.ts and no claude it started is running on ${worktree}. Then delete ${file} and call again.`;

const HELD_CALLS = ["implement", "review", "repair", "agree", "reread", "continue", "run", "publishable", "published"];

test("while implement waits for claude, launch-holders holds its pid record of pid, action, and at only, and a children record of that claude's pid only", async () => {
  const f = prepared();
  const waiting = await implementWaiting(f);
  try {
    assert.deepEqual(recordFilesOf(f), [`${waiting.pid}.children.json`, `${waiting.pid}.json`].sort());
    const record = readHolder(f, waiting.pid) as Record<string, unknown>;
    assert.deepEqual(Object.keys(record).sort(), ["action", "at", "pid"]);
    assert.equal(record.pid, waiting.pid);
    assert.equal(record.action, "implement");
    assert.ok(!Number.isNaN(Date.parse(String(record.at))));
    assert.deepEqual(readHolder(f, waiting.pid, ".children"), pidsIn(f, "hanging-claude-pids"));
  } finally {
    endWaiting(f, waiting);
  }
});

test("each of the nine actions called while implement waits stops with busy naming that record, starts no claude, and keeps launch.json and the records", async () => {
  const f = prepared();
  const waiting = await implementWaiting(f);
  try {
    const record = readHolder(f, waiting.pid) as Record<string, unknown>;
    const text = launchFile(f);
    const file = holderFile(f, waiting.pid);
    for (const action of HELD_CALLS) {
      const out = assertStopped(run(f, [action, "--worktree", worktreeOf(f)]), "busy");
      assert.equal(out.action, action);
      assert.equal(out.detail, busyDetail(waiting.pid, "implement", record.at, worktreeOf(f), file), action);
      assert.deepEqual(out.holder, { file, pid: waiting.pid, action: "implement", at: record.at }, action);
      if (action === "run") {
        assert.deepEqual(out.steps, []);
        assert.equal(out.cost_usd, 0);
        for (const key of ["verdict", "required", "rounds"]) assert.ok(key in out, key);
        assert.deepEqual(Object.keys(out).slice(-5), ["cost_usd", "launch_file", "holder", "reason", "detail"]);
        assert.equal(out.launch_file, launchPathOf(f));
      }
      assert.equal(pidsIn(f, "hanging-claude-pids").length, 1, action);
      assert.equal(launchFile(f), text, action);
      assert.deepEqual(readdirSync(holdersOf(f)).sort(), [`${waiting.pid}.children.json`, `${waiting.pid}.json`].sort(), action);
    }
  } finally {
    endWaiting(f, waiting);
  }
});

test("an action called with a usage error while implement waits exits 2 and prints nothing on stdout", async () => {
  const f = prepared();
  const waiting = await implementWaiting(f);
  try {
    for (const action of HELD_CALLS) {
      const result = run(f, [action, "--worktree", worktreeOf(f), "--unknown", "x"]);
      assert.equal(result.status, 2, action);
      assert.equal(result.stdout, "", action);
    }
    assert.deepEqual(recordFilesOf(f), [`${waiting.pid}.children.json`, `${waiting.pid}.json`].sort());
  } finally {
    endWaiting(f, waiting);
  }
});

test("while run waits for the implement claude, its record has action run and holds that claude's pid, and agree stops with busy naming run", async () => {
  const f = prepared();
  fakeHangingClaude(f);
  const waiting = await startWaiting(f, ["run", "--worktree", worktreeOf(f)]);
  try {
    assert.equal((readHolder(f, waiting.pid) as Record<string, unknown>).action, "run");
    assert.deepEqual(readHolder(f, waiting.pid, ".children"), pidsIn(f, "hanging-claude-pids"));
    assert.deepEqual(recordFilesOf(f), [`${waiting.pid}.children.json`, `${waiting.pid}.json`].sort());
    const out = assertStopped(agree(f), "busy");
    assert.equal((out.holder as Record<string, unknown>).action, "run");
  } finally {
    endWaiting(f, waiting);
  }
});

test("while run waits for the two review claudes after implement, its children record holds those two pids and not the implement claude's", async () => {
  const f = prepared();
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh
prompt=$(cat)
case "$prompt" in
  "Implement GitHub Issue"*)
    echo $$ > "$LOGS/implement-pid"
    "$NODE" "$DONE_GATE" check >&2
    echo '{"type":"result","session_id":"s-1","result":"finished","total_cost_usd":0.5,"duration_ms":1200}'
    exit 0;;
esac
echo $$ >> "$LOGS/hanging-claude-pids"
sleep 60 &
echo $! >> "$LOGS/hanging-sleep-pids"
wait
`,
    { mode: 0o755 },
  );
  const waiting = await startWaiting(f, ["run", "--worktree", worktreeOf(f)], 2);
  try {
    const children = readHolder(f, waiting.pid, ".children") as number[];
    assert.deepEqual([...children].sort(), [...pidsIn(f, "hanging-claude-pids")].sort());
    assert.equal(children.length, 2);
    assert.ok(!children.includes(pidsIn(f, "implement-pid")[0]));
  } finally {
    endWaiting(f, waiting);
  }
});

test("no record is left after an action succeeds, an action stops, run completes, or agree ends", () => {
  const succeeded = prepared();
  fakeClaude(succeeded, PASS_CHECK + SESSION_REPLY);
  assert.equal(run(succeeded, ["implement", "--worktree", worktreeOf(succeeded)]).status, 0);
  assert.deepEqual(recordFilesOf(succeeded), []);

  const stoppedOne = prepared();
  assertStopped(review(stoppedOne), "not-implemented");
  assert.deepEqual(recordFilesOf(stoppedOne), []);

  const completed = prepared();
  fakeRounds(completed, { implement: [IMPLEMENTED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  assert.equal(runLaunch(completed).status, 0);
  assert.deepEqual(recordFilesOf(completed), []);

  const agreed = prepared();
  assert.equal(agree(agreed).status, 0);
  assert.deepEqual(recordFilesOf(agreed), []);
  assert.ok(existsSync(holdersOf(agreed)));
});

test("implement ended by SIGTERM leaves its two records, and agree after claude and its child end succeeds and leaves no record", async () => {
  const f = prepared();
  const result = await signalWhileClaudeWaits(f, ["implement", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  assert.equal(recordFilesOf(f).length, 2);
  assert.equal(agree(f).status, 0);
  assert.deepEqual(recordFilesOf(f), []);
});

async function killedLaunch(f: Fixture): Promise<Waiting> {
  const waiting = await implementWaiting(f);
  waiting.child.kill("SIGKILL");
  await waiting.closed;
  return waiting;
}

test("after launch.ts alone is killed by SIGKILL, implement stops with claude-left-running naming the claude still running, starts no claude, and keeps launch.json and both records", async () => {
  const f = prepared();
  const waiting = await killedLaunch(f);
  try {
    const record = readHolder(f, waiting.pid) as Record<string, unknown>;
    const claude = pidsIn(f, "hanging-claude-pids");
    const text = launchFile(f);
    const file = holderFile(f, waiting.pid);
    const out = assertStopped(run(f, ["implement", "--worktree", worktreeOf(f)]), "claude-left-running");
    assert.equal(out.detail, leftDetail(waiting.pid, "implement", record.at, worktreeOf(f), claude.join(", "), file));
    assert.deepEqual(out.holder, { file, pid: waiting.pid, action: "implement", at: record.at, claude });
    assert.equal(pidsIn(f, "hanging-claude-pids").length, 1);
    assert.equal(launchFile(f), text);
    assert.deepEqual(recordFilesOf(f), [`${waiting.pid}.children.json`, `${waiting.pid}.json`].sort());
  } finally {
    endWaiting(f, waiting);
  }
});

test("after launch.ts is killed and then its claude process alone ends while the child in its group runs, an action stops with claude-left-running", async () => {
  const f = prepared();
  const waiting = await killedLaunch(f);
  try {
    const [claude] = pidsIn(f, "hanging-claude-pids");
    process.kill(claude, "SIGKILL");
    assert.ok(await waitFor(() => !isRunning(claude), 5_000));
    assert.ok(groupRunning(claude));
    assertStopped(agree(f), "claude-left-running");
  } finally {
    endWaiting(f, waiting);
  }
});

test("after launch.ts is killed and its claude's process group is ended, agree succeeds and leaves no record", async () => {
  const f = prepared();
  const waiting = await killedLaunch(f);
  try {
    const [claude] = pidsIn(f, "hanging-claude-pids");
    process.kill(-claude, "SIGKILL");
    assert.ok(await waitFor(() => !groupRunning(claude), 5_000));
    assert.equal(agree(f).status, 0);
    assert.deepEqual(recordFilesOf(f), []);
  } finally {
    endWaiting(f, waiting);
  }
});

test("a record of an ended process, with no children record or an empty one, lets the action return its result and is removed", () => {
  for (const children of [null, []]) {
    const f = prepared();
    const pid = deadPid();
    mkdirSync(holdersOf(f), { recursive: true });
    writeFileSync(holderFile(f, pid), JSON.stringify({ pid, action: "implement", at: "2026-11-21T00:00:00.000Z" }));
    if (children !== null) writeFileSync(holderFile(f, pid, ".children"), JSON.stringify(children));
    const result = agree(f);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(outputOf(result).action, "agree");
    assert.deepEqual(recordFilesOf(f), [], String(children));
  }
});

test("with a killed launch.ts's record and a record of a running process, the action stops with busy naming the running one", async () => {
  const f = prepared();
  const waiting = await killedLaunch(f);
  try {
    writeFileSync(holderFile(f, process.pid), JSON.stringify({ pid: process.pid, action: "review", at: "2026-11-21T00:00:00.000Z" }));
    const out = assertStopped(agree(f), "busy");
    assert.equal((out.holder as Record<string, unknown>).pid, process.pid);
  } finally {
    rmSync(holderFile(f, process.pid), { force: true });
    endWaiting(f, waiting);
  }
});

test("a record of an ended process that is not JSON, names another pid, or lacks action stops the action with holder-unreadable naming that file, which is kept", () => {
  const contents = (pid: number): string[] => [
    "not json",
    JSON.stringify({ pid: pid + 1, action: "implement", at: "2026-11-21T00:00:00.000Z" }),
    JSON.stringify({ pid, at: "2026-11-21T00:00:00.000Z" }),
  ];
  for (const index of [0, 1, 2]) {
    const f = prepared();
    const pid = deadPid();
    mkdirSync(holdersOf(f), { recursive: true });
    const file = holderFile(f, pid);
    writeFileSync(file, contents(pid)[index]);
    const out = assertStopped(agree(f), "holder-unreadable");
    assert.equal(out.detail, unreadableDetail(file, worktreeOf(f)), String(index));
    assert.deepEqual(out.holder, { file }, String(index));
    assert.ok(existsSync(file), String(index));
  }
});

test("a children record of an ended process that is not an array stops the action with holder-unreadable naming the children file", () => {
  const f = prepared();
  const pid = deadPid();
  mkdirSync(holdersOf(f), { recursive: true });
  writeFileSync(holderFile(f, pid), JSON.stringify({ pid, action: "implement", at: "2026-11-21T00:00:00.000Z" }));
  writeFileSync(holderFile(f, pid, ".children"), JSON.stringify({ pid }));
  const out = assertStopped(agree(f), "holder-unreadable");
  assert.deepEqual(out.holder, { file: holderFile(f, pid, ".children") });
});

test("files in launch-holders whose names are not records are neither read nor removed, and the action returns its result", () => {
  const f = prepared();
  mkdirSync(holdersOf(f), { recursive: true });
  for (const name of ["notes.txt", "1.json.tmp"]) writeFileSync(join(holdersOf(f), name), "not json");
  assert.equal(agree(f).status, 0);
  for (const name of ["notes.txt", "1.json.tmp"]) assert.ok(existsSync(join(holdersOf(f), name)), name);
});

test("a file named launch-holders that is not a directory stops the action with holder-write-failed and no holder, starting no claude and keeping launch.json", () => {
  const f = prepared();
  writeFileSync(holdersOf(f), "not a directory");
  fakeImplementer(f, [FINISHED]);
  const text = launchFile(f);
  const out = assertStopped(implementAt(f), "holder-write-failed");
  assert.ok(String(out.detail).startsWith(`launch.ts could not write its record under ${holdersOf(f)}: `), String(out.detail));
  assert.ok(!("holder" in out));
  assert.deepEqual(implementCalls(f), []);
  assert.equal(launchFile(f), text);
});

test("an action on a repo with no record directory stops with not-prepared and creates no directory", () => {
  const f = fixture();
  const gateDir = git(f.repo, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  for (const action of HELD_CALLS) assertStopped(run(f, [action, "--worktree", f.repo]), "not-prepared");
  assert.ok(!existsSync(gateDir));
});

test("agree on another fixture's worktree succeeds while implement waits on one worktree", async () => {
  const f = prepared();
  const other = prepared();
  const waiting = await implementWaiting(f);
  try {
    assert.equal(agree(other).status, 0);
  } finally {
    endWaiting(f, waiting);
  }
});

const BRANCH = `feat/${ISSUE}-publish-gate-ts`;

const publishable = (f: Fixture, env: Record<string, string> = {}) => run(f, ["publishable", "--worktree", worktreeOf(f)], env);

function acceptedWithChanges(): Fixture {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, `echo changed >> README.md\necho new > NEW.md\n${PASS_CHECK}${SESSION_REPLY}`);
  assert.equal(run(f, ["implement", "--worktree", worktreeOf(f)]).status, 0);
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  assert.equal(lastReview(f).verdict, "accepted");
  return f;
}

function committed(): Fixture {
  const f = acceptedWithChanges();
  git(worktreeOf(f), "add", "-A");
  git(worktreeOf(f), "commit", "-q", "-m", "reviewed change");
  return f;
}

const commitMismatchDetail = (f: Fixture): string =>
  `HEAD of ${worktreeOf(f)} is not one commit on top of ${launchRecord(worktreeOf(f)).base} that holds the reviewed tree ${lastReview(f).tree}. Commit the reviewed working tree as one commit, and nothing else.`;

const notAcceptedDetail = (f: Fixture, action: string): string =>
  `run would call ${action} next for ${worktreeOf(f)}, so the current working tree has no accepted review against the agreed Issue. Call run first.`;

test("publishable on a worktree whose reviewed tree is one commit on the base succeeds with the twelve publish fields in order, starts no claude, and keeps launch.json and HEAD", () => {
  const f = committed();
  const worktree = worktreeOf(f);
  fakeRounds(f, {});
  const before = launchFile(f);
  const head = git(worktree, "rev-parse", "HEAD");
  const result = publishable(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.deepEqual(Object.entries(outputOf(result)), [
    ["action", "publishable"],
    ["ok", true],
    ["issue", ISSUE],
    ["repository", "owner/repo"],
    ["remote", "origin"],
    ["base_branch", "main"],
    ["branch", BRANCH],
    ["base", launchRecord(worktree).base],
    ["commit", head],
    ["tree", lastReview(f).tree],
    ["actor", "launch-test"],
    ["launch_file", launchPathOf(f)],
  ]);
  assert.equal(git(worktree, "rev-parse", "HEAD^{tree}"), lastReview(f).tree);
  assert.deepEqual(roundCalls(f), []);
  assert.equal(launchFile(f), before);
  assert.equal(git(worktree, "rev-parse", "HEAD"), head);
});

test("publishable leaves no file under launch-holders after it succeeds", () => {
  const f = committed();
  assert.equal(publishable(f).status, 0);
  assert.deepEqual(existsSync(holdersOf(f)) ? readdirSync(holdersOf(f)) : [], []);
});

test("publishable on a worktree that only prepare ran stops with not-accepted naming implement", () => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  const out = assertStopped(publishable(f), "not-accepted");
  assert.equal(out.action, "publishable");
  assert.equal(out.detail, notAcceptedDetail(f, "implement"));
});

test("publishable on a worktree whose first review left a required finding stops with not-accepted naming repair", () => {
  const f = rejected();
  const out = assertStopped(publishable(f), "not-accepted");
  assert.equal(out.detail, notAcceptedDetail(f, "repair"));
});

test("publishable on an accepted worktree edited and checked after the review stops with not-accepted naming review", () => {
  const f = acceptedWithChanges();
  writeFileSync(join(worktreeOf(f), "README.md"), "edited after the review\n");
  const check = spawnSync(process.execPath, [DONE_GATE, "check"], { cwd: worktreeOf(f), env: isolatedEnv(), encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  const out = assertStopped(publishable(f), "not-accepted");
  assert.equal(out.detail, notAcceptedDetail(f, "review"));
});

test("publishable on an accepted worktree whose Issue body changed stops with requirements-changed and the detail run gives", () => {
  const f = committed();
  fakeGh(f, CHANGED_BODY);
  const out = assertStopped(publishable(f), "requirements-changed");
  assert.equal(out.detail, assertStopped(runLaunch(f), "requirements-changed").detail);
});

test("publishable on a directory prepare did not set up stops with not-prepared", () => {
  const f = fixture();
  const out = assertStopped(run(f, ["publishable", "--worktree", f.repo]), "not-prepared");
  assert.equal(out.action, "publishable");
});

test("publishable on a committed worktree stops with not-done after the gate is disabled", () => {
  const f = committed();
  gateDisabled(f);
  const out = assertStopped(publishable(f), "not-done");
  assert.ok(String(out.detail).startsWith("done_gate.ts status is not done: "), String(out.detail));
});

test("publishable on an accepted worktree with nothing committed stops with commit-mismatch", () => {
  const f = acceptedWithChanges();
  const out = assertStopped(publishable(f), "commit-mismatch");
  assert.equal(out.detail, commitMismatchDetail(f));
});

test("publishable stops with commit-mismatch when only one changed file is committed", () => {
  const f = acceptedWithChanges();
  git(worktreeOf(f), "add", "NEW.md");
  git(worktreeOf(f), "commit", "-q", "-m", "one file");
  const out = assertStopped(publishable(f), "commit-mismatch");
  assert.equal(out.detail, commitMismatchDetail(f));
});

test("publishable stops with commit-mismatch when the reviewed change is split into two commits", () => {
  const f = acceptedWithChanges();
  git(worktreeOf(f), "add", "NEW.md");
  git(worktreeOf(f), "commit", "-q", "-m", "first");
  git(worktreeOf(f), "add", "-A");
  git(worktreeOf(f), "commit", "-q", "-m", "second");
  assert.equal(git(worktreeOf(f), "rev-parse", "HEAD^{tree}"), lastReview(f).tree);
  assertStopped(publishable(f), "commit-mismatch");
});

test("publishable stops with no-config when the base commit has no .dotagents.json", () => {
  const f = acceptedWithChanges();
  const worktree = worktreeOf(f);
  const bare = git(worktree, "rev-parse", `${launchRecord(worktree).base}^`);
  assert.notEqual(spawnSync("git", ["cat-file", "-e", `${bare}:.dotagents.json`], { cwd: worktree }).status, 0);
  const commit = git(worktree, "commit-tree", String(lastReview(f).tree), "-p", bare, "-m", "reviewed change");
  git(worktree, "reset", "-q", "--soft", commit);
  rewriteLaunch(f, (stored) => ({ ...stored, base: bare }));
  const out = assertStopped(publishable(f), "no-config");
  assert.equal(
    out.detail,
    `The base commit ${bare} of ${worktree} has no .dotagents.json with remote and baseBranch strings and the repository owner/repo.`,
  );
});

test("publishable on a committed worktree stops with the publish target reasons, with action publishable and no issue", () => {
  const cases: [string, (f: Fixture) => Record<string, string>, string | null][] = [
    ["gh-host", () => ({ GH_HOST: "ghe.example.com" }), "GH_HOST points at ghe.example.com. launch.ts handles only github.com."],
    [
      "remote-mismatch",
      (f) => {
        fakeGit(f, remotesOf("origin", "https://github.com/other/repo.git"));
        return {};
      },
      null,
    ],
    [
      "repo-unreadable",
      (f) => {
        fakeGh(f, ISSUE_REPLY, null);
        return {};
      },
      null,
    ],
    [
      "repository-mismatch",
      (f) => {
        fakeGh(f, ISSUE_REPLY, { nameWithOwner: "other/repo", viewerPermission: "WRITE" });
        return {};
      },
      "GitHub names the repository other/repo, which differs from repository owner/repo in .dotagents.json.",
    ],
    [
      "no-permission",
      (f) => {
        fakeGh(f, ISSUE_REPLY, { nameWithOwner: "owner/repo", viewerPermission: "READ" });
        return {};
      },
      "The permission of the gh user on owner/repo is READ, which cannot push.",
    ],
  ];
  for (const [reason, arrange, detail] of cases) {
    const f = committed();
    const out = assertStopped(publishable(f, arrange(f)), reason);
    assert.equal(out.action, "publishable", reason);
    assert.ok(!("issue" in out), reason);
    if (detail !== null) assert.equal(out.detail, detail, reason);
    if (reason === "remote-mismatch") {
      assert.equal(
        out.detail,
        `The fetch and push URLs of remote origin in ${worktreeOf(f)} do not all point at owner/repo on github.com. Fix .dotagents.json or the remote.`,
      );
    }
    if (reason === "repo-unreadable") assert.ok(String(out.detail).startsWith("gh could not read the repository owner/repo: "));
  }
});

test("publishable stops with no-actor when gh api user fails or prints only whitespace", () => {
  for (const user of [null, "  \n"]) {
    const f = committed();
    fakeGh(f, ISSUE_REPLY, REPO_REPLY, { user });
    const out = assertStopped(publishable(f), "no-actor");
    assert.equal(out.detail, "gh api user returned no login. Fix the gh authentication.", String(user));
  }
});

test("publishable trims the whitespace around the login gh api user prints", () => {
  const f = committed();
  fakeGh(f, ISSUE_REPLY, REPO_REPLY, { user: "  launch-test  \n" });
  const result = publishable(f);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(outputOf(result).actor, "launch-test");
});

test("publishable stops with pulls-unreadable when listing the open pull requests fails or returns a JSON object", () => {
  for (const pulls of [null, '{"message":"Not Found"}']) {
    const f = committed();
    fakeGh(f, ISSUE_REPLY, REPO_REPLY, { pulls });
    const out = assertStopped(publishable(f), "pulls-unreadable");
    const head = `gh could not list the open pull requests of owner/repo for the branch ${BRANCH}: `;
    assert.ok(String(out.detail).startsWith(head), String(out.detail));
  }
});

test("publishable stops with branch-pr-exists naming the html_url, or unknown, when an open pull request of the repository uses the branch", () => {
  for (const [url, shown] of [
    ["https://github.com/owner/repo/pull/7", "https://github.com/owner/repo/pull/7"],
    [undefined, "unknown"],
  ] as const) {
    const f = committed();
    const pull = { head: { ref: BRANCH, repo: { full_name: "owner/repo" } }, html_url: url };
    fakeGh(f, ISSUE_REPLY, REPO_REPLY, { pulls: JSON.stringify([pull]) });
    const out = assertStopped(publishable(f), "branch-pr-exists");
    assert.equal(out.detail, `An open pull request already uses the branch ${BRANCH}: ${shown}.`);
  }
});

test("publishable succeeds when the open pull requests use the branch only from a fork, or use only other branches", () => {
  const pullsOf = (ref: string, fullName: string) =>
    JSON.stringify([{ head: { ref, repo: { full_name: fullName } }, html_url: "https://github.com/owner/repo/pull/8" }]);
  for (const pulls of [pullsOf(BRANCH, "fork/repo"), pullsOf("feat/1-other-branch", "owner/repo")]) {
    const f = committed();
    fakeGh(f, ISSUE_REPLY, REPO_REPLY, { pulls });
    const result = publishable(f);
    assert.equal(result.status, 0, `${pulls}: ${result.stdout}`);
  }
});

test("publishable lists the open pull requests of the repository whose head is the branch of the repository owner", () => {
  const f = committed();
  assert.equal(publishable(f).status, 0);
  const args = readFileSync(ghPullsArgsPath(f), "utf8").split("\n");
  for (const arg of ["api", "repos/owner/repo/pulls", "state=open", `head=owner:${BRANCH}`]) assert.ok(args.includes(arg), arg);
});

test("the usage has the publishable line after the run line, and a publishable call without --worktree, with a relative path, or with --model prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  const calls = [
    ["publishable"],
    ["publishable", "--worktree", "relative/worktree"],
    ["publishable", "--worktree", worktreeOf(f), "--model", "opus"],
  ];
  for (const args of calls) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
    assert.ok(
      result.stderr.includes("launch.ts run --worktree <abs path> [--model <name>]\n       launch.ts publishable --worktree <abs path>\n"),
      result.stderr,
    );
  }
});

const PR_URL = "https://github.com/owner/repo/pull/9";

const matchingPull = (f: Fixture, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  number: 9,
  html_url: PR_URL,
  state: "open",
  draft: true,
  user: { login: "launch-test" },
  head: { ref: BRANCH, sha: git(worktreeOf(f), "rev-parse", "HEAD"), repo: { full_name: "owner/repo" } },
  base: { ref: "main", repo: { full_name: "owner/repo" } },
  ...extra,
});

const forkPull = (f: Fixture): Record<string, unknown> =>
  matchingPull(f, {
    number: 10,
    html_url: "https://github.com/owner/repo/pull/10",
    head: { ref: BRANCH, sha: git(worktreeOf(f), "rev-parse", "HEAD"), repo: { full_name: "fork/repo" } },
  });

const withPulls = (f: Fixture, pulls: unknown): void => fakeGh(f, ISSUE_REPLY, REPO_REPLY, { pulls: JSON.stringify(pulls) });

function publishedReady(): Fixture {
  const f = committed();
  withPulls(f, [matchingPull(f)]);
  return f;
}

const published = (f: Fixture, env: Record<string, string> = {}) => run(f, ["published", "--worktree", worktreeOf(f)], env);

const launchTextAt = (worktree: string): string | null => {
  const path = join(git(worktree, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch.json");
  return existsSync(path) ? readFileSync(path, "utf8") : null;
};

const noPrDetail = (f: Fixture): string =>
  `No open pull request of owner/repo uses the branch ${BRANCH}. If the commit ${git(worktreeOf(f), "rev-parse", "HEAD")} is not published yet, push it and open a draft pull request into main, then call again.`;

const PULL_UNREADABLE_DETAIL = `gh listed an open pull request for the branch ${BRANCH} that lacks a positive integer number or a non-empty html_url.`;

const mismatchDetail = (names: string): string =>
  `The pull request ${PR_URL} differs from what launch.ts confirmed before the push: ${names}. Reconcile it on GitHub, then call again.`;

function assertPublishedStops(f: Fixture, reason: string): Record<string, unknown> {
  const before = launchFile(f);
  const out = assertStopped(published(f), reason);
  assert.equal(out.action, "published");
  assert.equal(launchFile(f), before, reason);
  return out;
}

test("published on a committed worktree whose open draft pull request matches succeeds with the fifteen fields in order, appends one publication to launch.json, starts no claude, and keeps HEAD", () => {
  const f = publishedReady();
  const worktree = worktreeOf(f);
  fakeRounds(f, {});
  const before = launchRecord(worktree);
  const head = git(worktree, "rev-parse", "HEAD");
  const result = published(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  const out = outputOf(result);
  const at = String(out.at);
  assert.equal(new Date(at).toISOString(), at);
  assert.deepEqual(Object.entries(out), [
    ["action", "published"],
    ["ok", true],
    ["issue", ISSUE],
    ["repository", "owner/repo"],
    ["remote", "origin"],
    ["base_branch", "main"],
    ["branch", BRANCH],
    ["base", before.base],
    ["commit", head],
    ["tree", lastReview(f).tree],
    ["actor", "launch-test"],
    ["number", 9],
    ["url", PR_URL],
    ["at", at],
    ["launch_file", launchPathOf(f)],
  ]);
  const after = launchRecord(worktree);
  assert.deepEqual(Object.keys(after), [...Object.keys(before), "publications"]);
  const record = { number: 9, url: PR_URL, commit: head, tree: lastReview(f).tree, base_branch: "main", actor: "launch-test", at };
  assert.deepEqual(after, { ...before, publications: [record] });
  const [stored] = after.publications as Record<string, unknown>[];
  assert.deepEqual(Object.keys(stored), ["number", "url", "commit", "tree", "base_branch", "actor", "at"]);
  assert.deepEqual(roundCalls(f), []);
  assert.equal(git(worktree, "rev-parse", "HEAD"), head);
});

test("published leaves no file under launch-holders after it succeeds", () => {
  const f = publishedReady();
  assert.equal(published(f).status, 0);
  assert.deepEqual(existsSync(holdersOf(f)) ? readdirSync(holdersOf(f)) : [], []);
});

test("published succeeding twice keeps two publications and leaves the first one unchanged", () => {
  const f = publishedReady();
  assert.equal(published(f).status, 0);
  const [first] = launchRecord(worktreeOf(f)).publications as unknown[];
  const again = published(f);
  assert.equal(again.status, 0, again.stdout);
  const publications = launchRecord(worktreeOf(f)).publications as Record<string, unknown>[];
  assert.equal(publications.length, 2);
  assert.deepEqual(publications[0], first);
  assert.equal(publications[1].at, outputOf(again).at);
});

test("published replaces a publications value that is not an array with one publication and keeps its key position", () => {
  const f = publishedReady();
  rewriteLaunch(f, ({ implement, ...rest }) => ({ ...rest, publications: "not an array", implement }));
  const keys = Object.keys(launchRecord(worktreeOf(f)));
  const result = published(f);
  assert.equal(result.status, 0, result.stdout);
  const after = launchRecord(worktreeOf(f));
  assert.deepEqual(Object.keys(after), keys);
  const publications = after.publications as Record<string, unknown>[];
  assert.equal(publications.length, 1);
  assert.equal(publications[0].at, outputOf(result).at);
});

test("published stops with the reason and detail publishable gives for each state publishable rejects before reading the actor, and keeps launch.json", () => {
  const withConfigless = (): Fixture => {
    const f = acceptedWithChanges();
    const worktree = worktreeOf(f);
    const bare = git(worktree, "rev-parse", `${launchRecord(worktree).base}^`);
    const commit = git(worktree, "commit-tree", String(lastReview(f).tree), "-p", bare, "-m", "reviewed change");
    git(worktree, "reset", "-q", "--soft", commit);
    rewriteLaunch(f, (stored) => ({ ...stored, base: bare }));
    return f;
  };
  const cases: [string, () => { f: Fixture; worktree: string; env?: Record<string, string> }][] = [
    [
      "not-prepared",
      () => {
        const f = fixture();
        return { f, worktree: f.repo };
      },
    ],
    [
      "not-accepted",
      () => {
        const f = fixture();
        assert.equal(prepare(f).status, 0);
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "requirements-changed",
      () => {
        const f = publishedReady();
        fakeGh(f, CHANGED_BODY);
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "not-done",
      () => {
        const f = publishedReady();
        gateDisabled(f);
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "commit-mismatch",
      () => {
        const f = acceptedWithChanges();
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "no-config",
      () => {
        const f = withConfigless();
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "gh-host",
      () => {
        const f = publishedReady();
        return { f, worktree: worktreeOf(f), env: { GH_HOST: "ghe.example.com" } };
      },
    ],
    [
      "remote-mismatch",
      () => {
        const f = publishedReady();
        fakeGit(f, remotesOf("origin", "https://github.com/other/repo.git"));
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "repo-unreadable",
      () => {
        const f = committed();
        fakeGh(f, ISSUE_REPLY, null, { pulls: JSON.stringify([matchingPull(f)]) });
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "repository-mismatch",
      () => {
        const f = committed();
        fakeGh(f, ISSUE_REPLY, { nameWithOwner: "other/repo", viewerPermission: "WRITE" }, { pulls: JSON.stringify([matchingPull(f)]) });
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "no-permission",
      () => {
        const f = committed();
        fakeGh(f, ISSUE_REPLY, { nameWithOwner: "owner/repo", viewerPermission: "READ" }, { pulls: JSON.stringify([matchingPull(f)]) });
        return { f, worktree: worktreeOf(f) };
      },
    ],
    [
      "no-actor",
      () => {
        const f = committed();
        fakeGh(f, ISSUE_REPLY, REPO_REPLY, { user: null, pulls: JSON.stringify([matchingPull(f)]) });
        return { f, worktree: worktreeOf(f) };
      },
    ],
  ];
  for (const [reason, arrange] of cases) {
    const { f, worktree, env = {} } = arrange();
    const before = launchTextAt(worktree);
    const out = assertStopped(run(f, ["published", "--worktree", worktree], env), reason);
    assert.equal(launchTextAt(worktree), before, reason);
    const expected = outputOf(run(f, ["publishable", "--worktree", worktree], env));
    assert.deepEqual(out, { ...expected, action: "published" }, reason);
  }
});

test("published stops with pulls-unreadable and the detail publishable gives when listing the open pull requests fails or returns a JSON object", () => {
  for (const pulls of [null, '{"message":"Not Found"}']) {
    const f = committed();
    fakeGh(f, ISSUE_REPLY, REPO_REPLY, { pulls });
    const out = assertPublishedStops(f, "pulls-unreadable");
    assert.deepEqual(out, { ...outputOf(publishable(f)), action: "published" }, String(pulls));
  }
});

test("published stops with no-pr when no open pull request of the repository uses the branch", () => {
  const arrangements: ((f: Fixture) => unknown[])[] = [
    () => [],
    (f) => [forkPull(f)],
    (f) => [matchingPull(f, { head: { ref: "feat/1-other-branch", sha: git(worktreeOf(f), "rev-parse", "HEAD"), repo: { full_name: "owner/repo" } } })],
  ];
  for (const pullsOf of arrangements) {
    const f = committed();
    withPulls(f, pullsOf(f));
    const out = assertPublishedStops(f, "no-pr");
    assert.equal(out.detail, noPrDetail(f));
  }
});

test("published stops with several-prs naming the selected html_urls in list order, with unknown for one that is not a string", () => {
  const second = "https://github.com/owner/repo/pull/11";
  const f = committed();
  withPulls(f, [matchingPull(f), forkPull(f), matchingPull(f, { number: 11, html_url: second })]);
  assert.equal(
    assertPublishedStops(f, "several-prs").detail,
    `2 open pull requests of owner/repo use the branch ${BRANCH}: ${PR_URL}, ${second}. Close all but the one this launch opened, then call again.`,
  );
  const missing = committed();
  withPulls(missing, [matchingPull(missing), matchingPull(missing, { number: 11, html_url: undefined })]);
  assert.equal(
    assertPublishedStops(missing, "several-prs").detail,
    `2 open pull requests of owner/repo use the branch ${BRANCH}: ${PR_URL}, unknown. Close all but the one this launch opened, then call again.`,
  );
});

test("published stops with pulls-unreadable when the one selected pull request lacks a positive integer number or a non-empty html_url", () => {
  const changes: Record<string, unknown>[] = [{ number: undefined }, { number: 0 }, { html_url: "" }, { html_url: "  " }];
  for (const change of changes) {
    const f = committed();
    withPulls(f, [matchingPull(f, change)]);
    assert.equal(assertPublishedStops(f, "pulls-unreadable").detail, PULL_UNREADABLE_DETAIL, JSON.stringify(change));
  }
});

test("published stops with pr-mismatch naming only the one field that differs", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["draft", { draft: false }],
    ["draft", { draft: undefined }],
    ["author", { user: { login: "someone-else" } }],
    ["head", { head: { ref: BRANCH, sha: "0".repeat(40), repo: { full_name: "owner/repo" } } }],
    ["base", { base: { ref: "develop", repo: { full_name: "owner/repo" } } }],
    ["base", { base: { ref: "main", repo: { full_name: "other/repo" } } }],
  ];
  for (const [name, change] of cases) {
    const f = committed();
    withPulls(f, [matchingPull(f, change)]);
    assert.equal(assertPublishedStops(f, "pr-mismatch").detail, mismatchDetail(name), JSON.stringify(change));
  }
});

test("published names every differing field as draft, author, head, base in that order", () => {
  const f = committed();
  withPulls(f, [
    matchingPull(f, {
      draft: false,
      user: { login: "someone-else" },
      head: { ref: BRANCH, sha: "0".repeat(40), repo: { full_name: "owner/repo" } },
      base: { ref: "develop", repo: { full_name: "owner/repo" } },
    }),
  ]);
  assert.equal(assertPublishedStops(f, "pr-mismatch").detail, mismatchDetail("draft, author, head, base"));
});

test("the usage has the published line after the publishable line, and a published call without --worktree, with a relative path, or with --model prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  const calls = [
    ["published"],
    ["published", "--worktree", "relative/worktree"],
    ["published", "--worktree", worktreeOf(f), "--model", "opus"],
  ];
  for (const args of calls) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
    assert.ok(
      result.stderr.includes("launch.ts publishable --worktree <abs path>\n       launch.ts published --worktree <abs path>\n"),
      result.stderr,
    );
  }
});

const SESSION_KEYS = ["issue", "repository", "branch", "base", "issue_digest"];

test("implement --fresh after published keeps publications unchanged between the prepare keys and implement, while claude runs and after it ends", () => {
  const f = publishedReady();
  assert.equal(published(f).status, 0);
  const { publications } = launchRecord(worktreeOf(f));
  fakeImplementer(f, [FINISHED]);
  const result = implementAt(f, "--fresh");
  assert.equal(result.status, 0, result.stdout);
  const [{ launch }] = implementCalls(f);
  const after = launchRecord(worktreeOf(f));
  for (const stored of [launch, after]) {
    assert.deepEqual(Object.keys(stored), [...SESSION_KEYS, "publications", "implement"]);
    assert.deepEqual(stored.publications, publications);
  }
});

test("implement --fresh on a launch.json without publications keeps only the prepare keys and implement, while claude runs and after it ends", () => {
  const f = accepted();
  fakeImplementer(f, [FINISHED]);
  const result = implementAt(f, "--fresh");
  assert.equal(result.status, 0, result.stdout);
  const [{ launch }] = implementCalls(f);
  for (const stored of [launch, launchRecord(worktreeOf(f))]) assert.deepEqual(Object.keys(stored), [...SESSION_KEYS, "implement"]);
});

function publishedOnce(): Fixture {
  const f = publishedReady();
  const result = published(f);
  assert.equal(result.status, 0, result.stdout);
  return f;
}

const publicationsOf = (f: Fixture): Record<string, unknown>[] => launchRecord(worktreeOf(f)).publications as Record<string, unknown>[];

function reviewedEdit(f: Fixture, text: string): void {
  writeFileSync(join(worktreeOf(f), "README.md"), text);
  const check = spawnSync(process.execPath, [DONE_GATE, "check"], { cwd: worktreeOf(f), env: isolatedEnv(), encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  fakeReviewer(f, CLEAN);
  const result = review(f);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(lastReview(f).verdict, "accepted");
}

function stackCommit(f: Fixture, text: string): string {
  const published = git(worktreeOf(f), "rev-parse", "HEAD");
  reviewedEdit(f, text);
  git(worktreeOf(f), "add", "-A");
  git(worktreeOf(f), "commit", "-q", "-m", "stacked change");
  return published;
}

function stacked(): { f: Fixture; published: string } {
  const f = publishedOnce();
  const published = stackCommit(f, "stacked change\n");
  return { f, published };
}

const pullWithHead = (f: Fixture, sha: string, extra: Record<string, unknown> = {}): Record<string, unknown> =>
  matchingPull(f, { head: { ref: BRANCH, sha, repo: { full_name: "owner/repo" } }, ...extra });

const unreadablePublicationsDetail = (f: Fixture): string =>
  `The last entry of publications in ${launchPathOf(f)} lacks a commit, a positive integer number, or a url. launch.ts does not repair it.`;

const stackedCommitMismatchDetail = (f: Fixture, published: string): string =>
  `HEAD of ${worktreeOf(f)} is neither the published commit ${published} nor one commit on top of it, or it does not hold the reviewed tree ${lastReview(f).tree}. Commit the reviewed working tree as one commit on top of ${published}, and nothing else.`;

const alreadyPublishedDetail = (f: Fixture, published: string): string =>
  `HEAD of ${worktreeOf(f)} is the commit ${published} that ${PR_URL} already has, and it holds the reviewed tree. There is nothing to push.`;

const recordedNoPrDetail = `No open pull request of owner/repo uses the branch ${BRANCH}. The pull request ${PR_URL} that launch.json records is closed or merged.`;

const stackedMismatchDetail = (names: string, number = 9): string =>
  `The pull request ${PR_URL} differs from the publication launch.json records: ${names}. Reconcile it on GitHub, then call again. A pull request marked ready is turned back to a draft with \`gh pr ready ${number} --undo --repo owner/repo\`.`;

const alreadyPushedDetail = (head: string): string => `The pull request ${PR_URL} already has the commit ${head} as its head. Call published.`;

const notPushedDetail = (published: string, head: string): string =>
  `The pull request ${PR_URL} still has the published commit ${published} as its head. Push the commit ${head} to the branch ${BRANCH} of origin, then call again.`;

function assertBothStop(f: Fixture, reason: string): Record<string, unknown>[] {
  const before = launchFile(f);
  const outs = [publishable(f), published(f)].map((result) => assertStopped(result, reason));
  assert.deepEqual(
    outs.map((out) => out.action),
    ["publishable", "published"],
  );
  assert.equal(launchFile(f), before, reason);
  return outs;
}

function assertPublishableStops(f: Fixture, reason: string): Record<string, unknown> {
  const before = launchFile(f);
  const out = assertStopped(publishable(f), reason);
  assert.equal(out.action, "publishable");
  assert.equal(launchFile(f), before, reason);
  return out;
}

const STACKED_FIELDS = [
  "action",
  "ok",
  "issue",
  "repository",
  "remote",
  "base_branch",
  "branch",
  "base",
  "commit",
  "tree",
  "actor",
  "number",
  "url",
  "launch_file",
];

test("publishable and published stop with publications-unreadable and keep launch.json when the last publication lacks a commit, has number 0, has an empty url, or is not an object", () => {
  const breaks: [string, (last: Record<string, unknown>) => unknown][] = [
    ["no commit", ({ commit: _commit, ...rest }) => rest],
    ["number 0", (last) => ({ ...last, number: 0 })],
    ["empty url", (last) => ({ ...last, url: "" })],
    ["not an object", () => "not an object"],
  ];
  const f = publishedOnce();
  const [record] = publicationsOf(f);
  for (const [label, change] of breaks) {
    rewriteLaunch(f, (stored) => ({ ...stored, publications: [change(record)] }));
    for (const out of assertBothStop(f, "publications-unreadable")) assert.equal(out.detail, unreadablePublicationsDetail(f), label);
  }
});

test("publishable succeeds as a first publication with the twelve fields when publications is an empty array or not an array", () => {
  for (const publications of [[], "not an array"]) {
    const f = committed();
    rewriteLaunch(f, (stored) => ({ ...stored, publications }));
    const result = publishable(f);
    assert.equal(result.status, 0, result.stdout);
    assert.deepEqual(Object.keys(outputOf(result)), [...STACKED_FIELDS.slice(0, 11), "launch_file"], JSON.stringify(publications));
  }
});

test("publishable and published stop with commit-mismatch and the first-publication detail when no publication is recorded and HEAD is a merge commit whose first parent is the base", () => {
  const f = committed();
  const worktree = worktreeOf(f);
  const base = String(launchRecord(worktree).base);
  const other = git(f.origin, "rev-parse", "main~1");
  const merge = git(worktree, "commit-tree", String(lastReview(f).tree), "-p", base, "-p", other, "-m", "merge");
  git(worktree, "reset", "-q", "--soft", merge);
  assert.equal(git(worktree, "rev-parse", "HEAD^"), base);
  for (const out of assertBothStop(f, "commit-mismatch")) assert.equal(out.detail, commitMismatchDetail(f));
});

test("publishable and published stop with commit-mismatch and the published-commit detail when HEAD is the published commit and the reviewed change is not committed", () => {
  const f = publishedOnce();
  const published = git(worktreeOf(f), "rev-parse", "HEAD");
  reviewedEdit(f, "reviewed but not committed\n");
  for (const out of assertBothStop(f, "commit-mismatch")) assert.equal(out.detail, stackedCommitMismatchDetail(f, published));
});

test("publishable and published stop with commit-mismatch when the parent of HEAD is not the published commit", () => {
  const f = publishedOnce();
  const recorded = git(f.origin, "rev-parse", "main~1");
  assert.notEqual(recorded, git(worktreeOf(f), "rev-parse", "HEAD"));
  assert.notEqual(recorded, git(worktreeOf(f), "rev-parse", "HEAD^"));
  rewriteLaunch(f, (stored) => ({ ...stored, publications: [{ ...publicationsOf(f)[0], commit: recorded }] }));
  for (const out of assertBothStop(f, "commit-mismatch")) assert.equal(out.detail, stackedCommitMismatchDetail(f, recorded));
});

test("publishable and published stop with commit-mismatch when HEAD is a merge commit whose first parent is the published commit", () => {
  const f = publishedOnce();
  const worktree = worktreeOf(f);
  const published = git(worktree, "rev-parse", "HEAD");
  reviewedEdit(f, "merged change\n");
  const merge = git(worktree, "commit-tree", String(lastReview(f).tree), "-p", published, "-p", String(launchRecord(worktree).base), "-m", "merge");
  git(worktree, "add", "-A");
  git(worktree, "reset", "-q", "--soft", merge);
  assert.equal(git(worktree, "rev-parse", "HEAD^{tree}"), lastReview(f).tree);
  for (const out of assertBothStop(f, "commit-mismatch")) assert.equal(out.detail, stackedCommitMismatchDetail(f, published));
});

test("publishable on the published commit right after published succeeds stops with already-published", () => {
  const f = publishedOnce();
  const out = assertPublishableStops(f, "already-published");
  assert.equal(out.detail, alreadyPublishedDetail(f, git(worktreeOf(f), "rev-parse", "HEAD")));
});

test("publishable on a commit stacked on the published commit succeeds with the fourteen fields in order when the pull request matches, and keeps launch.json", () => {
  const { f, published } = stacked();
  const worktree = worktreeOf(f);
  withPulls(f, [pullWithHead(f, published)]);
  const before = launchFile(f);
  const result = publishable(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.deepEqual(Object.entries(outputOf(result)), [
    ["action", "publishable"],
    ["ok", true],
    ["issue", ISSUE],
    ["repository", "owner/repo"],
    ["remote", "origin"],
    ["base_branch", "main"],
    ["branch", BRANCH],
    ["base", launchRecord(worktree).base],
    ["commit", git(worktree, "rev-parse", "HEAD")],
    ["tree", lastReview(f).tree],
    ["actor", "launch-test"],
    ["number", 9],
    ["url", PR_URL],
    ["launch_file", launchPathOf(f)],
  ]);
  assert.equal(launchFile(f), before);
});

test("publishable on a stacked commit stops with no-pr naming the recorded pull request when no open pull request uses the branch", () => {
  const { f } = stacked();
  withPulls(f, []);
  assert.equal(assertPublishableStops(f, "no-pr").detail, recordedNoPrDetail);
});

test("publishable on a stacked commit stops with several-prs, and with pulls-unreadable when the list fails or the selected pull request has no number", () => {
  const { f, published } = stacked();
  const second = "https://github.com/owner/repo/pull/11";
  withPulls(f, [pullWithHead(f, published), pullWithHead(f, published, { number: 11, html_url: second })]);
  assert.equal(
    assertPublishableStops(f, "several-prs").detail,
    `2 open pull requests of owner/repo use the branch ${BRANCH}: ${PR_URL}, ${second}. Close all but the one this launch opened, then call again.`,
  );
  fakeGh(f, ISSUE_REPLY, REPO_REPLY, { pulls: null });
  const failed = assertPublishableStops(f, "pulls-unreadable");
  assert.ok(String(failed.detail).startsWith(`gh could not list the open pull requests of owner/repo for the branch ${BRANCH}: `), String(failed.detail));
  withPulls(f, [pullWithHead(f, published, { number: undefined })]);
  assert.equal(assertPublishableStops(f, "pulls-unreadable").detail, PULL_UNREADABLE_DETAIL);
});

test("publishable on a stacked commit stops with already-pushed when the pull request head is HEAD, even when the pull request is not a draft", () => {
  const { f } = stacked();
  const head = git(worktreeOf(f), "rev-parse", "HEAD");
  for (const extra of [{}, { draft: false }]) {
    withPulls(f, [pullWithHead(f, head, extra)]);
    assert.equal(assertPublishableStops(f, "already-pushed").detail, alreadyPushedDetail(head), JSON.stringify(extra));
  }
});

test("publishable on a stacked commit stops with pr-mismatch naming only the one field that differs from the recorded publication", () => {
  const { f, published } = stacked();
  const cases: [string, Record<string, unknown>, number][] = [
    ["number", { number: 12 }, 12],
    ["draft", { draft: false }, 9],
    ["author", { user: { login: "someone-else" } }, 9],
    ["head", { head: { ref: BRANCH, sha: "0".repeat(40), repo: { full_name: "owner/repo" } } }, 9],
    ["base", { base: { ref: "develop", repo: { full_name: "owner/repo" } } }, 9],
  ];
  for (const [name, change, number] of cases) {
    withPulls(f, [pullWithHead(f, published, change)]);
    assert.equal(assertPublishableStops(f, "pr-mismatch").detail, stackedMismatchDetail(name, number), name);
  }
});

test("publishable on a stacked commit names every differing field as number, draft, author, head, base in that order", () => {
  const { f } = stacked();
  withPulls(f, [
    matchingPull(f, {
      number: 12,
      draft: false,
      user: { login: "someone-else" },
      head: { ref: BRANCH, sha: "0".repeat(40), repo: { full_name: "owner/repo" } },
      base: { ref: "develop", repo: { full_name: "owner/repo" } },
    }),
  ]);
  assert.equal(assertPublishableStops(f, "pr-mismatch").detail, stackedMismatchDetail("number, draft, author, head, base", 12));
});

test("published on a pushed stacked commit appends a second publication for HEAD and keeps the first one unchanged", () => {
  const { f } = stacked();
  const [first] = publicationsOf(f);
  const head = git(worktreeOf(f), "rev-parse", "HEAD");
  withPulls(f, [matchingPull(f)]);
  const result = published(f);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(outputOf(result).commit, head);
  const publications = publicationsOf(f);
  assert.equal(publications.length, 2);
  assert.deepEqual(publications[0], first);
  assert.equal(publications[1].commit, head);
});

test("published on a stacked commit stops with not-pushed and keeps launch.json when the pull request head is still the published commit, even when the pull request is not a draft", () => {
  const { f, published } = stacked();
  const head = git(worktreeOf(f), "rev-parse", "HEAD");
  for (const extra of [{}, { draft: false }]) {
    withPulls(f, [pullWithHead(f, published, extra)]);
    assert.equal(assertPublishedStops(f, "not-pushed").detail, notPushedDetail(published, head), JSON.stringify(extra));
  }
});

test("publishable on a second stacked commit compares the pull request head with the second publication, not the first", () => {
  const { f } = stacked();
  withPulls(f, [matchingPull(f)]);
  assert.equal(published(f).status, 0);
  const [first, second] = publicationsOf(f);
  stackCommit(f, "second stacked change\n");
  withPulls(f, [pullWithHead(f, String(second.commit))]);
  const result = publishable(f);
  assert.equal(result.status, 0, result.stdout);
  assert.deepEqual(Object.keys(outputOf(result)), STACKED_FIELDS);
  withPulls(f, [pullWithHead(f, String(first.commit))]);
  assert.equal(assertPublishableStops(f, "pr-mismatch").detail, stackedMismatchDetail("head"));
});

test("a publication before the last one that lacks every field does not stop publishable, which stops with already-published on the published commit", () => {
  const f = publishedOnce();
  rewriteLaunch(f, (stored) => ({ ...stored, publications: [{}, publicationsOf(f)[0]] }));
  const out = assertPublishableStops(f, "already-published");
  assert.equal(out.detail, alreadyPublishedDetail(f, git(worktreeOf(f), "rev-parse", "HEAD")));
});

test("published with a recorded publication stops with no-pr naming the recorded pull request when no open pull request uses the branch", () => {
  const f = publishedOnce();
  withPulls(f, []);
  assert.equal(assertPublishedStops(f, "no-pr").detail, recordedNoPrDetail);
});

test("published with a recorded publication stops with pr-mismatch naming number when the pull request number differs from the record", () => {
  const f = publishedOnce();
  withPulls(f, [matchingPull(f, { number: 12 })]);
  assert.equal(assertPublishedStops(f, "pr-mismatch").detail, mismatchDetail("number"));
});

const FIRST_TURN = { type: "result", session_id: "s-0", result: "first report", total_cost_usd: 0.5, duration_ms: 1200 };
const SECOND_TURN = { type: "result", session_id: "s-1", result: "second note", total_cost_usd: 0.6, duration_ms: 300 };
const TWO_TURNS = [JSON.stringify(FIRST_TURN), JSON.stringify(SECOND_TURN)];
const JOINED_REPLY = "first report\n\nsecond note";

const printing = (f: Fixture, lines: string[]): string => {
  writeFileSync(join(f.logs, "turns.out"), lines.map((line) => `${line}\n`).join(""));
  return `cat "$LOGS/turns.out"\n`;
};

const implementPrinting = (lines: string[]): { result: SpawnSyncReturns<string>; f: Fixture } => {
  const f = fixture();
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, PASS_CHECK + printing(f, lines));
  return { result: run(f, ["implement", "--worktree", worktreeOf(f)]), f };
};

const implementReplyOf = (f: Fixture): unknown => (launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement.reply;

test("implement records the results of both turns joined by a blank line as reply, and reports the joined result with the second turn's cost, duration, and session_id", () => {
  const { result, f } = implementPrinting(TWO_TURNS);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.equal(out.result, JOINED_REPLY);
  assert.equal(out.cost_usd, 0.6);
  assert.equal(out.duration_ms, 300);
  assert.equal(out.session_id, "s-1");
  assert.equal(implementReplyOf(f), JOINED_REPLY);
  assert.equal((launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement.session_id, "s-1");
});

test("repair, reread, and continue each record the results of both turns joined by a blank line as reply", () => {
  const repaired = rejected();
  fakeRepairer(repaired, PASS_CHECK + printing(repaired, TWO_TURNS));
  assert.equal(repair(repaired).status, 0);
  assert.equal((launchRecord(worktreeOf(repaired)) as Stored).repairs[0].reply, JOINED_REPLY);

  const rereadAt = agreedAfterChange();
  fakeRereader(rereadAt, PASS_CHECK + printing(rereadAt, TWO_TURNS));
  assert.equal(reread(rereadAt).status, 0);
  assert.equal((launchRecord(worktreeOf(rereadAt)) as { rereads: Record<string, unknown>[] }).rereads[0].reply, JOINED_REPLY);

  const continued = unfinished();
  fakeContinuer(continued, PASS_CHECK + printing(continued, TWO_TURNS));
  assert.equal(continueWork(continued).status, 0);
  assert.equal((launchRecord(worktreeOf(continued)) as Continued).continues[0].reply, JOINED_REPLY);
});

test("implement skips lines that are not turn results, and reads the same reply as from the two turn results alone", () => {
  const assistant = JSON.stringify({ type: "assistant", message: { content: "thinking" } });
  const untyped = JSON.stringify({ session_id: "s-9", result: "untyped" });
  const { result, f } = implementPrinting([assistant, "", TWO_TURNS[0], untyped, "not json", TWO_TURNS[1], assistant, ""]);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.deepEqual([out.result, out.cost_usd, out.duration_ms, out.session_id], [JOINED_REPLY, 0.6, 300, "s-1"]);
  assert.equal(implementReplyOf(f), JOINED_REPLY);
});

test("implement leaves out of the reply a turn result without a string result and one whose result is only whitespace", () => {
  const { result, f } = implementPrinting([
    JSON.stringify({ type: "result", session_id: "s-1" }),
    JSON.stringify({ type: "result", session_id: "s-1", result: "  " }),
    JSON.stringify({ type: "result", session_id: "s-1", result: "kept" }),
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).result, "kept");
  assert.equal(implementReplyOf(f), "kept");
});

test("implement stops with child-failed whose detail starts with the no result event sentence when claude prints no turn result", () => {
  for (const lines of [[JSON.stringify({ type: "assistant", message: { content: "x" } })], []]) {
    const { result } = implementPrinting(lines);
    const out = assertStopped(result, "child-failed");
    assert.ok(String(out.detail).startsWith("claude -p printed no result event."), String(out.detail));
  }
});

test("implement, repair, reread, and continue start claude with --output-format stream-json --verbose, and the two review sessions with --output-format json and no --verbose", () => {
  const streamed = (args: string[], label: string) => {
    assert.equal(flagValue(args, "--output-format"), "stream-json", label);
    assert.ok(args.includes("--verbose"), label);
  };
  const argsIn = (f: Fixture, name: string): string[] => readFileSync(join(f.logs, name), "utf8").split("\n");

  const f = rejected();
  streamed(argsIn(f, "args"), "implement");
  for (const side of ["self", "independent"]) {
    const { args } = callOf(f, side);
    assert.equal(flagValue(args, "--output-format"), "json", side);
    assert.ok(!args.includes("--verbose"), side);
  }
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  streamed(argsIn(f, "repair-args"), "repair");

  const rereadAt = agreedAfterChange();
  fakeRereader(rereadAt, PASS_CHECK + REREAD_REPLY);
  assert.equal(reread(rereadAt).status, 0);
  streamed(argsIn(rereadAt, "reread-args"), "reread");

  const continued = unfinished();
  fakeContinuer(continued, PASS_CHECK + CONTINUE_REPLY);
  assert.equal(continueWork(continued).status, 0);
  streamed(argsIn(continued, "continue-args"), "continue");
});

test("the next round's independent review gets the repair's replies of both turns joined by a blank line", () => {
  const f = rejected();
  fakeRepairer(f, PASS_CHECK + printing(f, TWO_TURNS));
  assert.equal(repair(f).status, 0);
  fakeReviewer(f, BOTH_OPEN);
  reviewOut(f);
  const paragraph = `The implementing session replied to the earlier findings as follows. Treat the reply as a claim to check, not as a fact.\n\n${JOINED_REPLY}`;
  assert.equal(callOf(f, "independent").stdin, independentJudgingPrompt(baseOf(f), paragraph));
});
