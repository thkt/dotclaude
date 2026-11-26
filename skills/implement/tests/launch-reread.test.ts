/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DONE_GATE,
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
  moveBaseToParent,
  prepared,
  CHANGED_BODY,
  launchFile,
  reread,
  AGREED_DIGEST,
  REREAD_REPLY,
  fakeRereader,
  agreedAfterChange,
  assertIncludesAll,
  assertIssueInPrompt,
} from "./_launch-fixture.ts";

const assertRereadPrompt = (stdin: string, base: string): void => {
  assertIncludesAll(stdin, ["changed after you last read it", "#42", "owner/repo", `git diff ${base}`, `\`${DONE_GATE} check\``, `\`${DONE_GATE} status\``]);
  assertIssueInPrompt(stdin, CHANGED_BODY);
};

const rereadCalls = (f: Fixture): number =>
  existsSync(join(f.logs, "reread-calls")) ? readFileSync(join(f.logs, "reread-calls"), "utf8").split("\n").filter(Boolean).length : 0;

test("reread after agree resumes the implement session without a fork in the worktree and passes the full prompt on stdin", () => {
  const f = agreedAfterChange();
  fakeRereader(f, PASS_CHECK + REREAD_REPLY);
  const result = reread(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(f.logs, "reread-cwd"), "utf8").trim(), realpathSync(worktreeOf(f)));
  const args = readFileSync(join(f.logs, "reread-args"), "utf8").split("\n");
  assert.equal(flagValue(args, "--resume"), "s-1");
  assert.ok(!args.includes("--fork-session"));
  assert.ok(!args.includes("--json-schema"));
  assert.equal(flagValue(args, "--model"), "opus");
  assertRereadPrompt(readFileSync(join(f.logs, "reread-stdin"), "utf8"), baseOf(f));
});

test("reread gives claude the base commit that launch.json records, not HEAD or origin's main", () => {
  const f = agreedAfterChange();
  const base = moveBaseToParent(f);
  fakeRereader(f, PASS_CHECK + REREAD_REPLY);
  assert.equal(reread(f).status, 0);
  assertRereadPrompt(readFileSync(join(f.logs, "reread-stdin"), "utf8"), base);
});

test("reread passes --model to claude", () => {
  const f = agreedAfterChange();
  fakeRereader(f, REREAD_REPLY);
  assert.equal(reread(f, "--model", "sonnet").status, 0);
  assert.equal(flagValue(readFileSync(join(f.logs, "reread-args"), "utf8").split("\n"), "--model"), "sonnet");
});

test("reread appends round 1 to rereads and reports it, with changed true when the child edits and false when it does not", () => {
  const cases: [string, string, boolean][] = [
    ["edits", EDIT_FILE + PASS_CHECK + REREAD_REPLY, true],
    ["no edit", REREAD_REPLY, false],
  ];
  for (const [label, body, changed] of cases) {
    const f = agreedAfterChange();
    const before = launchRecord(worktreeOf(f)) as Record<string, unknown> & { implement: Record<string, unknown> };
    fakeRereader(f, body);
    const result = reread(f);
    assert.equal(result.status, 0, result.stderr);
    const out = outputOf(result);
    assert.deepEqual(
      out,
      {
        action: "reread",
        ok: true,
        round: 1,
        session_id: "s-1",
        tree: out.tree,
        changed,
        issue_digest: AGREED_DIGEST,
        result: "reread",
        cost_usd: 0.3,
        duration_ms: 700,
      },
      label,
    );
    assert.equal(out.tree === before.implement.tree, !changed, label);
    const { rereads, ...rest } = launchRecord(worktreeOf(f)) as Record<string, unknown> & { rereads: Record<string, unknown>[] };
    assert.deepEqual(rest, before, label);
    assert.ok(!Number.isNaN(Date.parse(String(rereads[0]?.at))), label);
    assert.deepEqual(
      rereads,
      [{ round: 1, session_id: "s-1", tree: out.tree, changed, issue_digest: AGREED_DIGEST, reply: "reread", at: rereads[0].at }],
      label,
    );
  }
});

test("reread stops with nothing-to-reread and starts no claude when the session read the agreed version, also right after a reread", () => {
  const f = implemented();
  fakeRereader(f, REREAD_REPLY);
  assertStopped(reread(f), "nothing-to-reread");
  assert.equal(rereadCalls(f), 0);

  const g = agreedAfterChange();
  fakeRereader(g, REREAD_REPLY);
  assert.equal(reread(g).status, 0);
  const before = launchFile(g);
  const out = assertStopped(reread(g), "nothing-to-reread");
  assert.equal(out.action, "reread");
  assert.equal(rereadCalls(g), 1);
  assert.equal(launchFile(g), before);
});

test("reread stops with requirements-changed and starts no claude when the Issue changed again after agree", () => {
  const f = agreedAfterChange();
  const before = launchFile(f);
  fakeGh(f, { ...CHANGED_BODY, body: "changed once more" });
  fakeRereader(f, REREAD_REPLY);
  const out = assertStopped(reread(f), "requirements-changed");
  assert.equal(out.detail, "The title, body, or state of Issue #42 of owner/repo changed after the agreed version was recorded.");
  assert.equal(rereadCalls(f), 0);
  assert.equal(launchFile(f), before);
});

test("reread stops with not-prepared, not-implemented, issue-unreadable, child-failed, or not-done and leaves launch.json as it was", () => {
  const unprepared = fixture();
  fakeRereader(unprepared, REREAD_REPLY);
  assertStopped(run(unprepared, ["reread", "--worktree", unprepared.repo]), "not-prepared");
  assert.equal(rereadCalls(unprepared), 0);

  const cases: [string, () => Fixture, string][] = [
    ["not-implemented", () => agreedAfterChange(prepared), REREAD_REPLY],
    [
      "issue-unreadable",
      () => {
        const f = agreedAfterChange();
        fakeGh(f, null);
        return f;
      },
      REREAD_REPLY,
    ],
    ["child-failed", agreedAfterChange, `${REREAD_REPLY}exit 3\n`],
    ["child-failed", agreedAfterChange, "echo 'not json'\n"],
    ["child-failed", agreedAfterChange, `echo '{"type":"result","result":"reread"}'\n`],
    ["not-done", agreedAfterChange, EDIT_FILE + REREAD_REPLY],
  ];
  for (const [reason, arrange, body] of cases) {
    const f = arrange();
    const before = launchFile(f);
    fakeRereader(f, body);
    const out = assertStopped(reread(f), reason);
    assert.equal(out.action, "reread", reason);
    assert.equal(launchFile(f), before, reason);
    if (reason === "not-done") {
      assert.deepEqual(Object.keys(out).sort(), [
        "action",
        "changed",
        "cost_usd",
        "detail",
        "duration_ms",
        "issue_digest",
        "ok",
        "reason",
        "result",
        "round",
        "session_id",
        "tree",
      ]);
      assert.equal(out.changed, true);
      assert.equal(out.round, 1);
      assert.equal(out.issue_digest, AGREED_DIGEST);
    }
  }
});
