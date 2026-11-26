/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ASSET_A,
  BRANCH,
  CHANGED_BODY,
  CLEAN,
  CLIP,
  FEATURE_TITLE,
  type Fixture,
  ISSUE,
  LIST,
  PR_URL,
  assertStopped,
  bodyFileOf,
  bodyText,
  bothAttached,
  builtBodyAt,
  commitAll,
  committed,
  fakeGit,
  fakePublishGh,
  fakeReviewer,
  ghCallsOf,
  git,
  headOf,
  holdersOf,
  imageAttached,
  launchRecord,
  onOrigin,
  originBranchOf,
  outputOf,
  passCheck,
  publicationsOf,
  publish,
  publishedOnce,
  rejected,
  remotesOf,
  review,
  sha256,
  stacked,
  twoMedia,
  withMedia,
  worktreeOf,
} from "./_launch-fixture.ts";

const PUBLISHED_INSTEAD = "If this launch opened the pull request, call launch.ts published.";

const PUBLISHED_AFTER_FIX = "After fixing it on GitHub, call launch.ts published.";

const OTHER_SHA = "0".repeat(40);

const publicationCount = (f: Fixture): number => {
  const publications = launchRecord(worktreeOf(f)).publications;
  return Array.isArray(publications) ? publications.length : 0;
};

const succeeded = (f: Fixture): Record<string, unknown> => {
  const result = publish(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  return outputOf(result);
};

const flagsOf = (args: string[], flag: string): string[] => args.flatMap((arg, at) => (arg === flag ? [args[at + 1]] : []));

const addNotes = (f: Fixture): void => {
  writeFileSync(join(worktreeOf(f), "notes.md"), "notes\n");
  passCheck(f);
  fakeReviewer(f, CLEAN);
  assert.equal(outputOf(review(f)).verdict, "accepted");
  commitAll(f, "notes after publishing");
};

const stackedOnOrigin = (): { f: Fixture; published: string } => {
  const { f, published } = stacked();
  fakePublishGh(f);
  onOrigin(f, published, { number: 9, body: String(builtBodyAt(f, published)) });
  return { f, published };
};

const stackedAndPushed = (prBody: (f: Fixture) => string): Fixture => {
  const { f } = stacked();
  fakePublishGh(f);
  onOrigin(f, headOf(f), { number: 9, body: prBody(f) });
  return f;
};

test("publish on a committed accepted worktree pushes the commit to the branch, opens one draft pull request, records the publication, and prints the published fields with pushed and created", () => {
  const f = committed();
  fakePublishGh(f);
  const commit = headOf(f);
  const out = succeeded(f);
  assert.equal(originBranchOf(f), commit);
  const creates = ghCallsOf(f, "create");
  assert.equal(creates.length, 1);
  const { args } = creates[0];
  assert.ok(args.includes("--draft"));
  assert.equal(flagsOf(args, "--repo")[0], "owner/repo");
  assert.equal(flagsOf(args, "--base")[0], "main");
  assert.equal(flagsOf(args, "--head")[0], BRANCH);
  assert.equal(flagsOf(args, "--title")[0], `${FEATURE_TITLE} (#${ISSUE})`);
  assert.equal(flagsOf(args, "--body-file")[0], bodyFileOf(f));
  assert.deepEqual(ghCallsOf(f, "edit"), []);
  const publications = publicationsOf(f);
  assert.equal(publications.length, 1);
  assert.equal(publications[0].commit, commit);
  assert.equal(publications[0].body_digest, sha256(readFileSync(bodyFileOf(f), "utf8")));
  assert.deepEqual(Object.keys(out), [
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
    "body_digest",
    "at",
    "launch_file",
    "pushed",
    "created",
    "attached",
  ]);
  assert.equal(out.action, "publish");
  assert.equal(out.commit, commit);
  assert.equal(out.number, 9);
  assert.equal(out.url, PR_URL);
  assert.equal(out.body_digest, publications[0].body_digest);
  assert.equal(out.pushed, true);
  assert.equal(out.created, true);
  assert.equal(out.attached, false);
});

test("publish pushes and records the commit it checked first when another commit lands on HEAD while it runs", () => {
  const f = committed();
  const commit = headOf(f);
  fakePublishGh(f, {
    during: { call: "issue", index: 2, shell: "echo later >> later.md && git add later.md && git commit -q -m later" },
  });
  const out = succeeded(f);
  assert.notEqual(headOf(f), commit);
  assert.equal(originBranchOf(f), commit);
  assert.equal(publicationsOf(f)[0].commit, commit);
  assert.equal(out.commit, commit);
});

test("publish stops with the reason publishable gives, and neither pushes nor opens a pull request", () => {
  const cases: [string, () => Fixture, Record<string, string>, (f: Fixture) => void][] = [
    ["not-accepted", rejected, {}, () => {}],
    ["remote-mismatch", committed, {}, (f) => fakeGit(f, remotesOf("origin", "https://github.com/other/repo.git"))],
    ["gh-host", committed, { GH_HOST: "example.com" }, () => {}],
    ["no-permission", committed, {}, (f) => fakePublishGh(f, { repo: { nameWithOwner: "owner/repo", viewerPermission: "READ" } })],
    ["already-published", publishedOnce, {}, () => {}],
  ];
  for (const [reason, arrange, env, change] of cases) {
    const f = arrange();
    fakePublishGh(f);
    change(f);
    const before = launchRecord(worktreeOf(f)).publications;
    assertStopped(publish(f, env), reason);
    assert.equal(originBranchOf(f), null, reason);
    assert.deepEqual(ghCallsOf(f, "create"), [], reason);
    assert.deepEqual(launchRecord(worktreeOf(f)).publications, before, reason);
  }
});

test("publish stops with branch-pr-exists naming launch.ts published when an open pull request already uses the branch", () => {
  const f = committed();
  fakePublishGh(f, { pr: { number: 9, body: "opened elsewhere\n" } });
  const out = assertStopped(publish(f), "branch-pr-exists");
  assert.equal(out.detail, `An open pull request already uses the branch ${BRANCH}: ${PR_URL}. ${PUBLISHED_INSTEAD}`);
  assert.equal(originBranchOf(f), null);
});

test("publish stops with push-failed when the remote branch is not an ancestor of the commit, and opens no pull request", () => {
  const f = committed();
  fakePublishGh(f);
  git(f.repo, "checkout", "-q", "-b", "diverged", "main");
  writeFileSync(join(f.repo, "diverged.md"), "diverged\n");
  git(f.repo, "add", "diverged.md");
  git(f.repo, "commit", "-q", "-m", "diverged");
  git(f.repo, "push", "-q", "origin", `diverged:refs/heads/${BRANCH}`);
  const diverged = git(f.repo, "rev-parse", "HEAD");
  const out = assertStopped(publish(f), "push-failed");
  assert.ok(String(out.detail).startsWith(`git push of ${headOf(f)} to refs/heads/${BRANCH} of origin exited 1: `), String(out.detail));
  assert.ok(String(out.detail).length <= 500 + 200);
  assert.equal(originBranchOf(f), diverged);
  assert.deepEqual(ghCallsOf(f, "create"), []);
  assert.equal(publicationCount(f), 0);
});

test("publish stops with pr-create-failed when gh pr create fails without opening a pull request, and a second call succeeds without pushing", () => {
  const f = committed();
  fakePublishGh(f, { failCreate: [1] });
  const out = assertStopped(publish(f), "pr-create-failed");
  assert.equal(out.detail, "gh pr create exited 1: gh create failed on purpose");
  assert.equal(originBranchOf(f), headOf(f));
  assert.equal(publicationCount(f), 0);
  const again = succeeded(f);
  assert.equal(again.pushed, false);
  assert.equal(again.created, true);
  assert.equal(ghCallsOf(f, "create").length, 2);
  assert.equal(publicationCount(f), 1);
});

test("publish stops with pr-create-failed when gh pr create prints no pull request URL", () => {
  const f = committed();
  fakePublishGh(f, { createStdout: "created\n" });
  const out = assertStopped(publish(f), "pr-create-failed");
  assert.equal(out.detail, "gh pr create printed no pull request URL that ends in a positive integer: created");
  assert.equal(publicationCount(f), 0);
});

test("publish on one commit stacked on the published commit pushes it, edits the pull request once, and opens none", () => {
  const { f } = stackedOnOrigin();
  const out = succeeded(f);
  assert.equal(originBranchOf(f), headOf(f));
  assert.deepEqual(ghCallsOf(f, "create"), []);
  const edits = ghCallsOf(f, "edit");
  assert.equal(edits.length, 1);
  assert.equal(flagsOf(edits[0].args, "--body-file")[0], bodyFileOf(f));
  assert.deepEqual(flagsOf(edits[0].args, "--attach"), []);
  assert.equal(out.pushed, true);
  assert.equal(out.created, false);
  assert.equal(out.attached, false);
  assert.equal(publicationsOf(f).length, 2);
  assert.equal(publicationsOf(f)[1].commit, headOf(f));
});

test("publish on a stacked commit already pushed stops with body-changed and edits nothing when the body matches neither the recorded digest nor the new body", () => {
  const f = stackedAndPushed(() => "someone rewrote the body\n");
  const out = assertStopped(publish(f), "body-changed");
  assert.equal(
    out.detail,
    `The body of the pull request ${PR_URL} changed after launch.ts recorded it. launch.ts does not overwrite a change someone else made. A human decides how to keep it.`,
  );
  assert.deepEqual(ghCallsOf(f, "edit"), []);
  assert.equal(publicationsOf(f).length, 1);
});

test("publish on a stacked commit already pushed edits the pull request once without pushing when the body has the recorded digest", () => {
  const f = stackedAndPushed((g) => String(builtBodyAt(g, String(publicationsOf(g)[0].commit))));
  const out = succeeded(f);
  assert.equal(ghCallsOf(f, "edit").length, 1);
  assert.equal(out.pushed, false);
  assert.equal(out.created, false);
  assert.equal(publicationsOf(f).length, 2);
});

test("publish on a stacked commit already pushed stops with pr-mismatch when the pull request is not a draft", () => {
  const { f } = stacked();
  fakePublishGh(f, { pulls: ["live", { live: { draft: false } }] });
  onOrigin(f, headOf(f), { number: 9, body: String(builtBodyAt(f, String(publicationsOf(f)[0].commit))) });
  const out = assertStopped(publish(f), "pr-mismatch");
  assert.ok(String(out.detail).includes(`differs from the publication launch.json records: draft.`), String(out.detail));
  assert.deepEqual(ghCallsOf(f, "edit"), []);
});

test("the first publication of a commit with an image and a video opens the pull request, then attaches every media with one edit in the worktree, and records the digest of the attached body", () => {
  const f = twoMedia();
  fakePublishGh(f);
  const out = succeeded(f);
  const built = readFileSync(bodyFileOf(f), "utf8");
  assert.ok(built.includes("## Media"));
  assert.equal(ghCallsOf(f, "create").length, 1);
  const edits = ghCallsOf(f, "edit");
  assert.equal(edits.length, 1);
  assert.equal(edits[0].args[2], "9");
  assert.equal(flagsOf(edits[0].args, "--body-file")[0], bodyFileOf(f));
  assert.deepEqual(flagsOf(edits[0].args, "--attach"), [CLIP, LIST]);
  assert.equal(edits[0].cwd, worktreeOf(f));
  assert.equal(out.attached, true);
  assert.equal(out.created, true);
  assert.equal(publicationsOf(f)[0].body_digest, sha256(bothAttached(built)));
  assert.equal(out.body_digest, sha256(bothAttached(built)));
});

test("a media pull request stacked with a Markdown-only commit is edited once with every media attached", () => {
  const f = withMedia({ required: false });
  fakePublishGh(f);
  succeeded(f);
  addNotes(f);
  const out = succeeded(f);
  const edits = ghCallsOf(f, "edit");
  assert.equal(edits.length, 2);
  assert.deepEqual(flagsOf(edits[1].args, "--attach"), ["media/list.png"]);
  assert.equal(out.pushed, true);
  assert.equal(out.created, false);
  assert.equal(out.attached, true);
  assert.equal(publicationsOf(f).length, 2);
});

const mediaStackedAndPushed = (): Fixture => {
  const f = withMedia({ required: false });
  fakePublishGh(f);
  succeeded(f);
  addNotes(f);
  return f;
};

test("publish on a media commit already pushed edits nothing when the pull request body already has every media attached", () => {
  const f = mediaStackedAndPushed();
  const attached = imageAttached(bodyText(f), "media/list.png", ASSET_A);
  onOrigin(f, headOf(f), { number: 9, body: attached });
  const out = succeeded(f);
  assert.equal(ghCallsOf(f, "edit").length, 1);
  assert.equal(out.pushed, false);
  assert.equal(out.attached, false);
  assert.equal(publicationsOf(f)[1].body_digest, sha256(attached));
});

test("publish on a media commit already pushed edits once with the media attached when the pull request body still holds the relative references", () => {
  const f = mediaStackedAndPushed();
  onOrigin(f, headOf(f), { number: 9, body: bodyText(f) });
  const out = succeeded(f);
  const edits = ghCallsOf(f, "edit");
  assert.equal(edits.length, 2);
  assert.deepEqual(flagsOf(edits[1].args, "--attach"), ["media/list.png"]);
  assert.equal(out.pushed, false);
  assert.equal(out.attached, true);
});

test("the first publication stops with pr-edit-failed when the attaching edit fails, records nothing, and a second call stops with branch-pr-exists", () => {
  const f = twoMedia();
  fakePublishGh(f, { failEdit: [1] });
  const out = assertStopped(publish(f), "pr-edit-failed");
  assert.equal(out.detail, "gh pr edit exited 1: gh edit failed on purpose");
  assert.equal(publicationCount(f), 0);
  assertStopped(publish(f), "branch-pr-exists");
});

test("a commit that adds a media to HEAD while publish runs is left out of the Media section and the attachments", () => {
  const f = withMedia({});
  fakePublishGh(f, {
    during: {
      call: "issue",
      index: 2,
      shell: 'cp "$LOGS/shot.png" media/extra.png && git add media/extra.png && git commit -q -m extra',
    },
  });
  const commit = headOf(f);
  const out = succeeded(f);
  assert.notEqual(headOf(f), commit);
  const created = String(ghCallsOf(f, "create")[0].body);
  assert.ok(created.includes("![media/list.png](media/list.png)"));
  assert.ok(!created.includes("extra.png"));
  assert.deepEqual(flagsOf(ghCallsOf(f, "edit")[0].args, "--attach"), ["media/list.png"]);
  assert.equal(out.commit, commit);
});

test("publish stops with the reason of the agreed Issue check and pushes nothing when the Issue changes or cannot be read after the first check", () => {
  const cases: [string, string][] = [
    ["requirements-changed", JSON.stringify(CHANGED_BODY)],
    ["issue-unreadable", "{}"],
  ];
  for (const [reason, reply] of cases) {
    const f = committed();
    writeFileSync(join(f.logs, "next-issue.json"), reply);
    fakePublishGh(f, { during: { call: "issue", index: 2, shell: 'cp "$LOGS/next-issue.json" "$LOGS/gh-reply.json"' } });
    assertStopped(publish(f), reason);
    assert.equal(originBranchOf(f), null, reason);
    assert.deepEqual(ghCallsOf(f, "create"), [], reason);
  }
});

test("publish stops with the reason published gives when the pull request read back differs, names launch.ts published, and records nothing", () => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["head", { head: { ref: BRANCH, sha: OTHER_SHA, repo: { full_name: "owner/repo" } } }, "head"],
    ["body", { body: "another body\n" }, "body"],
  ];
  for (const [label, live, names] of cases) {
    const f = committed();
    fakePublishGh(f, { pulls: ["live", { live }] });
    const out = assertStopped(publish(f), "pr-mismatch");
    assert.equal(
      out.detail,
      `The pull request ${PR_URL} differs from what launch.ts confirmed before the push: ${names}. Reconcile it on GitHub, then call again. ${PUBLISHED_AFTER_FIX}`,
      label,
    );
    assert.equal(publicationCount(f), 0, label);
  }
});

test("publish leaves no file under launch-holders after it succeeds", () => {
  const f = committed();
  fakePublishGh(f);
  succeeded(f);
  assert.deepEqual(existsSync(holdersOf(f)) ? readdirSync(holdersOf(f)) : [], []);
});
