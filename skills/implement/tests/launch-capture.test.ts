/// <reference types="node" />
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import {
  CONFIG,
  DONE_GATE,
  type Fixture,
  PASS_CHECK,
  SCRIPT,
  SESSION_REPLY,
  assertStopped,
  fakeClaude,
  fixture,
  implemented,
  isRunning,
  isolatedEnv,
  launchFile,
  launchRecord,
  moveBaseToParent,
  outputOf,
  pidsIn,
  prepare,
  rewriteLaunch,
  run,
  waitFor,
  worktreeOf,
} from "./_launch-fixture.ts";

const FAKE = "fake-capture";

const HARNESS = resolve(dirname(SCRIPT), "..", "..", "..", "workflows", "implement", "harness");

const STOPPED_AFTER_START = ["action", "ok", "tree", "n", "output", "exit_code", "log_tail", "reason", "detail"];

const RECORD_KEYS = ["n", "tree", "output", "outcome", "exit_code", "log_tail", "at"];

const TREE_DETAIL = /^The working tree was ([0-9a-f]{40}) before the capture and ([0-9a-f]{40}|null) after it\. A capture does not write into the checkout\.$/;

interface CaptureSetting {
  command?: string[];
  destination?: string;
  required?: boolean;
}

const settingOf = ({ command = [FAKE], destination = "media", required = true }: CaptureSetting) => ({ command, destination, required });

function fakeCapture(f: Fixture, body: string): void {
  writeFileSync(
    join(f.bin, FAKE),
    `#!/bin/sh\necho call >> "$LOGS/capture-calls"\npwd -P > "$LOGS/capture-cwd"\nprintf '%s\\n' "$@" > "$LOGS/capture-args"\nfor last; do :; done\nif [ -d "$last" ]; then ls -A "$last"; else echo missing; fi > "$LOGS/capture-listing"\n${body}`,
    { mode: 0o755 },
  );
}

function capturing(setting: CaptureSetting = {}, body = "exit 0\n"): Fixture {
  const f = fixture({ ...CONFIG, capture: settingOf(setting) });
  assert.equal(prepare(f).status, 0);
  fakeClaude(f, PASS_CHECK + SESSION_REPLY);
  assert.equal(run(f, ["implement", "--worktree", worktreeOf(f)]).status, 0);
  fakeCapture(f, body);
  return f;
}

const captureAt = (f: Fixture, env: Record<string, string> = {}) => run(f, ["capture", "--worktree", worktreeOf(f)], env);

const outputPathOf = (f: Fixture, n: number): string => `${worktreeOf(f)}-capture-${n}`;

const callCount = (f: Fixture): number =>
  existsSync(join(f.logs, "capture-calls")) ? readFileSync(join(f.logs, "capture-calls"), "utf8").split("\n").filter(Boolean).length : 0;

const capturesOf = (f: Fixture): Record<string, unknown>[] => launchRecord(worktreeOf(f)).captures as Record<string, unknown>[];

function passCheck(f: Fixture): void {
  const check = spawnSync(process.execPath, [DONE_GATE, "check"], { cwd: worktreeOf(f), env: isolatedEnv(), encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
}

function writeChecked(f: Fixture, path: string, content: string, mode = 0o644): void {
  const file = join(worktreeOf(f), path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  chmodSync(file, mode);
  passCheck(f);
}

function removeChecked(f: Fixture, path: string): void {
  rmSync(join(worktreeOf(f), path));
  passCheck(f);
}

function succeeded(f: Fixture, env: Record<string, string> = {}): Record<string, unknown> {
  const result = captureAt(f, env);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const out = outputOf(result);
  assert.equal(out.ok, true);
  return out;
}

const unchangedDecision = (f: Fixture, decision: string, n?: number): Record<string, unknown> => {
  const text = launchFile(f);
  const calls = callCount(f);
  const out = succeeded(f);
  assert.equal(out.decision, decision);
  if (n !== undefined) assert.equal(out.n, n);
  assert.equal(callCount(f), calls);
  assert.equal(launchFile(f), text);
  return out;
};

const allEnded = (pids: number[]) => waitFor(() => pids.every((pid) => !isRunning(pid)), 5_000);

test("capture stops before starting the command and keeps launch.json when the session has not finished, the check has not passed, or the base has no capture setting", () => {
  const f = fixture({ ...CONFIG, capture: settingOf({}) });
  assert.equal(prepare(f).status, 0);
  fakeCapture(f, "exit 0\n");
  let text = launchFile(f);
  const early = assertStopped(captureAt(f), "not-implemented");
  assert.equal(early.detail, `launch.json of ${worktreeOf(f)} has no implement.session_id.`);
  assert.equal(launchFile(f), text);

  fakeClaude(f, PASS_CHECK + SESSION_REPLY);
  assert.equal(run(f, ["implement", "--worktree", worktreeOf(f)]).status, 0);
  writeFileSync(join(worktreeOf(f), "README.md"), "edited without a check\n");
  text = launchFile(f);
  const unchecked = assertStopped(captureAt(f), "not-done");
  assert.ok(String(unchecked.detail).startsWith("done_gate.ts status is not done: "), String(unchecked.detail));
  assert.equal(launchFile(f), text);

  passCheck(f);
  const parent = moveBaseToParent(f);
  text = launchFile(f);
  const out = assertStopped(captureAt(f), "no-config");
  assert.deepEqual(Object.keys(out), ["action", "ok", "reason", "detail"]);
  assert.equal(
    out.detail,
    `The base commit ${parent} of ${worktreeOf(f)} has no .dotagents.json with a capture that is null or {command, destination, required}.`,
  );
  assert.equal(launchFile(f), text);
  assert.equal(callCount(f), 0);
});

test("capture with a null capture setting succeeds with three fields, keeps launch.json, and creates no output directory", () => {
  const f = implemented();
  const text = launchFile(f);
  const out = succeeded(f);
  assert.deepEqual(out, { action: "capture", ok: true, decision: "not_configured" });
  assert.equal(launchFile(f), text);
  assert.ok(!existsSync(outputPathOf(f, 1)));
});

test("a required capture runs the command in the worktree with {harness} replaced and an empty output directory, and records one passed capture", () => {
  const f = capturing({ command: [FAKE, "{harness}/a:{harness}/b"] });
  const out = succeeded(f);
  assert.deepEqual(Object.keys(out), ["action", "ok", "decision", "tree", "n", "output"]);
  assert.equal(out.decision, "execute");
  assert.equal(out.n, 1);
  assert.equal(out.output, outputPathOf(f, 1));
  assert.match(String(out.tree), /^[0-9a-f]{40}$/);
  assert.equal(readFileSync(join(f.logs, "capture-args"), "utf8"), `${HARNESS}/a:${HARNESS}/b\n${outputPathOf(f, 1)}\n`);
  assert.equal(readFileSync(join(f.logs, "capture-cwd"), "utf8").trim(), worktreeOf(f));
  assert.equal(readFileSync(join(f.logs, "capture-listing"), "utf8"), "");
  const captures = capturesOf(f);
  assert.equal(captures.length, 1);
  assert.deepEqual(Object.keys(captures[0]), RECORD_KEYS);
  assert.deepEqual(
    { ...captures[0], at: undefined },
    { n: 1, tree: out.tree, output: outputPathOf(f, 1), outcome: "passed", exit_code: 0, log_tail: "", at: undefined },
  );
  assert.ok(!Number.isNaN(Date.parse(String(captures[0].at))));
});

for (const required of [true, false]) {
  test(`after a passed capture, the same tree is reused without starting the command when required is ${required}`, () => {
    const f = capturing({ required });
    assert.equal(succeeded(f).decision, "execute");
    const out = unchangedDecision(f, "reused", 1);
    assert.deepEqual(Object.keys(out), ["action", "ok", "decision", "tree", "n"]);
    assert.equal(out.tree, capturesOf(f)[0].tree);
  });
}

test("a passed capture before a failed last capture is not reused when the tree returns to it", () => {
  const f = capturing();
  const first = succeeded(f);
  writeChecked(f, "README.md", "tree B\n");
  fakeCapture(f, "exit 1\n");
  assertStopped(captureAt(f), "capture-failed");
  writeChecked(f, "README.md", "readme\n");
  fakeCapture(f, "exit 0\n");
  const out = succeeded(f);
  assert.equal(out.tree, first.tree);
  assert.equal(out.decision, "execute");
  assert.equal(out.n, 3);
  assert.equal(out.output, outputPathOf(f, 3));
});

test("captures that is not an array counts as no captures, and a capture replaces it with a one-element array", () => {
  const f = capturing();
  rewriteLaunch(f, (stored) => ({ ...stored, captures: "not an array" }));
  const out = succeeded(f);
  assert.equal(out.n, 1);
  assert.equal(capturesOf(f).length, 1);
  assert.equal(capturesOf(f)[0].n, 1);
});

test("with no passed capture, a change of only a mode 100644 .md file is not_required and starts no command", () => {
  const f = capturing({ required: false });
  writeChecked(f, "notes.md", "notes\n");
  const out = unchangedDecision(f, "not_required");
  assert.deepEqual(Object.keys(out), ["action", "ok", "decision", "tree"]);
});

test("after a passed capture, a change of only .md files or record files beside the destination is reused", () => {
  const f = capturing({ required: false, destination: "trial/evidence/media/" });
  assert.equal(succeeded(f).decision, "execute");
  writeChecked(f, "notes.md", "notes\n");
  unchangedDecision(f, "reused", 1);
  writeChecked(f, "trial/evidence/run.json", "{}\n");
  const out = unchangedDecision(f, "reused", 1);
  assert.notEqual(out.tree, capturesOf(f)[0].tree);
});

test("decision is execute for a non-.md change, an executable .md, a capture definition, a record file with no passed capture, a .json under the destination, and an empty diff", () => {
  const f = capturing({ required: false, destination: "trial/evidence/media", command: [FAKE, "./docs/spec.md", "--config=conf.md"] });
  assert.equal(succeeded(f).decision, "execute");
  writeChecked(f, "trial/evidence/media/shot.json", "{}\n");
  assert.equal(succeeded(f).decision, "execute");
  removeChecked(f, "trial/evidence/media/shot.json");
  const changes: [string, number][] = [
    ["src.ts", 0o644],
    ["script.md", 0o755],
    ["docs/spec.md", 0o644],
    ["conf.md", 0o644],
    ["trial/evidence/run.json", 0o644],
  ];
  for (const [path, mode] of changes) {
    rewriteLaunch(f, (stored) => ({ ...stored, captures: [] }));
    writeChecked(f, path, "changed\n", mode);
    assert.equal(succeeded(f).decision, "execute", path);
    removeChecked(f, path);
  }
});

test("a record file beside a destination without a slash is not a record file, so a change to run.json after a passed capture is execute", () => {
  const f = capturing({ required: false, destination: "generated" });
  assert.equal(succeeded(f).decision, "execute");
  writeChecked(f, "run.json", "{}\n");
  assert.equal(succeeded(f).decision, "execute");
});

test("a failed capture does not become the passed capture, so the same tree runs again as capture 2", () => {
  const f = capturing({}, "exit 1\n");
  assertStopped(captureAt(f), "capture-failed");
  const out = assertStopped(captureAt(f), "capture-failed");
  assert.equal(out.n, 2);
  assert.equal(out.output, outputPathOf(f, 2));
  assert.equal(readFileSync(join(f.logs, "capture-args"), "utf8"), `${outputPathOf(f, 2)}\n`);
});

test("exit 1 stops with capture-failed and nine fields, and records a failed capture with both output streams", () => {
  const f = capturing({}, "echo out-line\necho err-line >&2\nexit 1\n");
  const out = assertStopped(captureAt(f), "capture-failed");
  assert.deepEqual(Object.keys(out), STOPPED_AFTER_START);
  assert.equal(out.exit_code, 1);
  assert.equal(out.detail, "The capture command exited 1.");
  assert.ok(String(out.log_tail).includes("out-line") && String(out.log_tail).includes("err-line"), String(out.log_tail));
  const [record] = capturesOf(f);
  assert.equal(record.outcome, "failed");
  assert.equal(record.exit_code, 1);
  assert.equal(record.log_tail, out.log_tail);
});

test("log_tail keeps the last 80 lines and at most the last 6000 characters", () => {
  const f = capturing({}, 'i=1\nwhile [ $i -le 81 ]; do echo "line$i"; i=$((i+1)); done\nexit 1\n');
  const lines = assertStopped(captureAt(f), "capture-failed");
  assert.equal(lines.log_tail, Array.from({ length: 80 }, (_, index) => `line${index + 2}`).join("\n"));
  fakeCapture(f, `"$NODE" -e 'process.stdout.write("b" + "a".repeat(6999) + "\\n\\n")'\nexit 1\n`);
  const long = assertStopped(captureAt(f), "capture-failed");
  assert.equal(long.log_tail, "a".repeat(6000));
});

test("exit 78 stops with capture-unavailable and records unavailable, also when the command wrote into the worktree", () => {
  const f = capturing({}, "exit 78\n");
  const out = assertStopped(captureAt(f), "capture-unavailable");
  assert.deepEqual(Object.keys(out), STOPPED_AFTER_START);
  assert.equal(out.detail, "The capture command reported that the capture cannot run here (exit 78).");
  assert.equal(out.exit_code, 78);
  fakeCapture(f, "echo written > written.txt\nexit 78\n");
  assertStopped(captureAt(f), "capture-unavailable");
  assert.deepEqual(
    capturesOf(f).map((record) => record.outcome),
    ["unavailable", "unavailable"],
  );
});

test("a command that writes a file git does not ignore into the worktree stops with source-changed naming both trees, whether it exits 0 or 1", () => {
  const f = capturing({}, "echo written > written-0.txt\nexit 0\n");
  for (const exit of [0, 1]) {
    if (exit === 1) {
      passCheck(f);
      fakeCapture(f, "echo written > written-1.txt\nexit 1\n");
    }
    const out = assertStopped(captureAt(f), "source-changed");
    const match = TREE_DETAIL.exec(String(out.detail));
    assert.ok(match, String(out.detail));
    assert.equal(match[1], out.tree);
    assert.notEqual(match[2], match[1]);
    assert.equal(out.exit_code, exit);
    assert.equal(capturesOf(f).at(-1)?.outcome, "source_changed");
  }
});

test("a capture past the time limit stops with capture-timeout and leaves no command or child, also when it wrote into the worktree or its child ignores SIGTERM", async () => {
  const waiting = 'echo $$ >> "$LOGS/capture-pids"\nsleep 60 &\necho $! >> "$LOGS/capture-pids"\nwait\n';
  const f = capturing({}, waiting);
  const env = { LAUNCH_CAPTURE_TIMEOUT_MS: "300" };
  const bodies = [
    waiting,
    `echo written > written.txt\n${waiting}`,
    `sh -c 'trap "" TERM; echo $$ >> "$LOGS/capture-pids"; sleep 60 & echo $! >> "$LOGS/capture-pids"; wait' &\n${waiting}`,
  ];
  for (const [index, body] of bodies.entries()) {
    if (index === 2) passCheck(f);
    fakeCapture(f, body);
    const started = Date.now();
    const out = assertStopped(captureAt(f, env), "capture-timeout");
    assert.ok(Date.now() - started < 20_000, `capture ${index + 1} took ${Date.now() - started} ms`);
    assert.deepEqual(Object.keys(out), STOPPED_AFTER_START);
    assert.equal(out.exit_code, null);
    assert.equal(out.detail, "The capture did not end within 300 ms.");
    assert.equal(capturesOf(f).at(-1)?.outcome, "timed_out");
    assert.equal(capturesOf(f).at(-1)?.exit_code, null);
  }
  const pids = pidsIn(f, "capture-pids");
  assert.equal(pids.length, 8);
  assert.ok(await allEnded(pids), `still running: ${pids.filter(isRunning).join(" ")}`);
});

test("LAUNCH_CAPTURE_TIMEOUT_MS that is not a positive integer up to 2147483647 falls back to 570000 ms", () => {
  const f = capturing({}, "sleep 0.3\nexit 0\n");
  for (const value of ["0", "abc", "1.5", "2147483648"]) {
    rewriteLaunch(f, (stored) => ({ ...stored, captures: [] }));
    assert.equal(succeeded(f, { LAUNCH_CAPTURE_TIMEOUT_MS: value }).decision, "execute", value);
  }
});

test("a command that cannot be found stops with capture-unavailable and four fields, and adds no record", () => {
  const f = capturing({ command: ["no-such-capture-command"] });
  const text = launchFile(f);
  const out = assertStopped(captureAt(f), "capture-unavailable");
  assert.deepEqual(Object.keys(out), ["action", "ok", "reason", "detail"]);
  assert.ok(String(out.detail).startsWith("The capture command could not start: "), String(out.detail));
  assert.equal(launchFile(f), text);
});

test("an existing output and its three sibling paths move to .stale- names with their contents, and the capture then succeeds", () => {
  const f = capturing();
  const output = outputPathOf(f, 1);
  mkdirSync(output);
  writeFileSync(join(output, "old.png"), "old output");
  mkdirSync(`${output}.artifacts`);
  writeFileSync(join(`${output}.artifacts`, "trace.zip"), "old artifacts");
  writeFileSync(`${output}.config.mjs`, "old config");
  writeFileSync(`${output}.report.json`, "old report");
  assert.equal(succeeded(f).output, output);
  assert.equal(readFileSync(join(f.logs, "capture-listing"), "utf8"), "");
  const stale = readdirSync(dirname(output)).filter((name) => name.startsWith(basename(output)) && name.includes(".stale-"));
  const staleOf = (suffix: string): string => {
    const found = stale.find((name) => name.startsWith(`${basename(output)}${suffix}.stale-`));
    assert.ok(found, `${suffix} in ${stale.join(" ")}`);
    return join(dirname(output), found);
  };
  assert.equal(stale.length, 4);
  assert.equal(readFileSync(join(staleOf(""), "old.png"), "utf8"), "old output");
  assert.equal(readFileSync(join(staleOf(".artifacts"), "trace.zip"), "utf8"), "old artifacts");
  assert.equal(readFileSync(staleOf(".config.mjs"), "utf8"), "old config");
  assert.equal(readFileSync(staleOf(".report.json"), "utf8"), "old report");
});

test("launch.ts ended by SIGTERM during a capture exits 143 with nothing on stdout, ends the command and its child, and keeps captures", async () => {
  const f = capturing({}, 'echo $$ >> "$LOGS/capture-pids"\nsleep 60 &\necho $! >> "$LOGS/capture-pids"\nwait\n');
  const text = launchFile(f);
  const child = spawn(SCRIPT, ["capture", "--worktree", worktreeOf(f)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: isolatedEnv({ PATH: `${f.bin}:${process.env.PATH}`, LOGS: f.logs, NODE: process.execPath, DONE_GATE }),
  });
  let stdout = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  const closed = new Promise<number | null>((done) => child.on("close", (code) => done(code)));
  try {
    assert.ok(await waitFor(() => pidsIn(f, "capture-pids").length >= 2, 20_000), "the capture command started");
    child.kill("SIGTERM");
    assert.equal(await closed, 143);
    assert.equal(stdout, "");
    const pids = pidsIn(f, "capture-pids");
    assert.ok(await allEnded(pids), `still running: ${pids.filter(isRunning).join(" ")}`);
    assert.equal(launchFile(f), text);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    for (const pid of pidsIn(f, "capture-pids")) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
  }
});

test("the real adapter runs through {harness}, and with no spec it stops with capture-failed naming the missing spec", () => {
  const f = capturing({ command: ["bun", "{harness}/scripts/capture/capture.ts", "missing.spec.ts", "playwright.config.ts"] });
  const out = assertStopped(captureAt(f), "capture-failed");
  assert.equal(out.exit_code, 1);
  assert.ok(String(out.log_tail).includes("missing.spec.ts"), String(out.log_tail));
});

test("capture with a flag other than --worktree prints the usage on stderr, nothing on stdout, and exits 2", () => {
  const f = capturing();
  const result = run(f, ["capture", "--worktree", worktreeOf(f), "--model", "x"]);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.ok(result.stderr.includes("       launch.ts capture --worktree <abs path>\n"), result.stderr);
  assert.equal(callCount(f), 0);
});
