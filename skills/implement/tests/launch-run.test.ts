/// <reference types="node" />
import assert from "node:assert/strict";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DONE_GATE,
  isolatedEnv,
  git,
  fixture,
  fakeGh,
  fakeClaude,
  SESSION_REPLY,
  PASS_CHECK,
  run,
  outputOf,
  assertStopped,
  worktreeOf,
  launchPathOf,
  shaped,
  CLEAN,
  fakeReviewer,
  implemented,
  review,
  flagValue,
  SELF_REQUIRED,
  REJECTED,
  REPAIR_REPLY,
  EDIT_FILE,
  fakeRepairer,
  repair,
  rejected,
  EARLIER_KEYS,
  judging,
  allStates,
  BOTH_OPEN,
  JUDGING_SCHEMA,
  rewriteLaunch,
  type Turn,
  type Script,
  fakeRounds,
  roundCalls,
  IMPLEMENTED,
  REPAIRED,
  runLaunch,
  prepared,
  CHANGED_BODY,
  fakeHangingClaude,
  pidsIn,
  signalWhileClaudeWaits,
  assertEndedBySignal,
  launchFile,
  agree,
  reread,
  AGREED_DIGEST,
  REREAD_REPLY,
  fakeRereader,
  agreedAfterChange,
  accepted,
  unfinished,
  gateDisabled,
  NO_SESSION,
  FINISHED,
  fakeImplementer,
  implementAt,
  implementRecordOf,
  interrupted,
  interruptedId,
  holdersOf,
  recordFilesOf,
  readHolder,
  startWaiting,
  endWaiting,
} from "./_launch-fixture.ts";

const UNCHANGED: Turn = { reply: { session_id: "s-1", result: "nothing to change", total_cost_usd: 0.25, duration_ms: 900 } };

const judged = (session: string, states: Record<string, string>, findings: Record<string, unknown>[] = []): Turn => ({
  reply: judging(session, states, findings),
});

type RunOut = {
  action: string;
  ok: boolean;
  verdict: string | null;
  required: Record<string, unknown>[];
  rounds: number;
  steps: Record<string, unknown>[];
  cost_usd: number;
  launch_file: string | null;
  reason?: string;
  detail?: string;
};

const runOut = (result: SpawnSyncReturns<string>): RunOut => outputOf(result) as unknown as RunOut;

const actionsOf = (out: RunOut): unknown[] => out.steps.map((step) => step.action);

test("run on a prepared worktree implements, reviews, and completes with accepted round 1 when both reviews find nothing", () => {
  const f = prepared();
  const implemented: Turn = { ...IMPLEMENTED, reply: { session_id: "s-1", result: "run implement reply", total_cost_usd: 0.5, duration_ms: 1200 } };
  fakeRounds(f, { implement: [implemented], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(
    { action: out.action, ok: out.ok, verdict: out.verdict, required: out.required, rounds: out.rounds },
    { action: "run", ok: true, verdict: "accepted", required: [], rounds: 1 },
  );
  assert.deepEqual(Object.keys(out), ["action", "ok", "verdict", "required", "rounds", "steps", "cost_usd", "launch_file"]);
  assert.equal(out.launch_file, launchPathOf(f));
  assert.equal(JSON.parse(readFileSync(String(out.launch_file), "utf8")).implement.reply, "run implement reply");
  assert.deepEqual(out.steps, [
    { action: "implement", ok: true, cost_usd: 0.5, duration_ms: 1200 },
    { action: "review", ok: true, round: 1, verdict: "accepted", required_keys: [], cost_usd: 2 },
  ]);
  assert.equal(out.cost_usd, 2.5);
});

const REJECTED_SCRIPT: Script = {
  implement: [IMPLEMENTED],
  self: [REJECTED.self as Turn],
  independent: [REJECTED.independent as Turn],
};

test("run repairs a rejected round and completes when the next review judges every finding fixed, summing the cost of each step", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, judged("self-2", allStates("fixed"))],
    independent: [REJECTED.independent as Turn, judged("ind-2", allStates("fixed"))],
    repair: [REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.ok, true);
  assert.equal(out.verdict, "accepted");
  assert.equal(out.rounds, 2);
  assert.deepEqual(out.steps, [
    { action: "implement", ok: true, cost_usd: 0.5, duration_ms: 1200 },
    { action: "review", ok: true, round: 1, verdict: "rejected", required_keys: EARLIER_KEYS, cost_usd: 2 },
    { action: "repair", ok: true, round: 1, changed: true, cost_usd: 0.25, duration_ms: 900 },
    { action: "review", ok: true, round: 2, verdict: "accepted", required_keys: [], cost_usd: 2 },
  ]);
  assert.equal(out.cost_usd, 0.5 + 2 + 0.25 + 2);
});

test("run writes one JSON line per action to stderr with the running total, and the last total equals the stdout cost", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, judged("self-2", allStates("fixed"))],
    independent: [REJECTED.independent as Turn, judged("ind-2", allStates("fixed"))],
    repair: [REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  const lines = result.stderr.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  let total = 0;
  assert.deepEqual(
    lines,
    out.steps.map((step) => {
      total += step.cost_usd as number;
      return { ...step, total_cost_usd: total };
    }),
  );
  assert.equal(lines.length, 4);
  assert.equal(lines[lines.length - 1].total_cost_usd, out.cost_usd);
});

test("run stops with disagreement after one repair when the repair changes nothing and the next review keeps the finding open", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, BOTH_OPEN.self as Turn],
    independent: [REJECTED.independent as Turn, BOTH_OPEN.independent as Turn],
    repair: [UNCHANGED, UNCHANGED],
  });
  const out = assertStopped(runLaunch(f), "disagreement") as unknown as RunOut;
  assert.equal(out.action, "run");
  assert.deepEqual(out.required.map((entry) => entry.key), EARLIER_KEYS);
  assert.equal(out.verdict, "rejected");
  assert.equal(out.rounds, 2);
  assert.deepEqual(actionsOf(out), ["implement", "review", "repair", "review"]);
  assert.equal(roundCalls(f).filter((call) => call.role === "repair").length, 1);
});

test("run completes when the repair changes nothing and the next review withdraws every finding", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, judged("self-2", allStates("withdrawn"))],
    independent: [REJECTED.independent as Turn, judged("ind-2", allStates("withdrawn"))],
    repair: [UNCHANGED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.verdict, "accepted");
  assert.deepEqual(actionsOf(out), ["implement", "review", "repair", "review"]);
  assert.equal(out.steps[2].changed, false);
});

test("run repairs again without stopping when the repair changes nothing and the next review withdraws the finding but reports a new one", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [
      REJECTED.self as Turn,
      judged("self-2", allStates("withdrawn"), [SELF_REQUIRED]),
      judged("self-3", { "2-self-1": "fixed" }),
    ],
    independent: [
      REJECTED.independent as Turn,
      judged("ind-2", allStates("withdrawn")),
      judged("ind-3", { "2-self-1": "fixed" }),
    ],
    repair: [UNCHANGED, REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(actionsOf(out), ["implement", "review", "repair", "review", "repair", "review"]);
  assert.deepEqual(out.steps[3].required_keys, ["2-self-1"]);
  assert.equal(out.rounds, 3);
});

test("run stops with not-converging after round 3 when the same finding stays open after two repairs that changed the tree", () => {
  const f = prepared();
  fakeRounds(f, {
    ...REJECTED_SCRIPT,
    self: [REJECTED.self as Turn, BOTH_OPEN.self as Turn, judged("self-3", allStates("open"))],
    independent: [REJECTED.independent as Turn, BOTH_OPEN.independent as Turn, judged("ind-3", allStates("open"))],
    repair: [REPAIRED, REPAIRED, REPAIRED],
  });
  const out = assertStopped(runLaunch(f), "not-converging") as unknown as RunOut;
  assert.deepEqual(actionsOf(out), ["implement", "review", "repair", "review", "repair", "review"]);
  assert.equal(out.rounds, 3);
  assert.deepEqual(out.required.map((entry) => entry.key), EARLIER_KEYS);
});

test("run keeps repairing while each round reports a required finding under a new key, and completes when round 4 accepts", () => {
  const f = prepared();
  const newFinding = (round: number) => ({ ...SELF_REQUIRED, condition: `c${round}` });
  fakeRounds(f, {
    implement: [IMPLEMENTED],
    self: [
      { reply: shaped("self-1", [SELF_REQUIRED]) },
      judged("self-2", { "1-self-1": "fixed" }, [newFinding(2)]),
      judged("self-3", { "2-self-1": "fixed" }, [newFinding(3)]),
      judged("self-4", { "3-self-1": "fixed" }),
    ],
    independent: [
      { reply: shaped("ind-1") },
      judged("ind-2", { "1-self-1": "fixed" }),
      judged("ind-3", { "2-self-1": "fixed" }),
      judged("ind-4", { "3-self-1": "fixed" }),
    ],
    repair: [REPAIRED, REPAIRED, REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.verdict, "accepted");
  assert.equal(out.rounds, 4);
  assert.deepEqual(
    out.steps.filter((step) => step.action === "review").map((step) => step.required_keys),
    [["1-self-1"], ["2-self-1"], ["3-self-1"], []],
  );
});

test("run stops with the reason and detail of an implement that fails, and implement is the last step", () => {
  const f = prepared();
  fakeRounds(f, { implement: [{ exit: 3 }, { exit: 3 }] });
  const out = assertStopped(runLaunch(f), "child-failed") as unknown as RunOut;
  assert.deepEqual(out.steps, [{ action: "implement", ok: false, reason: "child-failed" }]);
  assert.equal(out.verdict, null);
  assert.deepEqual(out.required, []);
  assert.equal(out.rounds, 0);
  assert.equal(out.cost_usd, 0);
  assert.equal(out.launch_file, launchPathOf(f));
  assert.equal(out.detail, outputOf(run(f, ["implement", "--worktree", worktreeOf(f)])).detail);
});

test("run stops with the reason and detail of a review that fails, and review is the last step", () => {
  const f = prepared();
  fakeRounds(f, {
    implement: [IMPLEMENTED],
    self: [{ reply: shaped("self-1") }, { reply: shaped("self-1") }],
    independent: [{ reply: "not json" }, { reply: "not json" }],
  });
  const out = assertStopped(runLaunch(f), "review-failed") as unknown as RunOut;
  assert.deepEqual(out.steps[out.steps.length - 1], { action: "review", ok: false, cost_usd: 1, reason: "review-failed" });
  assert.equal(out.rounds, 0);
  assert.equal(out.detail, outputOf(review(f)).detail);
});

test("run stops with the reason and detail of a repair that ends without passing the check, and repair is the last step", () => {
  const f = prepared();
  fakeRounds(f, { ...REJECTED_SCRIPT, repair: [{ ...REPAIRED, check: false }] });
  const out = assertStopped(runLaunch(f), "not-done") as unknown as RunOut;
  const last = out.steps[out.steps.length - 1];
  assert.deepEqual(last, { action: "repair", ok: false, round: 1, changed: true, cost_usd: 0.25, duration_ms: 900, reason: "not-done" });
  assert.match(String(out.detail), /^done_gate\.ts status is not done: /);
  assert.equal(out.verdict, "rejected");
});

test("run on a worktree whose round 1 was rejected starts with repair", () => {
  const f = rejected();
  fakeRounds(f, {
    self: [judged("self-2", allStates("fixed"))],
    independent: [judged("ind-2", allStates("fixed"))],
    repair: [REPAIRED],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["repair", "review"]);
});

test("run on an accepted worktree completes with no steps and zero cost, and starts no claude", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  fakeRounds(f, {});
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.ok, true);
  assert.equal(out.verdict, "accepted");
  assert.equal(out.rounds, 1);
  assert.deepEqual(out.steps, []);
  assert.equal(out.cost_usd, 0);
  assert.equal(result.stderr, "");
  assert.deepEqual(roundCalls(f), []);
});

test("run starts with review when the tree changed and passed the check after the last review", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  writeFileSync(join(worktreeOf(f), "README.md"), "edited outside run\n");
  const checked = spawnSync(process.execPath, [DONE_GATE, "check"], { cwd: worktreeOf(f), env: isolatedEnv(), encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
  fakeRounds(f, { self: [{ reply: shaped("self-2") }], independent: [{ reply: shaped("ind-2") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(actionsOf(out), ["review"]);
  assert.equal(out.rounds, 2);
});

test("run stops with not-prepared in a worktree that prepare did not set up, and starts no claude", () => {
  const f = fixture();
  fakeRounds(f, { implement: [IMPLEMENTED] });
  const out = assertStopped(run(f, ["run", "--worktree", f.repo]), "not-prepared") as unknown as RunOut;
  assert.deepEqual(out.steps, []);
  assert.equal(out.rounds, 0);
  assert.equal(out.verdict, null);
  assert.equal(out.launch_file, join(git(f.repo, "rev-parse", "--path-format=absolute", "--git-path", "agent-gate"), "launch.json"));
  assert.ok(!existsSync(String(out.launch_file)));
  assert.deepEqual(roundCalls(f), []);
});

test("run stops with not-prepared and a null launch_file when --worktree names a path that does not exist", () => {
  const f = fixture();
  const out = assertStopped(run(f, ["run", "--worktree", join(f.root, "missing")]), "not-prepared") as unknown as RunOut;
  assert.equal(out.launch_file, null);
});

test("run stops with not-prepared and a null launch_file when --worktree names a directory outside any git work tree", () => {
  const f = fixture();
  const out = assertStopped(run(f, ["run", "--worktree", f.logs]), "not-prepared") as unknown as RunOut;
  assert.equal(out.launch_file, null);
});

const ROUND_TRIP_SCRIPT: Script = {
  ...REJECTED_SCRIPT,
  self: [REJECTED.self as Turn, judged("self-2", allStates("fixed"))],
  independent: [REJECTED.independent as Turn, judged("ind-2", allStates("fixed"))],
  repair: [REPAIRED],
};

const ROUND_TRIP_ROLES = ["implement", "independent", "independent", "repair", "self", "self"];

test("run passes --model to every claude it starts", () => {
  const f = prepared();
  fakeRounds(f, ROUND_TRIP_SCRIPT);
  assert.equal(runLaunch(f, "--model", "sonnet").status, 0);
  const calls = roundCalls(f);
  assert.deepEqual(calls.map((call) => call.role).sort(), ROUND_TRIP_ROLES);
  for (const call of calls) assert.equal(flagValue(call.args, "--model"), "sonnet", call.role);
});

test("run passes the --effort level to every claude it starts", () => {
  const f = prepared();
  fakeRounds(f, ROUND_TRIP_SCRIPT);
  assert.equal(runLaunch(f, "--effort", "high").status, 0);
  const calls = roundCalls(f);
  assert.deepEqual(calls.map((call) => call.role).sort(), ROUND_TRIP_ROLES);
  for (const call of calls) assert.equal(flagValue(call.args, "--effort"), "high", call.role);
});

test("run without --effort starts every claude without --effort", () => {
  const f = prepared();
  fakeRounds(f, ROUND_TRIP_SCRIPT);
  assert.equal(runLaunch(f).status, 0);
  const calls = roundCalls(f);
  assert.deepEqual(calls.map((call) => call.role).sort(), ROUND_TRIP_ROLES);
  for (const call of calls) assert.ok(!call.args.includes("--effort"), call.role);
});

test("run with an --effort level outside low, medium, high, xhigh, and max prints the usage, exits 2, and starts no claude", () => {
  const f = prepared();
  fakeRounds(f, ROUND_TRIP_SCRIPT);
  const result = runLaunch(f, "--effort", "fast");
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /^usage: /);
  assert.deepEqual(roundCalls(f), []);
});

test("run calls implement once and stops with no-progress when the implement child returns an empty session_id and exits 0", () => {
  const f = prepared();
  const empty: Turn = { ...IMPLEMENTED, reply: { session_id: "", result: "finished", total_cost_usd: 0.5, duration_ms: 1200 } };
  fakeRounds(f, { implement: [empty, empty, empty] });
  const out = assertStopped(runLaunch(f), "no-progress") as unknown as RunOut;
  assert.deepEqual(out.steps, [{ action: "implement", ok: true, cost_usd: 0.5, duration_ms: 1200 }]);
  assert.match(String(out.detail), /\bimplement\b/);
  assert.deepEqual(roundCalls(f).map((call) => call.role), ["implement"]);
});

test("run on an accepted worktree stops with requirements-changed and no steps when the body changed, and starts no claude", () => {
  const f = implemented();
  fakeReviewer(f, CLEAN);
  assert.equal(review(f).status, 0);
  fakeGh(f, CHANGED_BODY);
  fakeRounds(f, {});
  const out = assertStopped(runLaunch(f), "requirements-changed") as unknown as RunOut;
  assert.equal(out.action, "run");
  assert.deepEqual(out.steps, []);
  assert.equal(out.verdict, "accepted");
  assert.equal(out.rounds, 1);
  assert.deepEqual(roundCalls(f), []);
});

test("run stops at the review after implement with requirements-changed when the body changes while the implement child runs", () => {
  const f = prepared();
  fakeRounds(f, { implement: [{ ...IMPLEMENTED, issue: CHANGED_BODY }], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const out = assertStopped(runLaunch(f), "requirements-changed") as unknown as RunOut;
  assert.deepEqual(actionsOf(out), ["implement", "review"]);
  assert.equal(out.steps[out.steps.length - 1].ok, false);
  assert.equal(out.steps[out.steps.length - 1].reason, "requirements-changed");
  assert.deepEqual(roundCalls(f).map((call) => call.role), ["implement"]);
});

const REREAD_EDITED: Turn = { edit: true, check: true, reply: { session_id: "s-1", result: "reread", total_cost_usd: 0.3, duration_ms: 700 } };

const REREAD_UNCHANGED: Turn = { reply: { session_id: "s-1", result: "reread", total_cost_usd: 0.3, duration_ms: 700 } };

test("run on a worktree whose reread stopped with not-done starts with reread", () => {
  const f = agreedAfterChange();
  fakeRereader(f, EDIT_FILE + REREAD_REPLY);
  assertStopped(reread(f), "not-done");
  fakeRounds(f, { reread: [REREAD_EDITED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["reread", "review"]);
});

test("run starts with reread when implement wrote no issue_digest, and with review when only the current review lacks it", () => {
  const f = implemented();
  rewriteLaunch(f, (stored) => {
    const { issue_digest: _digest, ...implement } = stored.implement as Record<string, unknown>;
    return { ...stored, implement };
  });
  fakeRounds(f, { reread: [REREAD_UNCHANGED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const fromImplement = runLaunch(f);
  assert.equal(fromImplement.status, 0, fromImplement.stderr);
  assert.equal(runOut(fromImplement).steps[0].action, "reread");

  const g = accepted();
  rewriteLaunch(g, (stored) => {
    const reviews = stored.reviews as Record<string, unknown>[];
    const { issue_digest: _digest, ...last } = reviews[reviews.length - 1];
    return { ...stored, reviews: [...reviews.slice(0, -1), last] };
  });
  fakeRounds(g, { self: [{ reply: shaped("self-2") }], independent: [{ reply: shaped("ind-2") }] });
  const fromReview = runLaunch(g);
  assert.equal(fromReview.status, 0, fromReview.stderr);
  assert.deepEqual(actionsOf(runOut(fromReview)), ["review"]);
});

test("run after agree on an accepted worktree rereads, reviews again, and completes, whether or not the reread edits", () => {
  for (const turn of [REREAD_EDITED, REREAD_UNCHANGED]) {
    const label = turn.edit ? "edited" : "unchanged";
    const f = agreedAfterChange(accepted);
    fakeRounds(f, { reread: [turn], self: [{ reply: shaped("self-2") }], independent: [{ reply: shaped("ind-2") }] });
    const result = runLaunch(f);
    assert.equal(result.status, 0, `${label}: ${result.stderr}`);
    const out = runOut(result);
    assert.equal(out.verdict, "accepted", label);
    assert.equal(out.rounds, 2, label);
    assert.deepEqual(actionsOf(out), ["reread", "review"], label);
    assert.deepEqual(out.steps[0], { action: "reread", ok: true, round: 1, changed: turn.edit === true, cost_usd: 0.3, duration_ms: 700 }, label);
    const first = JSON.parse(result.stderr.split("\n")[0]);
    assert.deepEqual(Object.keys(first).sort(), ["action", "changed", "cost_usd", "duration_ms", "ok", "round", "total_cost_usd"], label);
  }
});

test("run after agree on a rejected worktree rereads first and then reviews the earlier findings with the judging schema", () => {
  const f = agreedAfterChange(rejected);
  fakeRounds(f, {
    reread: [REREAD_EDITED],
    self: [judged("self-2", allStates("fixed"))],
    independent: [judged("ind-2", allStates("fixed"))],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["reread", "review"]);
  const self = roundCalls(f).find((call) => call.role === "self");
  assert.ok(self);
  assert.deepEqual(JSON.parse(flagValue(self.args, "--json-schema")), JUDGING_SCHEMA);
});

test("run after agree before implement starts with implement and does not reread", () => {
  const f = agreedAfterChange(prepared);
  fakeRounds(f, { implement: [IMPLEMENTED], reread: [REREAD_UNCHANGED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["implement", "review"]);
  assert.ok(!roundCalls(f).some((call) => call.role === "reread"));
});

test("run without agree after the body changed stops with requirements-changed and starts no claude on an accepted or a rejected worktree", () => {
  for (const [label, arrange] of [
    ["accepted", accepted],
    ["rejected", rejected],
  ] as const) {
    const f = arrange();
    fakeGh(f, CHANGED_BODY);
    fakeRounds(f, { reread: [REREAD_UNCHANGED], repair: [REPAIRED] });
    assertStopped(runLaunch(f), "requirements-changed");
    assert.deepEqual(roundCalls(f), [], label);
  }
});

test("run stops with the reason and detail of a reread that fails, and reread is the last step", () => {
  const f = agreedAfterChange();
  fakeRounds(f, { reread: [{ exit: 3 }, { exit: 3 }] });
  const out = assertStopped(runLaunch(f), "child-failed") as unknown as RunOut;
  assert.equal(out.steps[out.steps.length - 1].action, "reread");
  assert.equal(out.detail, outputOf(reread(f)).detail);
});

const CONTINUED: Turn = { check: true, reply: { session_id: "s-1", result: "continued", total_cost_usd: 0.4, duration_ms: 800 } };

const CONTINUED_UNCHECKED: Turn = { reply: { session_id: "s-1", result: "continued", total_cost_usd: 0.4, duration_ms: 800 } };

test("run on a worktree whose implement stopped with not-done continues, reviews, and completes", () => {
  const f = unfinished();
  fakeRounds(f, { continue: [CONTINUED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.verdict, "accepted");
  assert.deepEqual(actionsOf(out), ["continue", "review"]);
  assert.deepEqual(out.steps[0], { action: "continue", ok: true, round: 1, changed: false, cost_usd: 0.4, duration_ms: 800 });
  const first = JSON.parse(result.stderr.split("\n")[0]);
  assert.deepEqual(Object.keys(first).sort(), ["action", "changed", "cost_usd", "duration_ms", "ok", "round", "total_cost_usd"]);
  assert.equal(first.total_cost_usd, 0.4);
});

test("run on a worktree whose repair stopped with not-done continues and then reviews the earlier findings with the judging schema", () => {
  const f = rejected();
  fakeRepairer(f, EDIT_FILE + REPAIR_REPLY);
  assertStopped(repair(f), "not-done");
  fakeRounds(f, {
    continue: [CONTINUED],
    self: [judged("self-2", allStates("fixed"))],
    independent: [judged("ind-2", allStates("fixed"))],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["continue", "review"]);
  const self = roundCalls(f).find((call) => call.role === "self");
  assert.ok(self);
  assert.deepEqual(JSON.parse(flagValue(self.args, "--json-schema")), JUDGING_SCHEMA);
});

test("run on a worktree whose repair child edited a file and then failed continues and then reviews", () => {
  const f = rejected();
  fakeRepairer(f, `${EDIT_FILE}exit 3\n`);
  assertStopped(repair(f), "child-failed");
  fakeRounds(f, {
    continue: [CONTINUED],
    self: [judged("self-2", allStates("fixed"))],
    independent: [judged("ind-2", allStates("fixed"))],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["continue", "review"]);
});

test("run on an accepted worktree edited outside run without a check starts with continue", () => {
  const f = accepted();
  writeFileSync(join(worktreeOf(f), "README.md"), "edited outside run\n");
  fakeRounds(f, { continue: [CONTINUED], self: [{ reply: shaped("self-2") }], independent: [{ reply: shaped("ind-2") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(runOut(result).steps[0].action, "continue");
});

test("run on an accepted worktree with an unchanged tree completes without starting claude after the gate is disabled", () => {
  const f = accepted();
  gateDisabled(f);
  fakeRounds(f, { continue: [CONTINUED] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.equal(out.ok, true);
  assert.deepEqual(out.steps, []);
  assert.deepEqual(roundCalls(f), []);
});

test("run after agree on a worktree whose check has not passed starts with reread and does not continue", () => {
  const f = agreedAfterChange(unfinished);
  fakeRounds(f, {
    reread: [REREAD_EDITED],
    continue: [CONTINUED],
    self: [{ reply: shaped("self-1") }],
    independent: [{ reply: shaped("ind-1") }],
  });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["reread", "review"]);
  assert.ok(!roundCalls(f).some((call) => call.role === "continue"));
});

test("run stops with not-done after a continue that edits nothing and passes no check, and a second run stops with not-done and starts no claude", () => {
  const f = unfinished();
  fakeRounds(f, { continue: [CONTINUED_UNCHECKED, CONTINUED_UNCHECKED] });
  const first = assertStopped(runLaunch(f), "not-done") as unknown as RunOut;
  assert.deepEqual(actionsOf(first), ["continue"]);
  assert.equal(roundCalls(f).length, 1);
  const before = launchFile(f);
  const second = assertStopped(runLaunch(f), "not-done") as unknown as RunOut;
  assert.deepEqual(second.steps, []);
  assert.match(String(second.detail), /continue round 1\b/);
  assert.equal(roundCalls(f).length, 1);
  assert.equal(launchFile(f), before);
});

test("run starts with continue when the last continue ended with done false and the tree was edited outside run since", () => {
  const f = unfinished();
  fakeRounds(f, { continue: [CONTINUED_UNCHECKED, CONTINUED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  assertStopped(runLaunch(f), "not-done");
  writeFileSync(join(worktreeOf(f), "README.md"), "edited outside run\n");
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(actionsOf(out), ["continue", "review"]);
  assert.equal(out.steps[0].round, 2);
});

test("run on an unfinished worktree whose Issue changed and was agreed resumes implement and then rereads", () => {
  const f = interrupted();
  fakeGh(f, CHANGED_BODY);
  assert.equal(agree(f).status, 0);
  fakeRounds(f, { implement: [IMPLEMENTED], reread: [REREAD_UNCHANGED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const out = runOut(runLaunch(f));
  assert.deepEqual(actionsOf(out).slice(0, 2), ["implement", "reread"]);
  assert.ok(roundCalls(f)[0].args.includes("--resume"));
});

test("a new session started for a missing session after an agreed Issue change records the agreed digest, and run then reviews without rereading", () => {
  const f = interrupted();
  fakeGh(f, CHANGED_BODY);
  assert.equal(agree(f).status, 0);
  fakeImplementer(f, [{ exit: 1, stderr: NO_SESSION(interruptedId(f)) }, FINISHED]);
  assert.equal(implementAt(f).status, 0);
  assert.equal(implementRecordOf(f).issue_digest, AGREED_DIGEST);
  fakeRounds(f, { self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(actionsOf(runOut(result)), ["review"]);
});

test("run on an unfinished worktree resumes implement, reviews, and completes, with resumed true in the implement step and its stderr line", () => {
  const f = interrupted();
  const id = interruptedId(f);
  fakeRounds(f, { implement: [IMPLEMENTED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const result = runLaunch(f);
  assert.equal(result.status, 0, result.stderr);
  const out = runOut(result);
  assert.deepEqual(actionsOf(out), ["implement", "review"]);
  assert.equal(out.steps[0].resumed, true);
  assert.equal(JSON.parse(result.stderr.split("\n")[0]).resumed, true);
  assert.equal(flagValue(roundCalls(f)[0].args, "--resume"), id);
});

test("run stopped by SIGTERM while implement waits resumes the same session on the next run", async () => {
  const f = prepared();
  const result = await signalWhileClaudeWaits(f, ["run", "--worktree", worktreeOf(f)], "SIGTERM", 1);
  assertEndedBySignal(result, 1);
  const first = readFileSync(join(f.logs, "hanging-args"), "utf8").split("\n");
  fakeRounds(f, { implement: [IMPLEMENTED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  const again = runLaunch(f);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(runOut(again).steps[0].resumed, true);
  assert.equal(flagValue(roundCalls(f)[0].args, "--resume"), flagValue(first, "--session-id"));
});

test("while run waits for the implement claude, its record has action run and holds that claude's pid, and agree stops with busy naming run", async () => {
  const f = prepared();
  fakeHangingClaude(f);
  const waiting = await startWaiting(f, ["run", "--worktree", worktreeOf(f)]);
  try {
    assert.equal((readHolder(f, waiting.pid) as Record<string, unknown>).action, "run");
    assert.deepEqual(readHolder(f, waiting.pid, ".children"), pidsIn(f, "hanging-claude-pids"));
    assert.deepEqual(recordFilesOf(f), [`${waiting.pid}.children.json`, `${waiting.pid}.json`].sort());
    const out = assertStopped(agree(f), "busy");
    assert.equal((out.holder as Record<string, unknown>).action, "run");
  } finally {
    endWaiting(f, waiting);
  }
});

test("while run waits for the two review claudes after implement, its children record holds those two pids and not the implement claude's", async () => {
  const f = prepared();
  writeFileSync(
    join(f.bin, "claude"),
    `#!/bin/sh
prompt=$(cat)
case "$prompt" in
  "Implement GitHub Issue"*)
    echo $$ > "$LOGS/implement-pid"
    "$NODE" "$DONE_GATE" check >&2
    echo '{"type":"result","session_id":"s-1","result":"finished","total_cost_usd":0.5,"duration_ms":1200}'
    exit 0;;
esac
echo $$ >> "$LOGS/hanging-claude-pids"
sleep 60 &
echo $! >> "$LOGS/hanging-sleep-pids"
wait
`,
    { mode: 0o755 },
  );
  const waiting = await startWaiting(f, ["run", "--worktree", worktreeOf(f)], 2);
  try {
    const children = readHolder(f, waiting.pid, ".children") as number[];
    assert.deepEqual([...children].sort(), [...pidsIn(f, "hanging-claude-pids")].sort());
    assert.equal(children.length, 2);
    assert.ok(!children.includes(pidsIn(f, "implement-pid")[0]));
  } finally {
    endWaiting(f, waiting);
  }
});

test("no record is left after an action succeeds, an action stops, run completes, or agree ends", () => {
  const succeeded = prepared();
  fakeClaude(succeeded, PASS_CHECK + SESSION_REPLY);
  assert.equal(run(succeeded, ["implement", "--worktree", worktreeOf(succeeded)]).status, 0);
  assert.deepEqual(recordFilesOf(succeeded), []);

  const stoppedOne = prepared();
  assertStopped(review(stoppedOne), "not-implemented");
  assert.deepEqual(recordFilesOf(stoppedOne), []);

  const completed = prepared();
  fakeRounds(completed, { implement: [IMPLEMENTED], self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] });
  assert.equal(runLaunch(completed).status, 0);
  assert.deepEqual(recordFilesOf(completed), []);

  const agreed = prepared();
  assert.equal(agree(agreed).status, 0);
  assert.deepEqual(recordFilesOf(agreed), []);
  assert.ok(existsSync(holdersOf(agreed)));
});
