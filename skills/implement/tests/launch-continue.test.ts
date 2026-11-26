/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DONE_GATE,
  ISSUE_REPLY,
  type Fixture,
  fixture,
  fakeGh,
  PASS_CHECK,
  run,
  outputOf,
  assertStopped,
  worktreeOf,
  baseOf,
  launchRecord,
  implemented,
  flagValue,
  EDIT_FILE,
  rewriteLaunch,
  moveBaseToParent,
  prepared,
  CHANGED_BODY,
  signalWhileClaudeWaits,
  assertEndedBySignal,
  launchFile,
  continueWork,
  CONTINUE_REPLY,
  fakeContinuer,
  unfinished,
  gateDisabled,
  type Continued,
  assertIncludesAll,
} from "./_launch-fixture.ts";

const assertContinuePrompt = (stdin: string, base: string): void =>
  assertIncludesAll(stdin, ["does not print", "#42", "owner/repo", `git diff ${base}`, `\`${DONE_GATE} check\``, `\`${DONE_GATE} status\``]);

const continueCalls = (f: Fixture): number =>
  existsSync(join(f.logs, "continue-calls")) ? readFileSync(join(f.logs, "continue-calls"), "utf8").split("\n").filter(Boolean).length : 0;

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
  assertContinuePrompt(readFileSync(join(f.logs, "continue-stdin"), "utf8"), baseOf(f));
});

test("continue gives claude the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = unfinished();
  const base = moveBaseToParent(f);
  fakeContinuer(f, PASS_CHECK + CONTINUE_REPLY);
  assert.equal(continueWork(f).status, 0);
  assertContinuePrompt(readFileSync(join(f.logs, "continue-stdin"), "utf8"), base);
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
  assert.ok(bare.stderr.includes("launch.ts continue --worktree <abs path> [--model <name>] [--effort <level>]\n"), bare.stderr);
  for (const args of [["continue"], ["continue", "--model", "opus"], ["continue", "--worktree", "relative/worktree"]]) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
});
