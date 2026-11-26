/// <reference types="node" />
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { treeHash } from "../../../hooks/_lib/gate_record.ts";
import {
  BOTH_OPEN,
  CLEAN,
  CONFIG,
  COUNT_CHECK,
  FAKE,
  PNG,
  REJECTED,
  type Fixture,
  PASS_CHECK,
  SCRIPT,
  SESSION_REPLY,
  WRITE_PNG,
  allEnded,
  assertStopped,
  callOf,
  captureAt,
  capturing,
  fakeCapture,
  fakeClaude,
  fakeReviewer,
  fixture,
  gateStatus,
  git,
  implemented,
  isRunning,
  launchFile,
  signalWhileCommandWaits,
  launchRecord,
  moveBaseToParent,
  outputOf,
  passCheck,
  pidsIn,
  prepare,
  recordedBase,
  review,
  rewriteLaunch,
  settingOf,
  run,
  worktreeOf,
  assertIncludesAll,
} from "./_launch-fixture.ts";

const HARNESS = resolve(dirname(SCRIPT), "..", "harness");

const STOPPED_AFTER_START = ["action", "ok", "tree", "n", "output", "exit_code", "log_tail", "reason", "detail"];

const RECORD_KEYS = ["n", "tree", "output", "outcome", "exit_code", "log_tail", "files", "installed", "at"];

const PASSED_FIELDS = ["action", "ok", "decision", "tree", "n", "output", "files", "installed"];

const NOT_DONE_FIELDS = ["action", "ok", "tree", "n", "output", "files", "installed", "log_tail", "reason", "detail"];

const TREE_DETAIL = /^The working tree was ([0-9a-f]{40}) before the capture and ([0-9a-f]{40}|null) after it\. A capture does not write into the checkout\.$/;

const outputPathOf = (f: Fixture, n: number): string => `${worktreeOf(f)}-capture-${n}`;

const callCount = (f: Fixture): number =>
  existsSync(join(f.logs, "capture-calls")) ? readFileSync(join(f.logs, "capture-calls"), "utf8").split("\n").filter(Boolean).length : 0;

const capturesOf = (f: Fixture): Record<string, unknown>[] => launchRecord(worktreeOf(f)).captures as Record<string, unknown>[];

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

const checkCount = (f: Fixture): number =>
  existsSync(join(f.logs, "check-calls")) ? readFileSync(join(f.logs, "check-calls"), "utf8").split("\n").filter(Boolean).length : 0;

function committedInWorktree(f: Fixture, path: string, content: string | Buffer): void {
  const file = join(worktreeOf(f), path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  git(worktreeOf(f), "add", path);
  git(worktreeOf(f), "commit", "-q", "-m", `add ${path}`);
  passCheck(f);
}

const listingOf = (f: Fixture, dir: string): string[] => readdirSync(join(worktreeOf(f), dir)).sort();

const CHECK_FAILS_WITH_MEDIA = `${COUNT_CHECK}\n[ ! -e media/list.png ]`;

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
  assert.deepEqual(Object.keys(out), PASSED_FIELDS);
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
    {
      n: 1,
      tree: out.tree,
      output: outputPathOf(f, 1),
      outcome: "passed",
      exit_code: 0,
      log_tail: "",
      files: out.files,
      installed: out.installed,
      at: undefined,
    },
  );
  assert.ok(!Number.isNaN(Date.parse(String(captures[0].at))));
});

for (const required of [true, false]) {
  test(`after a passed capture, the same tree is reused without starting the command when required is ${required}`, () => {
    const f = capturing({ required });
    assert.equal(succeeded(f).decision, "execute");
    const out = unchangedDecision(f, "reused", 1);
    assert.deepEqual(Object.keys(out), ["action", "ok", "decision", "tree", "n"]);
    assert.equal(out.tree, capturesOf(f)[0].installed);
  });
}

test("a passed capture before a failed last capture is not reused when the tree returns to it", () => {
  const f = capturing();
  const first = succeeded(f);
  writeChecked(f, "README.md", "tree B\n");
  fakeCapture(f, "exit 1\n");
  assertStopped(captureAt(f), "capture-failed");
  writeChecked(f, "README.md", "readme\n");
  fakeCapture(f, WRITE_PNG);
  const out = succeeded(f);
  assert.equal(out.tree, first.installed);
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
  assert.notEqual(out.tree, capturesOf(f)[0].installed);
});

test("decision is execute for a non-.md change, an executable .md, a capture definition, a record file with no passed capture, a .json under the destination, and an empty diff", () => {
  const f = capturing({ required: false, destination: "trial/evidence/media", command: [FAKE, "./docs/spec.md", "--config=conf.md"] });
  assert.equal(succeeded(f).decision, "execute");
  writeChecked(f, "trial/evidence/media/shot.json", "{}\n");
  assert.equal(succeeded(f).decision, "execute");
  const changes: [string, number][] = [
    ["src.ts", 0o644],
    ["script.md", 0o755],
    ["docs/spec.md", 0o644],
    ["conf.md", 0o644],
    ["trial/evidence/run.json", 0o644],
  ];
  for (const [path, mode] of changes) {
    rewriteLaunch(f, (stored) => ({ ...stored, captures: [] }));
    rmSync(join(worktreeOf(f), "trial/evidence/media"), { recursive: true, force: true });
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
  const f = capturing({}, `sleep 0.3\n${WRITE_PNG}`);
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
  const result = await signalWhileCommandWaits(f, ["capture", "--worktree", worktreeOf(f)], "capture-pids", 2);
  assert.equal(result.code, 143);
  assert.equal(result.stdout, "");
  assert.deepEqual(result.survivors, [], `still running: ${result.survivors.join(" ")}`);
  assert.equal(launchFile(f), text);
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
  assert.match(result.stderr, /^usage: /);
  assert.equal(callCount(f), 0);
});

test("a passed capture installs its media into the destination in place of the earlier contents, and records the files and the installed tree", () => {
  const f = capturing();
  committedInWorktree(f, "media/old.png", PNG);
  const out = succeeded(f);
  assert.deepEqual(Object.keys(out), PASSED_FIELDS);
  assert.deepEqual(listingOf(f, "media"), ["list.png"]);
  assert.deepEqual(readFileSync(join(worktreeOf(f), "media/list.png")), PNG);
  const sha256 = createHash("sha256").update(PNG).digest("hex");
  assert.deepEqual(out.files, [{ name: "list.png", size: PNG.length, sha256 }]);
  const [record] = capturesOf(f);
  assert.deepEqual(Object.keys(record), RECORD_KEYS);
  assert.deepEqual(record.files, out.files);
  assert.equal(record.installed, out.installed);
  assert.match(String(out.installed), /^[0-9a-f]{40}$/);
  assert.notEqual(out.installed, out.tree);
  assert.equal(out.installed, unchangedDecision(f, "reused", 1).tree);
});

test("when the install changes the tree, capture runs the check once and done_gate.ts status then exits 0", () => {
  const f = capturing();
  committedInWorktree(f, "media/old.png", PNG);
  const before = checkCount(f);
  succeeded(f);
  assert.equal(checkCount(f) - before, 1);
  const status = gateStatus(worktreeOf(f));
  assert.equal(status.status, 0, `${status.stdout}${status.stderr}`);
});

test("when the install leaves the tree unchanged, capture runs no check and installed equals tree", () => {
  const f = capturing();
  committedInWorktree(f, "media/list.png", PNG);
  const before = checkCount(f);
  const out = succeeded(f);
  assert.equal(out.installed, out.tree);
  assert.equal(checkCount(f) - before, 0);
});

test("a check that fails after the install stops with not-done and ten fields, keeps the passed record, and the next capture stops with not-done before starting the command", () => {
  const f = capturing({ check: CHECK_FAILS_WITH_MEDIA });
  const out = assertStopped(captureAt(f), "not-done");
  assert.deepEqual(Object.keys(out), NOT_DONE_FIELDS);
  assert.equal(out.detail, "done_gate.ts check did not pass after the media were installed.");
  const [record] = capturesOf(f);
  assert.equal(record.outcome, "passed");
  assert.equal(record.installed, out.installed);
  assert.deepEqual(record.files, out.files);
  const calls = callCount(f);
  const text = launchFile(f);
  const again = assertStopped(captureAt(f), "not-done");
  assert.ok(String(again.detail).startsWith("done_gate.ts status is not done: "), String(again.detail));
  assert.equal(callCount(f), calls);
  assert.equal(launchFile(f), text);
});

test("launch.ts ended by SIGTERM during the check after the install exits 143 with nothing on stdout, ends the check and its child, and keeps the installed record", async () => {
  const waiting = 'if [ -e media/list.png ]; then echo $$ >> "$LOGS/check-pids"; sleep 60 & echo $! >> "$LOGS/check-pids"; wait; fi';
  const f = capturing({ check: waiting });
  const result = await signalWhileCommandWaits(f, ["capture", "--worktree", worktreeOf(f)], "check-pids", 2);
  assert.equal(result.code, 143);
  assert.equal(result.stdout, "");
  assert.deepEqual(result.survivors, [], `still running: ${result.survivors.join(" ")}`);
  assert.equal(typeof capturesOf(f).at(-1)?.installed, "string");
});

test("the reuse decision compares the current tree with the installed tree, so an unchanged worktree after an install that changed the tree is reused", () => {
  const f = capturing();
  const first = succeeded(f);
  assert.notEqual(first.installed, first.tree);
  const out = unchangedDecision(f, "reused", 1);
  assert.equal(out.tree, first.installed);
});

test("a passed capture without installed is not the last passed capture, so a required capture executes even on its tree", () => {
  const f = capturing();
  const first = succeeded(f);
  rewriteLaunch(f, (stored) => {
    const captures = [...(stored.captures as Record<string, unknown>[])];
    const { installed, ...rest } = captures[captures.length - 1];
    captures[captures.length - 1] = { ...rest, tree: installed };
    return { ...stored, captures };
  });
  assert.equal(first.installed, capturesOf(f).at(-1)?.tree);
  const out = succeeded(f);
  assert.equal(out.decision, "execute");
  assert.equal(out.n, 2);
});

test("after a passed capture, changing the installed media under the destination is execute", () => {
  const f = capturing({ required: false });
  succeeded(f);
  writeChecked(f, "media/list.png", "changed bytes\n");
  assert.equal(succeeded(f).decision, "execute");
});

test("an empty output stops with invalid-capture, records invalid_media without files or installed, leaves the destination, and runs no check", () => {
  const f = capturing({}, "exit 0\n");
  committedInWorktree(f, "media/old.png", PNG);
  const before = checkCount(f);
  const out = assertStopped(captureAt(f), "invalid-capture");
  assert.deepEqual(Object.keys(out), STOPPED_AFTER_START);
  assert.equal(out.detail, `The capture output ${outputPathOf(f, 1)} was not installed: Capture succeeded without required media`);
  const [record] = capturesOf(f);
  assert.equal(record.outcome, "invalid_media");
  assert.deepEqual(Object.keys(record), ["n", "tree", "output", "outcome", "exit_code", "log_tail", "at"]);
  assert.deepEqual(listingOf(f, "media"), ["old.png"]);
  assert.equal(checkCount(f) - before, 0);
});

test("media whose first bytes do not match the extension stop with invalid-capture naming the file", () => {
  const f = capturing({}, 'echo "not a png file" > "$last/list.png"\nexit 0\n');
  const out = assertStopped(captureAt(f), "invalid-capture");
  assert.ok(String(out.detail).includes("list.png"), String(out.detail));
  assert.equal(capturesOf(f).at(-1)?.outcome, "invalid_media");
});

test("a destination git ignores stops with capture-media-ignored and records media_ignored", () => {
  const f = capturing();
  writeChecked(f, ".gitignore", "media/\n");
  const out = assertStopped(captureAt(f), "capture-media-ignored");
  assert.deepEqual(Object.keys(out), STOPPED_AFTER_START);
  assert.equal(out.detail, `git ignores the capture destination media in ${worktreeOf(f)}, so the media would not be in the reviewed tree.`);
  assert.equal(capturesOf(f).at(-1)?.outcome, "media_ignored");
});

test("an install result that cannot be read stops with invalid-capture whose detail ends with the unreadable result sentence", () => {
  const f = capturing({ destination: "README.md/media" });
  const out = assertStopped(captureAt(f), "invalid-capture");
  assert.deepEqual(Object.keys(out), STOPPED_AFTER_START);
  assert.ok(String(out.detail).endsWith("Could not get the media install result."), String(out.detail));
  assert.equal(capturesOf(f).at(-1)?.outcome, "invalid_media");
});

const INSTALLED = "trial/evidence/media/: trial/evidence/media/list.png";

const FIRST_EARLIER_KEY = '{"key":"1-self-1"';

function assertBothPrompts(f: Fixture, check: (stdin: string, name: string) => void): void {
  for (const name of ["self", "independent"]) check(callOf(f, name).stdin, name);
}

const reviewCallsOf = (f: Fixture): string[] =>
  existsSync(join(f.logs, "calls")) ? readFileSync(join(f.logs, "calls"), "utf8").split("\n").filter(Boolean) : [];

function reviewed(f: Fixture): Record<string, unknown> {
  const result = review(f);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const out = outputOf(result);
  assert.equal(out.ok, true);
  return out;
}

test("review stops with not-captured naming the current tree, starts no review, and keeps launch.json, before any capture and after a non-.md change following a passed capture", () => {
  const f = capturing();
  fakeReviewer(f, CLEAN);
  const arrangements: [string, () => void][] = [
    ["no capture", () => {}],
    [
      "src.ts after a passed capture",
      () => {
        succeeded(f);
        writeChecked(f, "src.ts", "changed\n");
      },
    ],
  ];
  for (const [label, arrange] of arrangements) {
    arrange();
    const text = launchFile(f);
    const out = assertStopped(review(f), "not-captured");
    assert.equal(
      out.detail,
      `The capture setting of the base commit requires a capture of the working tree ${treeHash(worktreeOf(f))} of ${worktreeOf(f)}. Call capture, then review again.`,
      label,
    );
    assert.equal(launchFile(f), text, label);
    assert.deepEqual(reviewCallsOf(f), [], label);
  }
});

test("after a passed capture, review succeeds and both prompts open with the opening and then the captured paragraph listing the installed media", () => {
  const f = capturing({ destination: "trial/evidence/media/" });
  succeeded(f);
  fakeReviewer(f, CLEAN);
  reviewed(f);
  assertBothPrompts(f, (stdin, name) => {
    assertIncludesAll(stdin, [INSTALLED], name);
    assert.ok(!stdin.includes("only in Markdown files"), `${name}: ${stdin}`);
  });
});

test("when only a .md file changed after a passed capture, the captured paragraph ends with the Markdown sentence", () => {
  const f = capturing({ required: false, destination: "trial/evidence/media/" });
  succeeded(f);
  writeChecked(f, "notes.md", "notes\n");
  fakeReviewer(f, CLEAN);
  reviewed(f);
  assertBothPrompts(f, (stdin, name) => assertIncludesAll(stdin, [INSTALLED, "only in Markdown files"], name));
});

test("when no capture is required for a .md-only change, review succeeds and both prompts carry the not-captured paragraph naming the base of launch.json", () => {
  const f = capturing({ required: false, destination: "trial/evidence/media/" });
  writeChecked(f, "notes.md", "notes\n");
  fakeReviewer(f, CLEAN);
  reviewed(f);
  assertBothPrompts(f, (stdin, name) => {
    const marker = stdin.indexOf("did not run it");
    assert.ok(marker >= 0, `${name}: ${stdin}`);
    assertIncludesAll(stdin.slice(marker), ["trial/evidence/media/", `commit ${recordedBase(f)}`], name);
  });
});

test("in a round that judges earlier findings, the captured paragraph sits right after the opening and before the earlier findings", () => {
  const f = capturing({ destination: "trial/evidence/media/" });
  succeeded(f);
  fakeReviewer(f, REJECTED);
  assert.equal(reviewed(f).verdict, "rejected");
  fakeReviewer(f, BOTH_OPEN);
  reviewed(f);
  assertBothPrompts(f, (stdin, name) => {
    const installed = stdin.indexOf(INSTALLED);
    assert.ok(installed >= 0, `${name}: ${stdin}`);
    assert.ok(installed < stdin.indexOf(FIRST_EARLIER_KEY), `${name}: ${stdin}`);
  });
});

test("a passed capture without installed is not the last passed capture, so a .md-only change from the base is not_required when required is false", () => {
  const f = capturing({ required: false });
  succeeded(f);
  rmSync(join(worktreeOf(f), "media"), { recursive: true, force: true });
  writeChecked(f, "notes.md", "notes\n");
  rewriteLaunch(f, (stored) => {
    const captures = [...(stored.captures as Record<string, unknown>[])];
    const { installed, ...rest } = captures[captures.length - 1];
    captures[captures.length - 1] = { ...rest, tree: installed };
    return { ...stored, captures };
  });
  unchangedDecision(f, "not_required");
});
