/// <reference types="node" />
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ISSUE,
  CONFIG,
  git,
  commitFile,
  type Fixture,
  fixture,
  PASS_CHECK,
  run,
  outputOf,
  assertStopped,
  worktreeOf,
  launchPathOf,
  type Step,
  ASSESSMENTS,
  shaped,
  fakeReviewer,
  implemented,
  SELF_OPTIONAL,
  INDEPENDENT_REQUIRED,
  REJECTED,
  REPAIR_REPLY,
  EDIT_FILE,
  fakeRepairer,
  repair,
  rejected,
  judging,
  allStates,
  rewriteLaunch,
  reviewOut,
  lastReview,
  fakeRounds,
  roundCalls,
  launchFile,
  holdersOf,
  BRANCH,
  acceptedWithChanges,
  committed,
  publishedOnce,
  stacked,
  writeBody,
  bodyFileOf,
  expectedBody,
  headOf,
  bodyText,
  rewriteLastIndependent,
} from "./_launch-fixture.ts";

test("body on an accepted and committed worktree writes the body to pr-body.md in the gate directory, returns the eleven fields in order, starts no claude, and keeps launch.json and HEAD", () => {
  const f = committed();
  fakeRounds(f, {});
  const before = launchFile(f);
  const head = headOf(f);
  const result = writeBody(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  const text = expectedBody({ commit: head });
  assert.deepEqual(Object.entries(outputOf(result)), [
    ["action", "body"],
    ["ok", true],
    ["issue", ISSUE],
    ["repository", "owner/repo"],
    ["branch", BRANCH],
    ["commit", head],
    ["tree", lastReview(f).tree],
    ["body_file", bodyFileOf(f)],
    ["body_digest", createHash("sha256").update(readFileSync(bodyFileOf(f))).digest("hex")],
    ["media", []],
    ["launch_file", launchPathOf(f)],
  ]);
  assert.equal(readFileSync(bodyFileOf(f), "utf8"), text);
  assert.equal(outputOf(result).body_digest, createHash("sha256").update(text).digest("hex"));
  assert.ok(!text.includes("## Findings and responses"));
  assert.deepEqual(roundCalls(f), []);
  assert.equal(launchFile(f), before);
  assert.equal(headOf(f), head);
  assert.deepEqual(existsSync(holdersOf(f)) ? readdirSync(holdersOf(f)) : [], []);
});

test("body writes the check of the base .dotagents.json as its JSON text when check is an argv array", () => {
  const f = committed({ ...CONFIG, check: ["true"] });
  assert.equal(bodyText(f), expectedBody({ commit: headOf(f), check: '["true"]' }));
});

test("body lists each document with a link whose path segments are URI-encoded, and each handoff step, in record order", () => {
  const f = committed();
  rewriteLastIndependent(f, (independent) => ({
    ...independent,
    documents: [
      { path: "docs/a b.md", role: "proposal", reason: "first reason" },
      { path: "README.md", role: "historical", reason: "second reason" },
    ],
    handoff: ["first step", "second step"],
  }));
  const head = headOf(f);
  assert.equal(
    bodyText(f),
    expectedBody({
      commit: head,
      documents: [
        `- [docs/a b.md](https://github.com/owner/repo/blob/${head}/docs/a%20b.md) (proposal): first reason`,
        `- [README.md](https://github.com/owner/repo/blob/${head}/README.md) (historical): second reason`,
      ],
      handoff: ["- first step", "- second step"],
    }),
  );
});

test("body lists the optional findings of the last round's independent review and leaves out those of the self review", () => {
  const f = committed(CONFIG, {
    self: { reply: shaped("self-1", [SELF_OPTIONAL]) },
    independent: { reply: shaped("ind-1", [{ required: false, location: "b.ts:3", condition: "c5", problem: "p5", action: "a5" }]) },
  });
  assert.equal(
    bodyText(f),
    expectedBody({ commit: headOf(f), findings: ["- concern: c5 Problem: p5 Suggested action: a5"] }),
  );
});

const REPAIRED_JUDGMENTS = { "1-self-1": "fixed", "1-independent-1": "withdrawn" };

function acceptedAfterRepair(roundOne: Record<string, Step> = REJECTED): Fixture {
  const f = implemented();
  fakeReviewer(f, roundOne);
  assert.equal(reviewOut(f).verdict, "rejected");
  fakeRepairer(f, EDIT_FILE + PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  fakeReviewer(f, {
    self: { reply: judging("self-2", allStates("fixed")) },
    independent: { reply: judging("ind-2", REPAIRED_JUDGMENTS) },
  });
  assert.equal(reviewOut(f).verdict, "accepted");
  git(worktreeOf(f), "add", "-A");
  git(worktreeOf(f), "commit", "-q", "-m", "repaired change");
  return f;
}

test("body lists the required findings in the order their keys first appear, with the side that reported each and the independent review's state and reason", () => {
  const f = acceptedAfterRepair();
  assert.equal(
    bodyText(f),
    expectedBody({
      commit: headOf(f),
      findings: [
        "- reported by self / fixed: ind-2 saw 1-self-1 fixed",
        "- reported by independent / withdrawn: ind-2 saw 1-independent-1 withdrawn",
      ],
    }),
  );
});

test("body uses the problem of a required finding whose judgment reason is only whitespace", () => {
  const f = acceptedAfterRepair();
  rewriteLastIndependent(f, (independent) => ({
    ...independent,
    previous: (independent.previous as Record<string, unknown>[]).map((judgment) =>
      judgment.key === "1-self-1" ? { ...judgment, reason: " \n " } : judgment,
    ),
  }));
  assert.equal(
    bodyText(f),
    expectedBody({
      commit: headOf(f),
      findings: ["- reported by self / fixed: p1", "- reported by independent / withdrawn: ind-2 saw 1-independent-1 withdrawn"],
    }),
  );
});

test("body marks a required finding that no round judged as unjudged with its problem, and still writes the body", () => {
  const f = acceptedAfterRepair();
  rewriteLastIndependent(f, (independent) => ({ ...independent, previous: [] }));
  assert.equal(
    bodyText(f),
    expectedBody({
      commit: headOf(f),
      findings: ["- reported by self / unjudged: p1", "- reported by independent / unjudged: p3"],
    }),
  );
});

test("body leaves out an optional finding that only an earlier round reported", () => {
  const f = acceptedAfterRepair({
    ...REJECTED,
    independent: { reply: shaped("ind-1", [INDEPENDENT_REQUIRED, { required: false, location: "", condition: "c6", problem: "p6", action: "a6" }]) },
  });
  assert.equal(
    bodyText(f),
    expectedBody({
      commit: headOf(f),
      findings: [
        "- reported by self / fixed: ind-2 saw 1-self-1 fixed",
        "- reported by independent / withdrawn: ind-2 saw 1-independent-1 withdrawn",
      ],
    }),
  );
});

test("body replaces paths under the worktree and the repo root, file:///, ~/, and drive paths with the omission text, and keeps a path that only shares a prefix or follows a letter", () => {
  const f = committed();
  const omitted = "(internal path omitted)";
  const code = [
    `${worktreeOf(f)}/a.ts:1`,
    `${f.repo}/README.md`,
    "file:///tmp/x",
    "~/notes.md",
    "C:\\dir\\x",
    `${f.repo}-other/x`,
    "a~/b",
    "xC:\\dir\\x",
  ].join(" ");
  rewriteLastIndependent(f, (independent) => ({ ...independent, assessments: { ...ASSESSMENTS, code } }));
  const expected = [omitted, omitted, omitted, omitted, omitted, `${f.repo}-other/x`, "a~/b", "xC:\\dir\\x"].join(" ");
  assert.equal(bodyText(f), expectedBody({ commit: headOf(f), code: expected }));
});

test("body stops with the reason and detail publishable gives when the worktree is not prepared, not accepted, or not committed, and writes no file", () => {
  const cases: [string, () => Fixture, string | null][] = [
    ["not-prepared", fixture, null],
    ["not-accepted", rejected, "worktree"],
    ["commit-mismatch", acceptedWithChanges, "worktree"],
  ];
  for (const [reason, arrange, at] of cases) {
    const f = arrange();
    const worktree = at === null ? f.repo : worktreeOf(f);
    const expected = assertStopped(run(f, ["publishable", "--worktree", worktree]), reason);
    const out = assertStopped(writeBody(f, worktree), reason);
    assert.equal(out.action, "body", reason);
    assert.equal(out.detail, expected.detail, reason);
    const gateDir = git(worktree, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
    assert.ok(!existsSync(join(gateDir, "pr-body.md")), reason);
  }
});

test("body stops with no-assessments and writes no file when the last independent review lacks assessments or its handoff is a string", () => {
  const changes: [string, (independent: Record<string, unknown>) => Record<string, unknown>][] = [
    ["no assessments", ({ assessments: _, ...rest }) => rest],
    ["string handoff", (independent) => ({ ...independent, handoff: "a step" })],
  ];
  for (const [label, change] of changes) {
    const f = committed();
    rewriteLastIndependent(f, change);
    const out = assertStopped(writeBody(f), "no-assessments");
    assert.equal(out.action, "body", label);
    assert.equal(
      out.detail,
      `The last review round of ${worktreeOf(f)} has no assessments, documents, and handoff from the independent review. Call review to record them.`,
      label,
    );
    assert.ok(!existsSync(bodyFileOf(f)), label);
  }
});

test("body stops with no-config when the base commit's .dotagents.json has no ciChecks", () => {
  const f = publishedOnce();
  const { ciChecks: _, ...withoutCi } = CONFIG;
  git(f.repo, "checkout", "-q", "-b", "no-ci");
  commitFile(f.repo, ".dotagents.json", `${JSON.stringify(withoutCi)}\n`);
  const base = git(f.repo, "rev-parse", "HEAD");
  git(f.repo, "checkout", "-q", "main");
  rewriteLaunch(f, (stored) => ({ ...stored, base }));
  const out = assertStopped(writeBody(f), "no-config");
  assert.equal(out.action, "body");
  assert.equal(out.detail, `The base commit ${base} of ${worktreeOf(f)} has no .dotagents.json with check and ciChecks.`);
  assert.ok(!existsSync(bodyFileOf(f)));
});

test("body called twice rewrites the file with the second call's body", () => {
  const f = committed();
  bodyText(f);
  rewriteLastIndependent(f, (independent) => ({ ...independent, handoff: ["a later step"] }));
  assert.equal(bodyText(f), expectedBody({ commit: headOf(f), handoff: ["- a later step"] }));
});

test("body succeeds on the published commit and on a commit stacked on it, with the HEAD of each as the target commit", () => {
  const once = publishedOnce();
  assert.equal(bodyText(once), expectedBody({ commit: headOf(once) }));
  const { f, published: first } = stacked();
  assert.notEqual(headOf(f), first);
  assert.equal(bodyText(f), expectedBody({ commit: headOf(f) }));
});

test("the usage has the body line after the published line, and a body call without --worktree, with a relative path, or with --model prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  const calls = [["body"], ["body", "--worktree", "relative/worktree"], ["body", "--worktree", worktreeOf(f), "--model", "opus"]];
  for (const args of calls) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
    assert.ok(
      result.stderr.includes("launch.ts published --worktree <abs path>\n       launch.ts body --worktree <abs path>\n"),
      result.stderr,
    );
  }
});
