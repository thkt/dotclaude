/// <reference types="node" />
import assert from "node:assert/strict";
import { type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ISSUE,
  FEATURE_TITLE,
  CONFIG,
  ISSUE_REPLY,
  remotesOf,
  digestOf,
  git,
  commitFile,
  type Fixture,
  fixture,
  fakeGh,
  fakeGit,
  run,
  prepare,
  outputOf,
  assertStopped,
  worktreeOf,
  launchRecord,
  gateStatus,
} from "./_launch-fixture.ts";

function prepareWithHost(f: Fixture, host: string): SpawnSyncReturns<string> {
  return run(f, ["prepare", "--repo", f.repo, "--issue", String(ISSUE)], { GH_HOST: host });
}

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

test("prepare records issue_digest as the sha256 of the title, body, and state that gh returned", () => {
  const f = fixture();
  const reply = { number: ISSUE, title: FEATURE_TITLE, body: "本文 with \"quotes\"\nand lines", state: "OPEN" };
  fakeGh(f, reply);
  assert.equal(prepare(f).status, 0);
  const digest = launchRecord(worktreeOf(f)).issue_digest;
  assert.equal(digest, createHash("sha256").update(JSON.stringify([reply.title, reply.body, reply.state])).digest("hex"));
  assert.match(String(digest), /^[0-9a-f]{64}$/);
});
