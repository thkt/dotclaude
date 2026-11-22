/// <reference types="node" />
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ISSUE,
  ISSUE_REPLY,
  REPO_REPLY,
  remotesOf,
  git,
  type Fixture,
  fixture,
  fakeGh,
  fakeGit,
  run,
  prepare,
  outputOf,
  assertStopped,
  worktreeOf,
  launchPathOf,
  launchRecord,
  rewriteLaunch,
  lastReview,
  fakeRounds,
  roundCalls,
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
  publishedReady,
  published,
  PULL_UNREADABLE_DETAIL,
  publishedOnce,
  publicationsOf,
  stacked,
  pullWithHead,
  recordedNoPrDetail,
  writeBody,
  bodyFileOf,
  expectedBody,
  headOf,
  bodyText,
  rewriteLastIndependent,
  sha256,
} from "./_launch-fixture.ts";

const forkPull = (f: Fixture): Record<string, unknown> =>
  matchingPull(f, {
    number: 10,
    html_url: "https://github.com/owner/repo/pull/10",
    head: { ref: BRANCH, sha: git(worktreeOf(f), "rev-parse", "HEAD"), repo: { full_name: "fork/repo" } },
  });

const launchTextAt = (worktree: string): string | null => {
  const path = join(git(worktree, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch.json");
  return existsSync(path) ? readFileSync(path, "utf8") : null;
};

const noPrDetail = (f: Fixture): string =>
  `No open pull request of owner/repo uses the branch ${BRANCH}. If the commit ${git(worktreeOf(f), "rev-parse", "HEAD")} is not published yet, push it and open a draft pull request into main, then call again.`;

const mismatchDetail = (names: string): string =>
  `The pull request ${PR_URL} differs from what launch.ts confirmed before the push: ${names}. Reconcile it on GitHub, then call again.`;

function assertPublishedStops(f: Fixture, reason: string): Record<string, unknown> {
  const before = launchFile(f);
  const out = assertStopped(published(f), reason);
  assert.equal(out.action, "published");
  assert.equal(launchFile(f), before, reason);
  return out;
}

test("published on a committed worktree whose open draft pull request matches succeeds with the sixteen fields in order, appends one publication to launch.json, starts no claude, and keeps HEAD", () => {
  const f = publishedReady();
  const worktree = worktreeOf(f);
  fakeRounds(f, {});
  const before = launchRecord(worktree);
  const head = git(worktree, "rev-parse", "HEAD");
  const digest = createHash("sha256").update(String(builtBodyAt(f, head))).digest("hex");
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
    ["body_digest", digest],
    ["at", at],
    ["launch_file", launchPathOf(f)],
  ]);
  const after = launchRecord(worktree);
  assert.deepEqual(Object.keys(after), [...Object.keys(before), "publications"]);
  const record = { number: 9, url: PR_URL, commit: head, tree: lastReview(f).tree, base_branch: "main", actor: "launch-test", body_digest: digest, at };
  assert.deepEqual(after, { ...before, publications: [record] });
  const [stored] = after.publications as Record<string, unknown>[];
  assert.deepEqual(Object.keys(stored), ["number", "url", "commit", "tree", "base_branch", "actor", "body_digest", "at"]);
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

const notPushedDetail = (published: string, head: string): string =>
  `The pull request ${PR_URL} still has the published commit ${published} as its head. Push the commit ${head} to the branch ${BRANCH} of origin, then call again.`;

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

test("published succeeds when the pull request body equals the body launch.ts body writes, and records its SHA-256 as body_digest in launch.json and on stdout", () => {
  const f = committed();
  const text = expectedBody({ commit: headOf(f) });
  withPulls(f, [matchingPull(f, { body: text })]);
  const result = published(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.equal(outputOf(result).body_digest, sha256(text));
  assert.equal(publicationsOf(f)[0].body_digest, sha256(text));
});

test("published stops with pr-mismatch naming body and keeps launch.json when the pull request body has one more character, lacks the last newline, is null, or is absent", () => {
  const f = committed();
  const text = expectedBody({ commit: headOf(f) });
  const bodies: [string, Record<string, unknown>][] = [
    ["one more character", { body: `${text}x` }],
    ["no last newline", { body: text.slice(0, -1) }],
    ["null", { body: null }],
    ["absent", { body: undefined }],
  ];
  for (const [label, change] of bodies) {
    withPulls(f, [matchingPull(f, change)]);
    assert.equal(assertPublishedStops(f, "pr-mismatch").detail, mismatchDetail("body"), label);
  }
});

test("published names every differing field as draft, author, head, base, body, with number first when a publication is recorded", () => {
  const everything = {
    draft: false,
    user: { login: "someone-else" },
    head: { ref: BRANCH, sha: "0".repeat(40), repo: { full_name: "owner/repo" } },
    base: { ref: "develop", repo: { full_name: "owner/repo" } },
    body: "another body\n",
  };
  const f = committed();
  withPulls(f, [matchingPull(f, everything)]);
  assert.equal(assertPublishedStops(f, "pr-mismatch").detail, mismatchDetail("draft, author, head, base, body"));
  const once = publishedOnce();
  withPulls(once, [matchingPull(once, { ...everything, number: 12 })]);
  assert.equal(assertPublishedStops(once, "pr-mismatch").detail, mismatchDetail("number, draft, author, head, base, body"));
});

test("published compares the pull request body with the body it builds, not with pr-body.md, and leaves pr-body.md as it is", () => {
  const f = committed();
  const text = bodyText(f);
  const rewritten = "a body someone rewrote\n";
  writeFileSync(bodyFileOf(f), rewritten);
  withPulls(f, [matchingPull(f, { body: text })]);
  const result = published(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.equal(readFileSync(bodyFileOf(f), "utf8"), rewritten);
  withPulls(f, [matchingPull(f, { body: rewritten })]);
  assert.equal(assertPublishedStops(f, "pr-mismatch").detail, mismatchDetail("body"));
  assert.equal(readFileSync(bodyFileOf(f), "utf8"), rewritten);
});

test("published stops with the reason and detail body gives when it cannot build the body, even when another field differs, and keeps launch.json", () => {
  const f = committed();
  withPulls(f, [matchingPull(f, { draft: false })]);
  rewriteLastIndependent(f, ({ assessments: _, ...rest }) => rest);
  const out = assertPublishedStops(f, "no-assessments");
  assert.equal(out.detail, assertStopped(writeBody(f), "no-assessments").detail);
});

test("published on a stacked commit stops with not-pushed before it builds the body", () => {
  const { f, published: first } = stacked();
  withPulls(f, [pullWithHead(f, first)]);
  rewriteLastIndependent(f, ({ assessments: _, ...rest }) => rest);
  assert.equal(assertPublishedStops(f, "not-pushed").detail, notPushedDetail(first, headOf(f)));
});

test("published on a pushed stacked commit compares the pull request body with the body built from the new commit, and records a body_digest that differs from the first", () => {
  const { f } = stacked();
  const text = expectedBody({ commit: headOf(f) });
  withPulls(f, [matchingPull(f, { body: text })]);
  const result = published(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  const [first, second] = publicationsOf(f);
  assert.equal(second.body_digest, sha256(text));
  assert.notEqual(second.body_digest, first.body_digest);
});
