/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DONE_GATE,
  git,
  type Fixture,
  fixture,
  fakeGh,
  PASS_CHECK,
  run,
  prepare,
  outputOf,
  assertStopped,
  worktreeOf,
  baseOf,
  launchRecord,
  CLEAN,
  fakeReviewer,
  implemented,
  review,
  flagValue,
  SELF_REQUIRED,
  REPAIR_REPLY,
  EDIT_FILE,
  fakeRepairer,
  repair,
  rejected,
  type Stored,
  judging,
  allStates,
  BOTH_OPEN,
  rewriteLaunch,
  moveBaseToParent,
  reviewOut,
  CHANGED_BODY,
  signalWhileClaudeWaits,
  assertEndedBySignal,
  launchFile,
  reread,
  fakeRereader,
  agreedAfterChange,
  continueWork,
  fakeContinuer,
  unfinished,
  type Continued,
  TWO_TURNS,
  JOINED_REPLY,
  printing,
  assertIncludesAll,
} from "./_launch-fixture.ts";

const FIRST_ROUND_LINES = [
  '{"key":"1-self-1","side":"self","location":"a.ts:1","condition":"c1","problem":"p1","action":"a1","reopened":[]}',
  '{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3","reopened":[]}',
];

const assertRepairPrompt = (stdin: string, base: string, lines = FIRST_ROUND_LINES): void =>
  assertIncludesAll(stdin, ["reported findings", "#42", `commit ${base}`, `\n\n${lines.join("\n")}\n\n`, `\`${DONE_GATE} check\``, `\`${DONE_GATE} status\``]);

const repairCalls = (f: Fixture): number =>
  existsSync(join(f.logs, "repair-calls")) ? readFileSync(join(f.logs, "repair-calls"), "utf8").split("\n").filter(Boolean).length : 0;

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
  assertRepairPrompt(readFileSync(join(f.logs, "repair-stdin"), "utf8"), baseOf(f));
});

test("repair gives claude the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = rejected();
  const base = moveBaseToParent(f);
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  assertRepairPrompt(readFileSync(join(f.logs, "repair-stdin"), "utf8"), base);
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

test("repair passes a reopened finding carried from an earlier round with its key and reopened, before the new finding", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", { "1-self-1": "fixed", "1-independent-1": "open" }, [{ ...SELF_REQUIRED, condition: "c9" }]) },
    independent: { reply: judging("ind-2", allStates("fixed")) },
  });
  reviewOut(f);
  fakeRepairer(f, PASS_CHECK + REPAIR_REPLY);
  assert.equal(repair(f).status, 0);
  assertRepairPrompt(readFileSync(join(f.logs, "repair-stdin"), "utf8"), baseOf(f), [
    '{"key":"1-independent-1","side":"independent","location":"","condition":"c3","problem":"p3","action":"a3","reopened":[{"side":"self","reason":"self-2 saw 1-independent-1 open"}]}',
    '{"key":"2-self-1","side":"self","location":"a.ts:1","condition":"c9","problem":"p1","action":"a1","reopened":[]}',
  ]);
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

test("repair ends claude and its child and exits 143 on SIGTERM", async () => {
  const f = rejected();
  const before = launchFile(f);
  const result = await signalWhileClaudeWaits(f, ["repair", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  assert.equal(launchFile(f), before);
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
