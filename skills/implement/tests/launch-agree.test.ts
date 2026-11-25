/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  ISSUE,
  FEATURE_TITLE,
  ISSUE_REPLY,
  digestOf,
  fixture,
  fakeGh,
  run,
  outputOf,
  assertStopped,
  worktreeOf,
  launchRecord,
  implemented,
  fakeRounds,
  roundCalls,
  prepared,
  CHANGED_BODY,
  pidsIn,
  waitFor,
  launchFile,
  agree,
  AGREED_DIGEST,
  recordFilesOf,
  groupRunning,
  endWaiting,
  implementWaiting,
  killedLaunch,
} from "./_launch-fixture.ts";

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

test("the usage printed for a call with no arguments has the agree and reread lines", () => {
  const result = run(fixture(), []);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes("launch.ts agree --worktree <abs path>\n"), result.stderr);
  assert.ok(result.stderr.includes("launch.ts reread --worktree <abs path> [--model <name>] [--effort <level>]\n"), result.stderr);
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
