/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { GIVE_REPLY } from "../scripts/claude-child.ts";
import {
  ISSUE_REPLY,
  digestOf,
  type Fixture,
  fixture,
  fakeGh,
  fakeClaude,
  SESSION_REPLY,
  PASS_CHECK,
  run,
  prepare,
  outputOf,
  assertStopped,
  worktreeOf,
  baseOf,
  launchPathOf,
  launchRecord,
  REVIEW_SCHEMA,
  type Step,
  ASSESSMENTS,
  PUBLISHED,
  shaped,
  CLEAN,
  fakeReviewer,
  implemented,
  review,
  callOf,
  flagValue,
  SELF_REQUIRED,
  SELF_OPTIONAL,
  INDEPENDENT_REQUIRED,
  REPAIR_REPLY,
  fakeRepairer,
  repair,
  rejected,
  type Stored,
  judging,
  allStates,
  BOTH_OPEN,
  JUDGING_SCHEMA,
  rewriteLaunch,
  moveBaseToParent,
  reviewOut,
  lastReview,
  REQUIRED_FIELDS,
  CHANGED_BODY,
  signalWhileClaudeWaits,
  assertEndedBySignal,
  launchFile,
  implementCalls,
  interrupted,
  TWO_TURNS,
  JOINED_REPLY,
  printing,
  git,
  assertIncludesAll,
} from "./_launch-fixture.ts";

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

const PUBLISHED_MARKER = "pull request body publishes";

const JUDGING_MARKER = "Judge each earlier finding";

const EARLIER_LINES = `\n\n{"key":"1-self-1","side":"self","location":"a.ts:1","condition":"c1","problem":"p1","action":"a1"}
{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3"}\n\n`;

const replyIn = (stdin: string, reply: string): boolean => stdin.includes(`\n\n${reply}\n\n`);

function assertJudgingOrNot(stdin: string, judges: boolean, label: string): void {
  if (judges) assertIncludesAll(stdin, [EARLIER_LINES, JUDGING_MARKER], label);
  else assert.ok(!stdin.includes(JUDGING_MARKER), `${label}: ${stdin}`);
}

function assertSelfPrompt(stdin: string, base: string, judges: boolean, label = "self"): void {
  assertIncludesAll(stdin, ["try to refute", "#42", `git diff ${base}`], label);
  assert.ok(!stdin.includes(PUBLISHED_MARKER), `${label}: ${stdin}`);
  assertJudgingOrNot(stdin, judges, label);
}

function assertIndependentPrompt(stdin: string, base: string, judges: boolean, label = "independent"): void {
  assertIncludesAll(stdin, [PUBLISHED_MARKER, "gh issue view 42 --repo owner/repo", `git diff ${base}`], label);
  assertJudgingOrNot(stdin, judges, label);
}

const FINDING = { location: "a.ts:1", condition: "c", problem: "p", action: "a" };

const callsOf = (f: Fixture): string[] =>
  existsSync(join(f.logs, "calls")) ? readFileSync(join(f.logs, "calls"), "utf8").split("\n").filter(Boolean) : [];

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
  assertSelfPrompt(callOf(f, "self").stdin, baseOf(f), false);
  assertIndependentPrompt(callOf(f, "independent").stdin, baseOf(f), false);
});

test("review gives both reviews the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = implemented();
  const base = moveBaseToParent(f);
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  assertSelfPrompt(callOf(f, "self").stdin, base, false);
  assertIndependentPrompt(callOf(f, "independent").stdin, base, false);
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

test("review stops with head-moved and keeps launch.json when a review commits in the worktree", () => {
  const f = implemented();
  const before = launchRecord(worktreeOf(f));
  const head = git(worktreeOf(f), "rev-parse", "HEAD");
  fakeReviewer(f, { ...CLEAN, self: { ...CLEAN.self, git: [["commit", "--allow-empty", "-m", "by the reviewer"]] } });
  const out = assertStopped(review(f), "head-moved") as { detail: string; reviews: Record<string, unknown> };
  assert.match(out.detail, new RegExp(`was ${head} on refs/heads/`));
  assert.notEqual(git(worktreeOf(f), "rev-parse", "HEAD"), head);
  assert.deepEqual(Object.keys(out.reviews).sort(), ["independent", "self"]);
  assert.deepEqual(launchRecord(worktreeOf(f)), before);
});

test("review stops with head-moved rather than review-failed when a review commits and gives no readable result", () => {
  const f = implemented();
  const before = launchRecord(worktreeOf(f));
  fakeReviewer(f, { ...CLEAN, self: { git: [["commit", "--allow-empty", "-m", "by the reviewer"]], exit: 4 } });
  const out = assertStopped(review(f), "head-moved") as { reviews: Record<string, unknown> };
  assert.deepEqual(Object.keys(out.reviews), ["independent"]);
  assert.deepEqual(launchRecord(worktreeOf(f)), before);
});

test("review stops with head-moved naming both branches when a review switches the worktree to another branch", () => {
  const f = implemented();
  const before = launchRecord(worktreeOf(f));
  fakeReviewer(f, { ...CLEAN, independent: { ...CLEAN.independent, git: [["branch", "reviewer-branch"], ["switch", "reviewer-branch"]] } });
  const out = assertStopped(review(f), "head-moved") as { detail: string };
  assert.match(out.detail, /on refs\/heads\/reviewer-branch after them/);
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

const INDEPENDENT_JUDGING_SCHEMA = {
  ...JUDGING_SCHEMA,
  required: ["findings", "verified", "previous", "assessments", "documents", "handoff"],
  properties: { ...JUDGING_SCHEMA.properties, ...PUBLISHED_PROPERTIES },
};

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
    assertSelfPrompt(callOf(f, "self").stdin, baseOf(f), false, label);
    assertIndependentPrompt(callOf(f, "independent").stdin, baseOf(f), false, label);
    assert.deepEqual(JSON.parse(flagValue(callOf(f, "self").args, "--json-schema")), REVIEW_SCHEMA, label);
    assert.deepEqual(JSON.parse(flagValue(callOf(f, "independent").args, "--json-schema")), INDEPENDENT_REVIEW_SCHEMA, label);
  }
});

test("a review after a round with required findings gives both reviews the earlier findings in order and the judging paragraph, with the judging schema", () => {
  const f = rejected();
  fakeReviewer(f, BOTH_OPEN);
  reviewOut(f);
  assertSelfPrompt(callOf(f, "self").stdin, baseOf(f), true);
  assertIndependentPrompt(callOf(f, "independent").stdin, baseOf(f), true);
  assert.deepEqual(JSON.parse(flagValue(callOf(f, "self").args, "--json-schema")), JUDGING_SCHEMA);
  assert.deepEqual(JSON.parse(flagValue(callOf(f, "independent").args, "--json-schema")), INDEPENDENT_JUDGING_SCHEMA);
});

test("the implementing session's reply to the last reviewed round reaches only the independent review", () => {
  const f = rejected();
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  fakeReviewer(f, BOTH_OPEN);
  reviewOut(f);
  const self = callOf(f, "self").stdin;
  const independent = callOf(f, "independent").stdin;
  assertSelfPrompt(self, baseOf(f), true);
  assertIndependentPrompt(independent, baseOf(f), true);
  assert.ok(replyIn(independent, "repaired"), independent);
  assert.ok(!replyIn(self, "repaired"), self);
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
    for (const name of ["self", "independent"]) {
      const stdin = callOf(f, name).stdin;
      assertJudgingOrNot(stdin, true, `${label} ${name}`);
      assert.ok(!replyIn(stdin, "repaired"), `${label} ${name}: ${stdin}`);
    }
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

test("review ends both claude and their children, exits 143, and adds no record to launch.json on SIGTERM", async () => {
  const f = implemented();
  const before = launchFile(f);
  const result = await signalWhileClaudeWaits(f, ["review", "--worktree", worktreeOf(f)], "SIGTERM", 2);
  assertEndedBySignal(result, 2);
  assert.equal(launchFile(f), before);
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

test("the next round's independent review gets the repair's replies of both turns joined by a blank line", () => {
  const f = rejected();
  fakeRepairer(f, PASS_CHECK + printing(f, TWO_TURNS));
  assert.equal(repair(f).status, 0);
  fakeReviewer(f, BOTH_OPEN);
  reviewOut(f);
  const independent = callOf(f, "independent").stdin;
  assertIndependentPrompt(independent, baseOf(f), true);
  assert.ok(replyIn(independent, JOINED_REPLY), independent);
});
