/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DONE_GATE,
  ISSUE,
  ISSUE_REPLY,
  REPO_REPLY,
  remotesOf,
  isolatedEnv,
  git,
  type Fixture,
  fixture,
  ghPullsArgsPath,
  fakeGh,
  fakeGit,
  run,
  prepare,
  outputOf,
  assertStopped,
  worktreeOf,
  launchPathOf,
  launchRecord,
  rejected,
  rewriteLaunch,
  lastReview,
  fakeRounds,
  roundCalls,
  runLaunch,
  CHANGED_BODY,
  launchFile,
  gateDisabled,
  holdersOf,
  BRANCH,
  publishable,
  acceptedWithChanges,
  committed,
  PR_URL,
  builtBodyAt,
  matchingPull,
  withPulls,
  published,
  PULL_UNREADABLE_DETAIL,
  publishedOnce,
  publicationsOf,
  reviewedEdit,
  stackCommit,
  stacked,
  pullWithHead,
  recordedNoPrDetail,
  sha256,
} from "./_launch-fixture.ts";

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
      result.stderr.includes("launch.ts run --worktree <abs path> [--model <name>] [--effort <level>]\n       launch.ts publishable --worktree <abs path>\n"),
      result.stderr,
    );
  }
});

const unreadablePublicationsDetail = (f: Fixture): string =>
  `The last entry of publications in ${launchPathOf(f)} lacks a commit, a positive integer number, or a url. launch.ts does not repair it.`;

const stackedCommitMismatchDetail = (f: Fixture, published: string): string =>
  `HEAD of ${worktreeOf(f)} is neither the published commit ${published} nor one commit on top of it, or it does not hold the reviewed tree ${lastReview(f).tree}. Commit the reviewed working tree as one commit on top of ${published}, and nothing else.`;

const alreadyPublishedDetail = (f: Fixture, published: string): string =>
  `HEAD of ${worktreeOf(f)} is the commit ${published} that ${PR_URL} already has, and it holds the reviewed tree. There is nothing to push.`;

const stackedMismatchDetail = (names: string, number = 9): string =>
  `The pull request ${PR_URL} differs from the publication launch.json records: ${names}. Reconcile it on GitHub, then call again. A pull request marked ready is turned back to a draft with \`gh pr ready ${number} --undo --repo owner/repo\`.`;

const alreadyPushedDetail = (head: string): string => `The pull request ${PR_URL} already has the commit ${head} as its head. Call published.`;

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

test("publishable on a stacked commit succeeds when the SHA-256 of the pull request body equals the recorded body_digest", () => {
  const { f, published: first } = stacked();
  const text = String(builtBodyAt(f, first));
  assert.equal(publicationsOf(f)[0].body_digest, sha256(text));
  withPulls(f, [pullWithHead(f, first, { body: text })]);
  const result = publishable(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});

const bodyChangedDetail = `The body of the pull request ${PR_URL} changed after launch.ts recorded it. launch.ts does not overwrite a change someone else made. A human decides how to keep it.`;

test("publishable on a stacked commit stops with body-changed when the pull request body has one more character or is null", () => {
  const { f, published: first } = stacked();
  for (const body of [`${builtBodyAt(f, first)}x`, null]) {
    withPulls(f, [pullWithHead(f, first, { body })]);
    assert.equal(assertPublishableStops(f, "body-changed").detail, bodyChangedDetail, String(body));
  }
});

test("publishable on a stacked commit stops with pr-mismatch without naming body when a field and the body both differ", () => {
  const { f, published: first } = stacked();
  withPulls(f, [pullWithHead(f, first, { draft: false, body: `${builtBodyAt(f, first)}x` })]);
  assert.equal(assertPublishableStops(f, "pr-mismatch").detail, stackedMismatchDetail("draft"));
});

test("publishable on a stacked commit does not check the body when the last publication has no body_digest or an uppercase one", () => {
  const changes: [string, (record: Record<string, unknown>) => Record<string, unknown>][] = [
    ["no body_digest", ({ body_digest: _, ...rest }) => rest],
    ["uppercase", (record) => ({ ...record, body_digest: String(record.body_digest).toUpperCase() })],
  ];
  for (const [label, change] of changes) {
    const { f, published: first } = stacked();
    rewriteLaunch(f, (stored) => ({ ...stored, publications: (stored.publications as Record<string, unknown>[]).map(change) }));
    for (const body of ["any other body\n", null]) {
      withPulls(f, [pullWithHead(f, first, { body })]);
      const result = publishable(f);
      assert.equal(result.status, 0, `${label} ${String(body)}: ${result.stdout}`);
    }
  }
});
