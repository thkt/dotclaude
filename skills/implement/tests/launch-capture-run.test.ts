/// <reference types="node" />
import assert from "node:assert/strict";
import type { SpawnSyncReturns } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { treeHash } from "../../../hooks/_lib/gate_record.ts";
import {
  CONFIG,
  CONTINUE_REPLY,
  type CaptureSetting,
  DONE_GATE,
  type Fixture,
  IMPLEMENTED,
  PNG,
  REJECTED,
  type Script,
  type Turn,
  WRITE_PNG,
  allStates,
  assertStopped,
  captureAt,
  capturing,
  continueWork,
  fakeCapture,
  fakeContinuer,
  fakeRounds,
  fixture,
  judging,
  launchRecord,
  outputOf,
  passCheck,
  prepare,
  recordedBase,
  rewriteLaunch,
  runLaunch,
  signalWhileCommandWaits,
  settingOf,
  shaped,
  worktreeOf,
  assertIncludesAll,
} from "./_launch-fixture.ts";

const assertCapturePrompt = (stdin: string, base: string, how: string, logTail: string): void =>
  assertIncludesAll(stdin, [
    "#42", "owner/repo",
    how,
    `CAPTURE_OUTPUT_BEGIN\n${logTail}\nCAPTURE_OUTPUT_END`,
    '["fake-capture"]',
    `git diff ${base}`,
    `\`${DONE_GATE} check\``,
    `\`${DONE_GATE} status\``,
  ]);

const assertPlainContinuePrompt = (stdin: string, base: string): void => {
  assertIncludesAll(stdin, ["does not print", "#42", "owner/repo", `git diff ${base}`, `\`${DONE_GATE} check\``, `\`${DONE_GATE} status\``]);
  assert.ok(!stdin.includes("CAPTURE_OUTPUT_BEGIN"), stdin);
};

const CLEAN_REVIEWS: Script = { self: [{ reply: shaped("self-1") }], independent: [{ reply: shaped("ind-1") }] };

const CONTINUED: Turn = { edit: true, check: true, reply: { session_id: "s-1", result: "continued", total_cost_usd: 0.4, duration_ms: 800 } };

const UNCHANGED: Turn = { reply: { session_id: "s-1", result: "nothing to change", total_cost_usd: 0.25, duration_ms: 900 } };

const FAIL_ONCE = `if [ ! -e "$LOGS/failed-once" ]; then\n  : > "$LOGS/failed-once"\n  echo first-line\n  echo second-line\n  exit 1\nfi\n${WRITE_PNG}`;

const ALWAYS_FAIL = "echo failing\nexit 1\n";

type RunOut = Record<string, unknown> & { steps: Record<string, unknown>[] };

const runOut = (result: SpawnSyncReturns<string>): RunOut => outputOf(result) as RunOut;

const actionsOf = (out: RunOut): unknown[] => out.steps.map((step) => step.action);

const continuesOf = (f: Fixture): Record<string, unknown>[] => launchRecord(worktreeOf(f)).continues as Record<string, unknown>[];

function capturedFixture(setting: CaptureSetting, body: string): Fixture {
  const f = fixture({ ...CONFIG, check: setting.check ?? "true", capture: settingOf(setting) });
  writeFileSync(join(f.logs, "shot.png"), PNG);
  assert.equal(prepare(f).status, 0);
  fakeCapture(f, body);
  return f;
}

function recordingRounds(f: Fixture, script: Script): void {
  fakeRounds(f, script);
  const rounds = join(f.bin, "claude-rounds");
  renameSync(join(f.bin, "claude"), rounds);
  writeFileSync(join(f.bin, "claude"), `#!/bin/sh\ncat > "$LOGS/prompt-$$"\nexec '${rounds}' "$@" < "$LOGS/prompt-$$"\n`, { mode: 0o755 });
}

const continuePromptsOf = (f: Fixture): string[] =>
  readdirSync(f.logs)
    .filter((name) => name.startsWith("prompt-"))
    .map((name) => readFileSync(join(f.logs, name), "utf8"))
    .filter((text) => text.includes("does not print") || text.includes("CAPTURE_OUTPUT_BEGIN"));

function ranOk(f: Fixture): RunOut {
  const result = runLaunch(f);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return runOut(result);
}

test("with a required capture, run implements, captures, and reviews in that order, completes accepted, and the capture step has action, ok, decision, and n", () => {
  const f = capturedFixture({}, WRITE_PNG);
  fakeRounds(f, { implement: [IMPLEMENTED], ...CLEAN_REVIEWS });
  const out = ranOk(f);
  assert.deepEqual(actionsOf(out), ["implement", "capture", "review"]);
  assert.equal(out.verdict, "accepted");
  assert.deepEqual(out.steps[1], { action: "capture", ok: true, decision: "execute", n: 1 });
});

test("with a capture that is not required and a session that adds only a .md change, run has no capture step", () => {
  const f = capturedFixture({ required: false }, WRITE_PNG);
  fakeRounds(f, { implement: [{ ...IMPLEMENTED, edit: true }], ...CLEAN_REVIEWS });
  const out = ranOk(f);
  assert.deepEqual(actionsOf(out), ["implement", "review"]);
  assert.equal(out.verdict, "accepted");
});

test("after a repair, run captures again before the next review", () => {
  const f = capturedFixture({}, WRITE_PNG);
  fakeRounds(f, {
    implement: [IMPLEMENTED],
    self: [REJECTED.self as Turn, { reply: judging("self-2", allStates("fixed")) }],
    independent: [REJECTED.independent as Turn, { reply: judging("ind-2", allStates("fixed")) }],
    repair: [{ edit: true, check: true, reply: { session_id: "s-1", result: "repaired", total_cost_usd: 0.25, duration_ms: 900 } }],
  });
  const out = ranOk(f);
  assert.deepEqual(actionsOf(out), ["implement", "capture", "review", "repair", "capture", "review"]);
  assert.equal(out.verdict, "accepted");
});

test("when a capture fails and the resumed session fixes it, run continues with the capture prompt, captures again, and reviews", () => {
  const f = capturedFixture({}, FAIL_ONCE);
  recordingRounds(f, { implement: [IMPLEMENTED], continue: [CONTINUED], ...CLEAN_REVIEWS });
  const out = ranOk(f);
  assert.deepEqual(actionsOf(out), ["implement", "capture", "continue", "capture", "review"]);
  assert.deepEqual(out.steps[1], { action: "capture", ok: false, n: 1, reason: "capture-failed" });
  assert.ok(!Object.hasOwn(out.steps[2], "capture"), JSON.stringify(out.steps[2]));
  const prompts = continuePromptsOf(f);
  assert.equal(prompts.length, 1);
  assertCapturePrompt(prompts[0], recordedBase(f), "with exit code 1", "first-line\nsecond-line");
  assert.deepEqual(
    continuesOf(f).map((entry) => entry.capture),
    [1],
  );
});

function stuckAfterFailedCapture(): { f: Fixture; out: Record<string, unknown> } {
  const f = capturedFixture({}, ALWAYS_FAIL);
  fakeRounds(f, { implement: [IMPLEMENTED], continue: [UNCHANGED], ...CLEAN_REVIEWS });
  const out = assertStopped(runLaunch(f), "capture-failed");
  return { f, out };
}

test("when a capture fails and the resumed session changes nothing, run stops with capture-failed after implement, capture, and continue, and the next run stops the same way with no steps", () => {
  const { f, out } = stuckAfterFailedCapture();
  const detail = `Capture 1 failed on the working tree ${treeHash(worktreeOf(f))}, and the implementing session changed nothing after it. Read its log_tail in launch.json. Call capture directly to try again.`;
  assert.equal(out.detail, detail);
  assert.deepEqual(actionsOf(out as RunOut), ["implement", "capture", "continue"]);
  const again = assertStopped(runLaunch(f), "capture-failed");
  assert.equal(again.detail, detail);
  assert.deepEqual(again.steps, []);
});

test("after run stopped with capture-failed, a capture called directly that passes lets the next run start from the review", () => {
  const { f } = stuckAfterFailedCapture();
  fakeCapture(f, WRITE_PNG);
  assert.equal(outputOf(captureAt(f)).ok, true);
  const out = ranOk(f);
  assert.deepEqual(actionsOf(out), ["review"]);
  assert.equal(out.verdict, "accepted");
});

test("when the check fails after the media are installed, run continues with the plain continue prompt, captures again, and reviews", () => {
  const check = "[ ! -e media/list.png ] || grep -q '^continue ' README.md";
  const f = capturedFixture({ check }, WRITE_PNG);
  recordingRounds(f, { implement: [IMPLEMENTED], continue: [CONTINUED], ...CLEAN_REVIEWS });
  const out = ranOk(f);
  assert.deepEqual(actionsOf(out), ["implement", "capture", "continue", "capture", "review"]);
  assert.equal(out.steps[1].reason, "not-done");
  const prompts = continuePromptsOf(f);
  assert.equal(prompts.length, 1);
  assertPlainContinuePrompt(prompts[0], recordedBase(f));
  const [continued] = continuesOf(f);
  assert.ok(!Object.hasOwn(continued, "capture"), JSON.stringify(continued));
});

for (const [reason, body] of [
  ["capture-unavailable", "exit 78\n"],
  ["invalid-capture", "exit 0\n"],
]) {
  test(`when the capture stops with ${reason}, run stops with ${reason} and its last step is the capture`, () => {
    const f = capturedFixture({}, body);
    fakeRounds(f, { implement: [IMPLEMENTED], ...CLEAN_REVIEWS });
    const out = assertStopped(runLaunch(f), reason) as RunOut;
    assert.deepEqual(actionsOf(out), ["implement", "capture"]);
    assert.equal(out.steps[1].reason, reason);
  });
}

test("continue on a done worktree whose last capture failed on the current tree resumes with the capture prompt and prints the capture number", () => {
  const f = capturing({}, "echo out-1\necho out-2\nexit 1\n");
  assertStopped(captureAt(f), "capture-failed");
  fakeContinuer(f, CONTINUE_REPLY);
  const result = continueWork(f);
  assert.equal(result.status, 0, result.stderr);
  const out = outputOf(result);
  assert.deepEqual(Object.keys(out), ["action", "ok", "round", "session_id", "tree", "changed", "capture", "result", "cost_usd", "duration_ms"]);
  assert.equal(out.capture, 1);
  assertCapturePrompt(readFileSync(join(f.logs, "continue-stdin"), "utf8"), recordedBase(f), "with exit code 1", "out-1\nout-2");
  assert.deepEqual(Object.keys(continuesOf(f)[0]), ["round", "session_id", "tree", "changed", "capture", "done", "reply", "at"]);
});

test("continue on a worktree changed and checked after a failed capture stops with nothing-to-continue and starts no claude", () => {
  const f = capturing({}, ALWAYS_FAIL);
  assertStopped(captureAt(f), "capture-failed");
  writeFileSync(join(worktreeOf(f), "README.md"), "fixed after the capture\n");
  passCheck(f);
  fakeContinuer(f, CONTINUE_REPLY);
  assertStopped(continueWork(f), "nothing-to-continue");
  assert.ok(!existsSync(join(f.logs, "continue-calls")));
});

test("a failed capture without n is not an unrepaired failed capture, so continue stops with nothing-to-continue and run calls capture", () => {
  const f = capturing({}, ALWAYS_FAIL);
  assertStopped(captureAt(f), "capture-failed");
  rewriteLaunch(f, (stored) => {
    const captures = [...(stored.captures as Record<string, unknown>[])];
    const { n: _, ...rest } = captures[captures.length - 1];
    captures[captures.length - 1] = rest;
    return { ...stored, captures };
  });
  fakeContinuer(f, CONTINUE_REPLY);
  assertStopped(continueWork(f), "nothing-to-continue");
  assert.ok(!existsSync(join(f.logs, "continue-calls")));
  fakeCapture(f, WRITE_PNG);
  fakeRounds(f, CLEAN_REVIEWS);
  const out = ranOk(f);
  assert.deepEqual(actionsOf(out), ["capture", "review"]);
});

test("continue after a capture command that ended by a signal says the command failed without an exit code", () => {
  const f = capturing({}, "kill -KILL $$\n");
  const failed = assertStopped(captureAt(f), "capture-failed");
  assert.equal(failed.exit_code, null);
  fakeContinuer(f, CONTINUE_REPLY);
  assert.equal(continueWork(f).status, 0);
  assertCapturePrompt(readFileSync(join(f.logs, "continue-stdin"), "utf8"), recordedBase(f), "without an exit code", "");
});

test("run ended by SIGTERM during a capture exits 143 with nothing on stdout and leaves no capture command or child", async () => {
  const f = capturedFixture({}, 'echo $$ >> "$LOGS/capture-pids"\nsleep 60 &\necho $! >> "$LOGS/capture-pids"\nwait\n');
  fakeRounds(f, { implement: [IMPLEMENTED], ...CLEAN_REVIEWS });
  const result = await signalWhileCommandWaits(f, ["run", "--worktree", worktreeOf(f)], "capture-pids", 2);
  assert.equal(result.code, 143);
  assert.equal(result.stdout, "");
  assert.equal(result.pids.length, 2);
  assert.deepEqual(result.survivors, [], `still running: ${result.survivors.join(" ")}`);
});
