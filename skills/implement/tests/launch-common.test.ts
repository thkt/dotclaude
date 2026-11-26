/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  SCRIPT,
  ISSUE,
  git,
  fixture,
  run,
  prepare,
  outputOf,
  assertStopped,
  worktreeOf,
  fakeReviewer,
  SELF_REQUIRED,
  SELF_OPTIONAL,
  rejected,
  EARLIER_KEYS,
  judging,
  allStates,
  BOTH_OPEN,
  reviewOut,
  lastReview,
  REQUIRED_FIELDS,
  prepared,
  pidsIn,
  isRunning,
  waitFor,
  launchFile,
  agree,
  FINISHED,
  fakeImplementer,
  implementCalls,
  implementAt,
  holdersOf,
  recordFilesOf,
  holderFile,
  groupRunning,
  endWaiting,
  HELD_CALLS,
  killedLaunch,
  type Fixture,
  implemented,
  agreedAfterChange,
  unfinished,
  signalWhileClaudeWaits,
  assertEndedBySignal,
} from "./_launch-fixture.ts";

test("the script runs as a command", () => {
  accessSync(SCRIPT, constants.X_OK);
});

test("--description replaces the words taken from the title in the branch name", () => {
  const f = fixture();
  const result = prepare(f, "--description", "a-b");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).branch, `feat/${ISSUE}-a-b`);
});

test("--gate-mode enforce turns the gate on in enforce mode", () => {
  const f = fixture();
  const result = prepare(f, "--gate-mode", "enforce");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(outputOf(result).gate_mode, "enforce");
  const dir = git(worktreeOf(f), "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  assert.equal(JSON.parse(readFileSync(join(dir, "config.json"), "utf8")).mode, "enforce");
});

test("a call the script cannot read prints the usage and nothing on stdout, and exits 2", () => {
  const f = fixture();
  const calls = [
    [],
    ["prepare"],
    ["prepare", "--issue", String(ISSUE)],
    ["prepare", "--repo", "relative/repo", "--issue", String(ISSUE)],
    ["prepare", "--repo", f.repo, "--issue", "x"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--description", "A_B"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--description", "one"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--description", "a-b-c-d-e"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--gate-mode", "off"],
    ["implement"],
    ["implement", "--worktree", "relative/worktree"],
    ["review"],
    ["review", "--model", "opus"],
    ["review", "--worktree", "relative/worktree"],
    ["launch", "--repo", f.repo],
    ["agree"],
    ["agree", "--worktree", "relative/worktree"],
    ["agree", "--worktree", worktreeOf(f), "--model", "opus"],
    ["reread"],
    ["reread", "--model", "opus"],
    ["reread", "--worktree", "relative/worktree"],
    ["repair"],
    ["repair", "--model", "opus"],
    ["repair", "--worktree", "relative/worktree"],
    ["continue"],
    ["continue", "--model", "opus"],
    ["continue", "--worktree", "relative/worktree"],
    ["run"],
    ["run", "--model", "opus"],
    ["run", "--worktree", "relative/worktree"],
    ["body"],
    ["body", "--worktree", "relative/worktree"],
    ["body", "--worktree", worktreeOf(f), "--model", "opus"],
    ["publish"],
    ["publish", "--worktree", "relative/worktree"],
    ["publish", "--worktree", worktreeOf(f), "--model", "opus"],
    ["published"],
    ["published", "--worktree", "relative/worktree"],
    ["published", "--worktree", worktreeOf(f), "--model", "opus"],
    ["publishable"],
    ["publishable", "--worktree", "relative/worktree"],
    ["publishable", "--worktree", worktreeOf(f), "--model", "opus"],
  ];
  for (const args of calls) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
  assert.ok(!existsSync(worktreeOf(f)));
});

interface SignalRow {
  action: string;
  arrange: () => Fixture;
  claudes: number;
  signals: NodeJS.Signals[];
  keeps: (f: Fixture, before: string) => void;
}

const keepsLaunchFile = (f: Fixture, before: string): void => assert.equal(launchFile(f), before);

const keepsImplementStart = (f: Fixture, before: string): void => {
  const earlier = JSON.parse(before);
  const after = JSON.parse(launchFile(f));
  const args = readFileSync(join(f.logs, "hanging-args"), "utf8").split("\n");
  assert.equal(typeof after.implement.started_at, "string");
  assert.deepEqual(after, {
    ...earlier,
    implement: { session_id: args[args.indexOf("--session-id") + 1], issue_digest: earlier.issue_digest, started_at: after.implement.started_at },
  });
};

const SIGNAL_ROWS: SignalRow[] = [
  { action: "implement", arrange: prepared, claudes: 1, signals: ["SIGTERM", "SIGINT", "SIGHUP"], keeps: keepsImplementStart },
  { action: "reread", arrange: () => agreedAfterChange(), claudes: 1, signals: ["SIGTERM"], keeps: keepsLaunchFile },
  { action: "review", arrange: () => implemented(), claudes: 2, signals: ["SIGTERM"], keeps: keepsLaunchFile },
  { action: "repair", arrange: rejected, claudes: 1, signals: ["SIGTERM"], keeps: keepsLaunchFile },
  { action: "continue", arrange: unfinished, claudes: 1, signals: ["SIGTERM"], keeps: keepsLaunchFile },
  { action: "run", arrange: prepared, claudes: 1, signals: ["SIGTERM"], keeps: (f) => assert.equal(pidsIn(f, "hanging-claude-pids").length, 1) },
];

test("an action ended by a signal while its claude waits ends every claude and its child, exits 143, prints nothing, and keeps its record", async (t) => {
  for (const { action, arrange, claudes, signals, keeps } of SIGNAL_ROWS)
    for (const signal of signals)
      await t.test(`${action} on ${signal}`, async () => {
        const f = arrange();
        const before = launchFile(f);
        const result = await signalWhileClaudeWaits(f, [action, "--worktree", worktreeOf(f)], signal, claudes);
        assertEndedBySignal(result, claudes);
        keeps(f, before);
      });
});

test("an earlier finding that only independent judges open stays required under its key with independent's reason, and only independent is rejected", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", allStates("fixed")) },
    independent: { reply: judging("ind-2", { "1-self-1": "open", "1-independent-1": "fixed" }) },
  });
  const out = reviewOut(f);
  const expected = [
    {
      key: "1-self-1",
      side: "self",
      location: "a.ts:1",
      condition: "c1",
      problem: "p1",
      action: "a1",
      reopened: [{ side: "independent", reason: "ind-2 saw 1-self-1 open" }],
    },
  ];
  assert.deepEqual(out.required, expected);
  assert.deepEqual(Object.keys(out.required[0]), REQUIRED_FIELDS);
  assert.equal(out.verdict, "rejected");
  assert.equal(out.reviews.self.verdict, "accepted");
  assert.equal(out.reviews.independent.verdict, "rejected");
  const record = lastReview(f) as Record<string, unknown> & { required: unknown[]; self: { previous: unknown[] }; independent: { previous: unknown[] } };
  assert.deepEqual(record.required, expected);
  assert.equal(record.verdict, "rejected");
  assert.deepEqual(record.self.previous, (judging("self-2", allStates("fixed")).structured_output as { previous: unknown[] }).previous);
  assert.deepEqual(out.reviews.independent.previous, record.independent.previous);
  assert.equal(record.independent.previous.length, 2);
});

test("an earlier finding that both reviews judge open lists self then independent in reopened", () => {
  const f = rejected();
  fakeReviewer(f, BOTH_OPEN);
  const out = reviewOut(f);
  assert.deepEqual(out.required.map((entry) => entry.key), EARLIER_KEYS);
  assert.deepEqual(out.required[0].reopened, [
    { side: "self", reason: "self-2 saw 1-self-1 open" },
    { side: "independent", reason: "ind-2 saw 1-self-1 open" },
  ]);
});

test("an earlier finding judged withdrawn does not stay required", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", { "1-self-1": "withdrawn", "1-independent-1": "fixed" }) },
    independent: { reply: judging("ind-2", { "1-self-1": "withdrawn", "1-independent-1": "fixed" }) },
  });
  const out = reviewOut(f);
  assert.deepEqual(out.required, []);
  assert.equal(out.verdict, "accepted");
});

test("in round 2 the earlier finding still open comes before the new required finding 2-self-1", () => {
  const f = rejected();
  fakeReviewer(f, {
    self: { reply: judging("self-2", { "1-self-1": "fixed", "1-independent-1": "open" }, [SELF_OPTIONAL, { ...SELF_REQUIRED, condition: "c9" }]) },
    independent: { reply: judging("ind-2", allStates("fixed")) },
  });
  const out = reviewOut(f);
  assert.deepEqual(out.required.map((entry) => entry.key), ["1-independent-1", "2-self-1"]);
  assert.deepEqual(out.required[1], {
    key: "2-self-1",
    side: "self",
    location: "a.ts:1",
    condition: "c9",
    problem: "p1",
    action: "a1",
    reopened: [],
  });
});

test("--fresh twice, --fresh with a value, or --fresh on another action prints the usage and nothing on stdout, and exits 2", () => {
  const f = prepared();
  const w = worktreeOf(f);
  const calls = [
    ["implement", "--worktree", w, "--fresh", "--fresh"],
    ["implement", "--worktree", w, "--fresh", "yes"],
    ["review", "--worktree", w, "--fresh"],
    ["repair", "--worktree", w, "--fresh"],
    ["agree", "--worktree", w, "--fresh"],
    ["reread", "--worktree", w, "--fresh"],
    ["continue", "--worktree", w, "--fresh"],
    ["run", "--worktree", w, "--fresh"],
    ["prepare", "--repo", f.repo, "--issue", String(ISSUE), "--fresh"],
  ];
  fakeImplementer(f, []);
  for (const args of calls) {
    const result = run(f, args);
    assert.equal(result.status, 2, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^usage: /, args.join(" "));
  }
  assert.deepEqual(implementCalls(f), []);
  assert.ok(run(f, []).stderr.includes("launch.ts implement --worktree <abs path> [--model <name>] [--effort <level>] [--fresh]\n"));
});

const deadPid = (): number => spawnSync("true").pid as number;

const unreadableDetail = (file: string, worktree: string): string =>
  `The record ${file} of a launch.ts working on ${worktree} cannot be read. Confirm with \`ps -axo pid,pgid,command\`, run outside any sandbox, that no launch.ts and no claude it started is running on ${worktree}. Then delete ${file} and call again.`;

test("after launch.ts is killed and then its claude process alone ends while the child in its group runs, an action stops with claude-left-running", async () => {
  const f = prepared();
  const waiting = await killedLaunch(f);
  try {
    const [claude] = pidsIn(f, "hanging-claude-pids");
    process.kill(claude, "SIGKILL");
    assert.ok(await waitFor(() => !isRunning(claude), 5_000));
    assert.ok(groupRunning(claude));
    assertStopped(agree(f), "claude-left-running");
  } finally {
    endWaiting(f, waiting);
  }
});

test("a record of an ended process, with no children record or an empty one, lets the action return its result and is removed", () => {
  for (const children of [null, []]) {
    const f = prepared();
    const pid = deadPid();
    mkdirSync(holdersOf(f), { recursive: true });
    writeFileSync(holderFile(f, pid), JSON.stringify({ pid, action: "implement", at: "2026-11-21T00:00:00.000Z" }));
    if (children !== null) writeFileSync(holderFile(f, pid, ".children"), JSON.stringify(children));
    const result = agree(f);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(outputOf(result).action, "agree");
    assert.deepEqual(recordFilesOf(f), [], String(children));
  }
});

test("with a killed launch.ts's record and a record of a running process, the action stops with busy naming the running one", async () => {
  const f = prepared();
  const waiting = await killedLaunch(f);
  try {
    writeFileSync(holderFile(f, process.pid), JSON.stringify({ pid: process.pid, action: "review", at: "2026-11-21T00:00:00.000Z" }));
    const out = assertStopped(agree(f), "busy");
    assert.equal((out.holder as Record<string, unknown>).pid, process.pid);
  } finally {
    rmSync(holderFile(f, process.pid), { force: true });
    endWaiting(f, waiting);
  }
});

test("a record of an ended process that is not JSON, names another pid, or lacks action stops the action with holder-unreadable naming that file, which is kept", () => {
  const contents = (pid: number): string[] => [
    "not json",
    JSON.stringify({ pid: pid + 1, action: "implement", at: "2026-11-21T00:00:00.000Z" }),
    JSON.stringify({ pid, at: "2026-11-21T00:00:00.000Z" }),
  ];
  for (const index of [0, 1, 2]) {
    const f = prepared();
    const pid = deadPid();
    mkdirSync(holdersOf(f), { recursive: true });
    const file = holderFile(f, pid);
    writeFileSync(file, contents(pid)[index]);
    const out = assertStopped(agree(f), "holder-unreadable");
    assert.equal(out.detail, unreadableDetail(file, worktreeOf(f)), String(index));
    assert.deepEqual(out.holder, { file }, String(index));
    assert.ok(existsSync(file), String(index));
  }
});

test("a children record of an ended process that is not an array stops the action with holder-unreadable naming the children file", () => {
  const f = prepared();
  const pid = deadPid();
  mkdirSync(holdersOf(f), { recursive: true });
  writeFileSync(holderFile(f, pid), JSON.stringify({ pid, action: "implement", at: "2026-11-21T00:00:00.000Z" }));
  writeFileSync(holderFile(f, pid, ".children"), JSON.stringify({ pid }));
  const out = assertStopped(agree(f), "holder-unreadable");
  assert.deepEqual(out.holder, { file: holderFile(f, pid, ".children") });
});

test("files in launch-holders whose names are not records are neither read nor removed, and the action returns its result", () => {
  const f = prepared();
  mkdirSync(holdersOf(f), { recursive: true });
  for (const name of ["notes.txt", "1.json.tmp"]) writeFileSync(join(holdersOf(f), name), "not json");
  assert.equal(agree(f).status, 0);
  for (const name of ["notes.txt", "1.json.tmp"]) assert.ok(existsSync(join(holdersOf(f), name)), name);
});

test("a file named launch-holders that is not a directory stops the action with holder-write-failed and no holder, starting no claude and keeping launch.json", () => {
  const f = prepared();
  writeFileSync(holdersOf(f), "not a directory");
  fakeImplementer(f, [FINISHED]);
  const text = launchFile(f);
  const out = assertStopped(implementAt(f), "holder-write-failed");
  assert.ok(String(out.detail).startsWith(`launch.ts could not write its record under ${holdersOf(f)}: `), String(out.detail));
  assert.ok(!("holder" in out));
  assert.deepEqual(implementCalls(f), []);
  assert.equal(launchFile(f), text);
});

test("an action on a repo with no record directory stops with not-prepared and creates no directory", () => {
  const f = fixture();
  const gateDir = git(f.repo, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate");
  for (const action of HELD_CALLS) assertStopped(run(f, [action, "--worktree", f.repo]), "not-prepared");
  assert.ok(!existsSync(gateDir));
});
