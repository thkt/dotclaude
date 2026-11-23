/// <reference types="node" />
import assert from "node:assert/strict";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  SCRIPT,
  DONE_GATE,
  ISSUE,
  FEATURE_TITLE,
  ISSUE_REPLY,
  digestOf,
  isolatedEnv,
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
  CLEAN,
  fakeReviewer,
  implemented,
  review,
  callOf,
  flagValue,
  REPAIR_REPLY,
  fakeRepairer,
  repair,
  rejected,
  rewriteLaunch,
  moveBaseToParent,
  lastReview,
  fakeRounds,
  roundCalls,
  IMPLEMENTED,
  REPAIRED,
  prepared,
  CHANGED_BODY,
  pidsIn,
  signalWhileClaudeWaits,
  assertEndedBySignal,
  launchFile,
  agree,
  reread,
  REREAD_REPLY,
  fakeRereader,
  agreedAfterChange,
  accepted,
  continueWork,
  CONTINUE_REPLY,
  fakeContinuer,
  unfinished,
  type ImplementTurn,
  NO_SESSION,
  FINISHED,
  fakeImplementer,
  implementCalls,
  implementAt,
  implementRecordOf,
  interrupted,
  interruptedId,
  holdersOf,
  recordFilesOf,
  holderFile,
  readHolder,
  endWaiting,
  implementWaiting,
  HELD_CALLS,
  killedLaunch,
  publishedReady,
  published,
  TWO_TURNS,
  JOINED_REPLY,
  printing,
} from "./_launch-fixture.ts";

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

test("implement records the agreed issue_digest in launch.json's implement, and review records it in its round", () => {
  const f = implemented();
  assert.equal((launchRecord(worktreeOf(f)) as { implement: Record<string, unknown> }).implement.issue_digest, digestOf(ISSUE_REPLY));
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  assert.equal(lastReview(f).issue_digest, digestOf(ISSUE_REPLY));
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

const UNCHECKED: ImplementTurn = { reply: { session_id: "s-2", result: "finished", total_cost_usd: 0.5, duration_ms: 1200 } };

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

const busyDetail = (pid: number, action: string, at: unknown, worktree: string, file: string): string =>
  `launch.ts ${action} (pid ${pid}, started ${at}) is working on ${worktree}. Wait for it to end, or end it, and call again. Its record is ${file}. Delete the record only when \`ps -p ${pid} -o command=\`, run outside any sandbox, shows a process that is not launch.ts.`;

const leftDetail = (pid: number, action: string, at: unknown, worktree: string, ids: string, file: string): string =>
  `launch.ts ${action} (pid ${pid}, started ${at}) ended and left claude running on ${worktree}. Process group ids still running: ${ids}. A claude that launch.ts ended on a signal is gone within a second, so call again first. If the groups stay, list their processes with \`ps -axo pid,pgid,command\`, run outside any sandbox, end each group that is claude with \`kill -TERM -- -<id>\`, and call again. Its record is ${file}. Delete the record only when ps shows that no process in those groups is claude.`;

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

test("each of the eleven actions called while implement waits stops with busy naming that record, starts no claude, and keeps launch.json and the records", async () => {
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

test("implement ended by SIGTERM leaves its two records, and agree after claude and its child end succeeds and leaves no record", async () => {
  const f = prepared();
  const result = await signalWhileClaudeWaits(f, ["implement", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  assert.equal(recordFilesOf(f).length, 2);
  assert.equal(agree(f).status, 0);
  assert.deepEqual(recordFilesOf(f), []);
});

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
