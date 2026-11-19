/// <reference types="node" />
import assert from "node:assert/strict";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CHECK_FILE,
  CONFIG_FILE,
  checkCommand,
  GATE_DIR_NAME,
  RED_FILE,
  treeHash,
} from "../../_lib/gate_record.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE = path.join(HERE, "..", "done_gate.ts");
const PUBLISH_GATE = path.join(HERE, "..", "..", "pre-bash", "publish_gate.ts");

function isolatedEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "done-gate-test",
    GIT_AUTHOR_EMAIL: "done-gate-test@example.invalid",
    GIT_COMMITTER_NAME: "done-gate-test",
    GIT_COMMITTER_EMAIL: "done-gate-test@example.invalid",
    ...extra,
  };
  for (const key of ["GIT_DIR", "GIT_INDEX_FILE", "GIT_WORK_TREE", "GIT_OBJECT_DIRECTORY"]) {
    delete env[key];
  }
  return env;
}

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, env: isolatedEnv(), encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

function repo(files: Record<string, string>): string {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "done-gate-")));
  git(dir, "init", "-q");
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), content);
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--no-verify", "--allow-empty", "-m", "fixture");
  return dir;
}

function gate(cwd: string, ...args: string[]): SpawnSyncReturns<string> {
  return gateWithEnv(cwd, {}, ...args);
}

function gateWithEnv(cwd: string, extra: Record<string, string>, ...args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [GATE, ...args], {
    cwd,
    env: { ...isolatedEnv(), ...extra },
    encoding: "utf8",
    timeout: 60_000,
  });
}

function gateDir(cwd: string): string {
  return git(cwd, "rev-parse", "--path-format=absolute", "--git-path", GATE_DIR_NAME).trim();
}

function readRecordFile(cwd: string, name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(gateDir(cwd), name), "utf8"));
}

function snapshot(cwd: string): string {
  const dir = gateDir(cwd);
  const files = readdirSync(dir)
    .sort()
    .map((name) => `${name}\n${readFileSync(path.join(dir, name), "utf8")}`);
  return `${files.join("\n---\n")}\n===\n${git(cwd, "status", "--porcelain")}`;
}

test("T-546 on copies check from .dotagents.json and records mode record, and --mode enforce records mode enforce", () => {
  const dir = repo({ ".dotagents.json": '{"check": ["sh", "-c", "exit 0"]}' });

  const plain = gate(dir, "on");
  assert.equal(plain.status, 0, plain.stderr);
  assert.deepEqual(readRecordFile(dir, CONFIG_FILE), {
    check: ["sh", "-c", "exit 0"],
    mode: "record",
  });

  const enforce = gate(dir, "on", "--mode", "enforce");
  assert.equal(enforce.status, 0, enforce.stderr);
  assert.deepEqual(readRecordFile(dir, CONFIG_FILE), {
    check: ["sh", "-c", "exit 0"],
    mode: "enforce",
  });
});

test("T-547 check runs the command that on copied, not one written into .dotagents.json afterwards", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 3"}' });
  assert.equal(gate(dir, "on").status, 0);
  writeFileSync(path.join(dir, ".dotagents.json"), '{"check": "exit 0"}');
  git(dir, "commit", "-q", "--no-verify", "-am", "rewrite check");

  assert.equal(gate(dir, "check").status, 3);
});

test("T-548 on exits 2 and creates no record when .dotagents.json is missing, is not JSON, carries a check of the wrong shape, or --mode names an unknown mode", () => {
  const cases: Array<[string, Record<string, string>, string[]]> = [
    ["missing .dotagents.json", { "tracked.txt": "one\n" }, []],
    ["not JSON", { ".dotagents.json": "{check: exit 0" }, []],
    ["check is a number", { ".dotagents.json": '{"check": 42}' }, []],
    ["check is an empty string", { ".dotagents.json": '{"check": ""}' }, []],
    ["check is an empty array", { ".dotagents.json": '{"check": []}' }, []],
    ["check is absent", { ".dotagents.json": '{"setup": "exit 0"}' }, []],
    ["unknown mode", { ".dotagents.json": '{"check": "exit 0"}' }, ["--mode", "block"]],
  ];
  for (const [label, files, args] of cases) {
    const dir = repo(files);
    const result = gate(dir, "on", ...args);
    assert.equal(result.status, 2, `${label}: expected exit 2, got ${result.status}`);
    assert.match(result.stderr, /\S/, `${label}: no reason on stderr`);
    assert.equal(existsSync(gateDir(dir)), false, `${label}: the record directory was created`);
  }
});

test("T-549 a check is accepted only as a non-empty shell string or a non-empty argv array of strings", () => {
  assert.equal(checkCommand("exit 0"), "exit 0");
  assert.deepEqual(checkCommand(["sh", "-c", "exit 0"]), ["sh", "-c", "exit 0"]);
  for (const value of ["", "  ", [], [""], ["sh", 1], 42, null, undefined, { cmd: "exit 0" }]) {
    assert.equal(checkCommand(value), null, `${JSON.stringify(value)} must be rejected`);
  }
});

test("T-550 check runs a shell string and an argv array and exits with the exit code of the command it ran", () => {
  const cases: Array<[string, number]> = [
    ['"exit 0"', 0],
    ['"exit 3"', 3],
    ['["sh", "-c", "exit 0"]', 0],
    ['["sh", "-c", "exit 3"]', 3],
  ];
  for (const [check, expected] of cases) {
    const dir = repo({ ".dotagents.json": `{"check": ${check}}` });
    assert.equal(gate(dir, "on").status, 0);
    const result = gate(dir, "check");
    assert.equal(result.status, expected, `check ${check}: ${result.stderr}`);
    assert.equal(readRecordFile(dir, CHECK_FILE).exitCode, expected);
  }
});

test("T-551 status prints done and exits 0 after a passing check, and exits 1 telling to run check after a failing one", () => {
  const passing = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(passing, "on");
  gate(passing, "check");
  const done = gate(passing, "status");
  assert.equal(done.status, 0, done.stdout);
  assert.equal(done.stdout, "done\n");

  const failing = repo({ ".dotagents.json": '{"check": "exit 3"}' });
  gate(failing, "on");
  gate(failing, "check");
  const notDone = gate(failing, "status");
  assert.equal(notDone.status, 1);
  assert.match(notDone.stdout, /exited 3/);
  assert.match(notDone.stdout, /done_gate\.ts check/);

  const unchecked = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(unchecked, "on");
  const noRecord = gate(unchecked, "status");
  assert.equal(noRecord.status, 1);
  assert.match(noRecord.stdout, /No check result/);
  assert.match(noRecord.stdout, /done_gate\.ts check/);
});

test("T-552 after a passing check, a tracked edit or a new untracked file makes status exit 1, and a file .gitignore excludes leaves it at 0", () => {
  const dir = repo({
    ".dotagents.json": '{"check": "exit 0"}',
    ".gitignore": "*.log\n",
    "tracked.txt": "one\n",
  });
  gate(dir, "on");
  assert.equal(gate(dir, "check").status, 0);

  writeFileSync(path.join(dir, "tracked.txt"), "two\n");
  const edited = gate(dir, "status");
  assert.equal(edited.status, 1);
  assert.match(edited.stdout, /working tree changed/);
  assert.match(edited.stdout, /done_gate\.ts check/);
  writeFileSync(path.join(dir, "tracked.txt"), "one\n");
  assert.equal(gate(dir, "status").status, 0, "restoring the tracked file must restore done");

  writeFileSync(path.join(dir, "new.txt"), "untracked\n");
  assert.equal(gate(dir, "status").status, 1);
  rmSync(path.join(dir, "new.txt"));
  assert.equal(gate(dir, "status").status, 0);

  writeFileSync(path.join(dir, "build.log"), "ignored\n");
  const ignored = gate(dir, "status");
  assert.equal(ignored.status, 0, ignored.stdout);
});

test("T-558 after a passing check, editing a tracked file that .gitignore also matches makes status exit 1", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}', ".gitignore": "*.log\n" });
  writeFileSync(path.join(dir, "forced.log"), "one\n");
  git(dir, "add", "-f", "forced.log");
  git(dir, "commit", "-q", "--no-verify", "-m", "force-add");
  gate(dir, "on");
  assert.equal(gate(dir, "check").status, 0);
  assert.equal(gate(dir, "status").status, 0);

  writeFileSync(path.join(dir, "forced.log"), "two\n");
  assert.equal(gate(dir, "status").status, 1);
});

test("T-553 a check that edits a tracked file and exits 0 makes check exit 1 saying it modified the tree, and status exit 1", () => {
  const dir = repo({
    ".dotagents.json": '{"check": "printf x >> tracked.txt"}',
    "tracked.txt": "one\n",
  });
  gate(dir, "on");
  const result = gate(dir, "check");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /modified the working tree/);
  assert.equal(gate(dir, "status").status, 1);
});

test("T-554 status leaves every file in the record directory and the git status --porcelain output unchanged, both when done and when not", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}', "tracked.txt": "one\n" });
  gate(dir, "on");
  gate(dir, "check");

  const doneBefore = snapshot(dir);
  assert.equal(gate(dir, "status").status, 0);
  assert.equal(snapshot(dir), doneBefore);

  writeFileSync(path.join(dir, "tracked.txt"), "two\n");
  writeFileSync(path.join(dir, "new.txt"), "untracked\n");
  const notDoneBefore = snapshot(dir);
  assert.equal(gate(dir, "status").status, 1);
  assert.equal(snapshot(dir), notDoneBefore);
});

test("T-555 check and status exit 2 before on, and off removes the record directory so status exits 2 again", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  assert.equal(gate(dir, "check").status, 2);
  assert.equal(gate(dir, "status").status, 2);

  gate(dir, "on");
  gate(dir, "check");
  assert.equal(gate(dir, "status").status, 0);

  assert.equal(gate(dir, "off").status, 0);
  assert.equal(existsSync(gateDir(dir)), false);
  assert.equal(gate(dir, "status").status, 2);
  assert.equal(gate(dir, "off").status, 0, "off with no record directory must still exit 0");
});

test("T-556 a second worktree does not see the passing record of the first, and status there exits 2", () => {
  const first = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(first, "on");
  gate(first, "check");
  assert.equal(gate(first, "status").status, 0);

  const second = path.join(realpathSync(mkdtempSync(path.join(tmpdir(), "done-gate-wt-"))), "wt");
  git(first, "worktree", "add", "-q", "--detach", second);

  assert.notEqual(gateDir(second), gateDir(first));
  assert.equal(gate(second, "status").status, 2);
  assert.equal(gate(first, "status").status, 0);
});

test("T-557 outside a git working tree and with an unknown or missing action, the gate exits 2 with a one-line reason", () => {
  const outside = realpathSync(mkdtempSync(path.join(tmpdir(), "done-gate-outside-")));
  const result = spawnSync(process.execPath, [GATE, "status"], {
    cwd: outside,
    env: isolatedEnv({ GIT_CEILING_DIRECTORIES: path.dirname(outside) }),
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^[^\n]+\n$/);

  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  for (const args of [["nope"], [], ["toString"]]) {
    const unknown = gate(dir, ...args);
    assert.equal(unknown.status, 2, `${JSON.stringify(args)}`);
    assert.match(unknown.stderr, /^[^\n]+\n$/);
  }
});

function outsideDir(): string {
  return realpathSync(mkdtempSync(path.join(tmpdir(), "done-gate-outside-")));
}

function stopHook(input: string, cwd: string = outsideDir()): Record<string, unknown> {
  const result = spawnSync(process.execPath, [GATE, "stop"], {
    cwd,
    env: isolatedEnv({ GIT_CEILING_DIRECTORIES: path.dirname(cwd) }),
    input,
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(result.status, 0, `stop exited ${result.status}: ${result.stderr}`);
  const output: unknown = JSON.parse(result.stdout);
  assert.ok(
    typeof output === "object" && output !== null && !Array.isArray(output),
    `stop stdout is not one JSON object: ${result.stdout}`,
  );
  return output as Record<string, unknown>;
}

function stopEvent(cwd: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    session_id: "session-1",
    cwd,
    background_tasks: [],
    stop_hook_active: false,
    ...extra,
  });
}

function stopLog(cwd: string): Array<Record<string, unknown>> {
  const file = path.join(gateDir(cwd), "stop-log.jsonl");
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line));
}

test("T-559 stop prints {} and appends nothing for stdin that is not a JSON object, a cwd outside git, a repo without on, and a non-empty background_tasks", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  assert.equal(gate(dir, "on").status, 0);
  const notOn = repo({ ".dotagents.json": '{"check": "exit 0"}' });

  assert.deepEqual(stopHook("not json", dir), {});
  assert.deepEqual(stopHook("[]", dir), {});
  assert.deepEqual(stopHook(stopEvent(outsideDir())), {});
  assert.deepEqual(stopHook(stopEvent(notOn)), {});
  assert.deepEqual(stopHook(stopEvent(dir, { background_tasks: [1] })), {});

  assert.equal(existsSync(gateDir(notOn)), false, "stop created a record directory in a repo without on");
  assert.deepEqual(stopLog(dir), []);
  assert.deepEqual(stopHook(stopEvent(dir)), {});
  assert.equal(stopLog(dir).length, 1, "an empty background_tasks must reach the gate");
});

test("T-560 in mode record, stop prints {} and appends one line saying done after a passing check, and one saying not done with reason no-record before any check", () => {
  const passing = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(passing, "on");
  assert.equal(gate(passing, "check").status, 0);
  assert.deepEqual(stopHook(stopEvent(passing)), {});
  const [done, ...restDone] = stopLog(passing);
  assert.deepEqual(restDone, []);
  assert.equal(typeof done.at, "string");
  assert.deepEqual(
    { session_id: done.session_id, tree: done.tree, done: done.done, reason: done.reason },
    { session_id: "session-1", tree: treeHash(passing), done: true, reason: undefined },
  );

  const unchecked = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(unchecked, "on");
  assert.deepEqual(stopHook(stopEvent(unchecked)), {});
  const [notDone, ...restNotDone] = stopLog(unchecked);
  assert.deepEqual(restNotDone, []);
  assert.equal(typeof notDone.at, "string");
  assert.deepEqual(
    { session_id: notDone.session_id, tree: notDone.tree, done: notDone.done, reason: notDone.reason },
    { session_id: "session-1", tree: treeHash(unchecked), done: false, reason: "no-record" },
  );
});

test("T-561 in mode enforce, stop prints {} after a passing check and blocks with the text status prints once the tree changes", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(dir, "on", "--mode", "enforce");
  assert.equal(gate(dir, "check").status, 0);
  assert.deepEqual(stopHook(stopEvent(dir)), {});

  writeFileSync(path.join(dir, "new.txt"), "untracked\n");
  const blocked = stopHook(stopEvent(dir));
  const status = gate(dir, "status");
  assert.equal(status.status, 1);
  assert.deepEqual(blocked, { decision: "block", reason: status.stdout.replace(/\n$/, "") });
  assert.deepEqual(stopLog(dir), [], "mode enforce must not append to stop-log.jsonl");
});

test("T-562 in mode enforce, the same not-done event blocks 8 stops, allows the 9th with a systemMessage and no decision, and blocks the 10th again", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(dir, "on", "--mode", "enforce");
  const event = stopEvent(dir);

  for (let call = 1; call <= 8; call++) {
    assert.equal(stopHook(event).decision, "block", `call ${call}`);
  }
  const ninth = stopHook(event);
  assert.equal(ninth.decision, undefined);
  assert.equal(typeof ninth.systemMessage, "string");
  assert.equal(stopHook(event).decision, "block", "call 10");
});

test("T-563 in mode enforce, a new check exit code or a new file restarts the count, so the next stop blocks and 8 stops block before one is allowed", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 3"}' });
  gate(dir, "on", "--mode", "enforce");
  const event = stopEvent(dir);
  const blockRun = (label: string, calls: number) => {
    for (let call = 1; call <= calls; call++) {
      assert.equal(stopHook(event).decision, "block", `${label} call ${call}`);
    }
  };

  blockRun("no record", 8);
  assert.equal(gate(dir, "check").status, 3);
  blockRun("after check exited 3", 8);
  writeFileSync(path.join(dir, "new.txt"), "untracked\n");
  blockRun("after a new file", 8);
  const allowed = stopHook(event);
  assert.equal(allowed.decision, undefined);
  assert.equal(typeof allowed.systemMessage, "string");
});

test("T-564 stop leaves the tree hash and git status --porcelain unchanged in mode record and in mode enforce", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}', "tracked.txt": "one\n" });
  writeFileSync(path.join(dir, "tracked.txt"), "two\n");
  writeFileSync(path.join(dir, "new.txt"), "untracked\n");
  const before = { tree: treeHash(dir), porcelain: git(dir, "status", "--porcelain") };
  const current = () => ({ tree: treeHash(dir), porcelain: git(dir, "status", "--porcelain") });

  gate(dir, "on");
  assert.deepEqual(stopHook(stopEvent(dir)), {});
  assert.equal(stopLog(dir).length, 1);
  assert.deepEqual(current(), before);

  gate(dir, "on", "--mode", "enforce");
  assert.equal(stopHook(stopEvent(dir)).decision, "block");
  assert.deepEqual(current(), before);
});

test("T-565 running on again after a passing check makes status exit 1 and leaves stop-log.jsonl as it was", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(dir, "on");
  assert.equal(gate(dir, "check").status, 0);
  stopHook(stopEvent(dir));
  const logFile = path.join(gateDir(dir), "stop-log.jsonl");
  const log = readFileSync(logFile, "utf8");
  assert.notEqual(log, "");

  assert.equal(gate(dir, "on").status, 0);
  assert.equal(gate(dir, "status").status, 1);
  assert.equal(readFileSync(logFile, "utf8"), log);
});

test("T-566 when stop cannot write its record, it prints {} and one stderr line and exits 0", () => {
  const dir = repo({ ".dotagents.json": '{"check": "exit 0"}' });
  gate(dir, "on");
  mkdirSync(path.join(gateDir(dir), "stop-log.jsonl"));
  const result = spawnSync(process.execPath, [GATE, "stop"], {
    cwd: dir,
    env: isolatedEnv(),
    input: stopEvent(dir),
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "{}\n");
  assert.match(result.stderr, /^[^\n]+\n$/);
});

const RUN_TESTS = 'for f in tests/*.sh; do sh "$f" || exit 1; done';
const RED_CONFIG = { remote: "origin", baseBranch: "main", check: RUN_TESTS };

function writeFiles(dir: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), content);
  }
}

function pushedRepo(dotagents: Record<string, unknown>): string {
  const bare = realpathSync(mkdtempSync(path.join(tmpdir(), "done-gate-bare-")));
  git(bare, "init", "-q", "--bare");
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "done-gate-")));
  git(dir, "init", "-q");
  writeFiles(dir, {
    ".dotagents.json": JSON.stringify(dotagents),
    "src/a.txt": "old\n",
    "tests/base.sh": "exit 0\n",
  });
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--no-verify", "-m", "base");
  git(dir, "remote", "add", "origin", bare);
  git(dir, "push", "-q", "origin", "HEAD:main");
  git(dir, "fetch", "-q", "origin");
  return dir;
}

function redRepo(dotagents: Record<string, unknown> = RED_CONFIG, ...onArgs: string[]): string {
  const dir = pushedRepo(dotagents);
  const on = gate(dir, "on", ...onArgs);
  assert.equal(on.status, 0, on.stderr);
  return dir;
}

function addTestFailingOnBase(dir: string): void {
  writeFiles(dir, { "src/a.txt": "new\n", "tests/new.sh": "grep -q new src/a.txt\n" });
}

test("T-581 on copies remote, baseBranch and setup, records --require red in either order with --mode, and still succeeds when the three are absent", () => {
  const dir = repo({
    ".dotagents.json": JSON.stringify({
      remote: "origin",
      baseBranch: "main",
      setup: ["sh", "-c", "exit 0"],
      check: "exit 0",
    }),
  });
  assert.equal(gate(dir, "on", "--require", "red", "--mode", "enforce").status, 0);
  assert.deepEqual(readRecordFile(dir, CONFIG_FILE), {
    check: "exit 0",
    mode: "enforce",
    remote: "origin",
    baseBranch: "main",
    setup: ["sh", "-c", "exit 0"],
    requireRed: true,
  });
  assert.equal(gate(dir, "on", "--mode", "record", "--require", "red").status, 0);
  assert.equal(readRecordFile(dir, CONFIG_FILE).requireRed, true);
  assert.equal(gate(dir, "on").status, 0);
  assert.equal(readRecordFile(dir, CONFIG_FILE).requireRed, undefined);

  const minimal = repo({ ".dotagents.json": '{"check": "exit 0", "setup": []}' });
  const plain = gate(minimal, "on");
  assert.equal(plain.status, 0, plain.stderr);
  assert.deepEqual(readRecordFile(minimal, CONFIG_FILE), { check: "exit 0", mode: "record" });

  for (const args of [["--require", "green"], ["--require"], ["--require", "red", "--require", "red"]]) {
    assert.equal(gate(minimal, "on", ...args).status, 2, JSON.stringify(args));
  }
});

test("T-582 red exits 0 and records a nonzero exit code and the added test when the added test fails on base", () => {
  const dir = redRepo({ ...RED_CONFIG, check: `echo check-output; ${RUN_TESTS}` });
  addTestFailingOnBase(dir);
  const result = gate(dir, "red");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^done_gate: [^\n]*fail on base[^\n]*\n$/);
  const record = readRecordFile(dir, RED_FILE);
  assert.equal(typeof record.exitCode, "number");
  assert.notEqual(record.exitCode, 0);
  assert.deepEqual(record.tests, ["tests/new.sh"]);
  assert.equal(record.tree, treeHash(dir));
  assert.equal(record.base, git(dir, "rev-parse", "HEAD").trim());
  assert.equal(typeof record.at, "string");
});

test("T-583 red exits 1 saying the change is not verified when the added test also passes on base", () => {
  const dir = redRepo();
  writeFiles(dir, { "tests/always.sh": "exit 0\n" });
  const result = gate(dir, "red");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /do not verify this change/);
  assert.equal(readRecordFile(dir, RED_FILE).exitCode, 0);
});

test("T-584 red exits 1 and records an empty list when only a non-test file changed", () => {
  const dir = redRepo();
  writeFiles(dir, { "src/a.txt": "new\n" });
  const result = gate(dir, "red");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /no test files changed/);
  assert.deepEqual(readRecordFile(dir, RED_FILE).tests, []);
});

test("T-585 red selects files under tests, test or __tests__ and named *.test.*, *.spec.* or *_test.*, and no other file", () => {
  const dir = redRepo();
  const selected = ["a/tests/x.sh", "a/test/x.sh", "a/__tests__/x.sh", "x.test.sh", "x.spec.sh", "x_test.sh"];
  writeFiles(
    dir,
    Object.fromEntries([...selected, "contest/x.sh", "latest.sh"].map((name) => [name, "exit 0\n"])),
  );
  gate(dir, "red");
  assert.deepEqual([...(readRecordFile(dir, RED_FILE).tests as string[])].sort(), [...selected].sort());
});

test("T-586 red runs setup in the clone before check, and the file setup creates stays out of the working tree", () => {
  const dir = redRepo({
    ...RED_CONFIG,
    setup: "touch made-by-setup",
    check: `test -f made-by-setup || exit 7; ${RUN_TESTS}`,
  });
  addTestFailingOnBase(dir);
  const result = gate(dir, "red");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readRecordFile(dir, RED_FILE).exitCode, 1);
  assert.equal(existsSync(path.join(dir, "made-by-setup")), false);
});

test("T-587 red leaves git status --porcelain, the tree hash and the git worktree list line count unchanged", () => {
  const dir = redRepo();
  addTestFailingOnBase(dir);
  git(dir, "add", "src/a.txt");
  const current = () => ({
    porcelain: git(dir, "status", "--porcelain"),
    tree: treeHash(dir),
    worktrees: git(dir, "worktree", "list").split("\n").length,
  });
  const before = current();
  assert.equal(gate(dir, "red").status, 0);
  assert.deepEqual(current(), before);
});

test("T-588 red leaves no clone in the temporary directory", () => {
  const dir = redRepo();
  addTestFailingOnBase(dir);
  const scratch = realpathSync(mkdtempSync(path.join(tmpdir(), "done-gate-tmp-")));
  const result = gateWithEnv(dir, { TMPDIR: scratch }, "red");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(scratch), []);
});

test("T-589 red exits 2 with a one-line reason and writes no red.json before on, without remote, without the base ref, and when setup fails", () => {
  const cases: Array<[string, string]> = [
    ["not on", pushedRepo(RED_CONFIG)],
    ["no remote", redRepo({ baseBranch: "main", check: RUN_TESTS })],
    ["no base ref", redRepo({ ...RED_CONFIG, baseBranch: "missing" })],
    ["setup fails", redRepo({ ...RED_CONFIG, setup: "exit 5" })],
  ];
  for (const [label, dir] of cases) {
    addTestFailingOnBase(dir);
    const result = gate(dir, "red");
    assert.equal(result.status, 2, `${label}: ${result.stderr}`);
    assert.match(result.stderr, /^done_gate: [^\n]+\n$/, label);
    assert.equal(existsSync(path.join(gateDir(dir), RED_FILE)), false, label);
  }
});

test("T-590 with --require red, status exits 1 telling to run red after a passing check without a red record, exits 0 once red passes, and exits 1 after a later edit with the check side first", () => {
  const dir = redRepo(RED_CONFIG, "--require", "red");
  addTestFailingOnBase(dir);
  const check = gate(dir, "check");
  assert.equal(check.status, 0, check.stderr);

  const noRed = gate(dir, "status");
  assert.equal(noRed.status, 1);
  assert.match(noRed.stdout, /No red result/);
  assert.match(noRed.stdout, /done_gate\.ts red/);
  assert.doesNotMatch(noRed.stdout, /done_gate\.ts check/);

  assert.equal(gate(dir, "red").status, 0);
  const done = gate(dir, "status");
  assert.equal(done.status, 0, done.stdout);
  assert.equal(done.stdout, "done\n");

  writeFiles(dir, { "src/b.txt": "later\n" });
  const changed = gate(dir, "status");
  assert.equal(changed.status, 1);
  const checkAt = changed.stdout.indexOf("done_gate.ts check");
  const redAt = changed.stdout.indexOf("done_gate.ts red");
  assert.ok(checkAt >= 0 && redAt > checkAt, changed.stdout);
});

test("T-591 with --require red, status exits 1 when red.json records a check that passed on base or an empty test list", () => {
  const passing = redRepo(RED_CONFIG, "--require", "red");
  writeFiles(passing, { "tests/always.sh": "exit 0\n" });
  assert.equal(gate(passing, "check").status, 0);
  assert.equal(gate(passing, "red").status, 1);
  const passed = gate(passing, "status");
  assert.equal(passed.status, 1);
  assert.match(passed.stdout, /do not verify this change/);
  assert.match(passed.stdout, /done_gate\.ts red/);

  const empty = redRepo(RED_CONFIG, "--require", "red");
  assert.equal(gate(empty, "check").status, 0);
  assert.equal(gate(empty, "red").status, 1);
  const none = gate(empty, "status");
  assert.equal(none.status, 1);
  assert.match(none.stdout, /no changed test files/);
  assert.match(none.stdout, /done_gate\.ts red/);
});

test("T-592 without --require red, whether red.json exists does not change status", () => {
  const dir = redRepo();
  assert.equal(gate(dir, "check").status, 0);
  const without = gate(dir, "status");
  assert.equal(gate(dir, "red").status, 1);
  assert.equal(existsSync(path.join(gateDir(dir), RED_FILE)), true);
  const withRed = gate(dir, "status");
  assert.deepEqual([withRed.status, withRed.stdout], [without.status, without.stdout]);
  assert.equal(withRed.stdout, "done\n");
});

test("T-593 with --require red in mode enforce, the stop block reason equals the status output and the publish_gate denial contains it", () => {
  const dir = redRepo(RED_CONFIG, "--mode", "enforce", "--require", "red");
  assert.equal(gate(dir, "check").status, 0);
  const status = gate(dir, "status");
  assert.equal(status.status, 1);
  const statusText = status.stdout.replace(/\n$/, "");
  assert.match(statusText, /done_gate\.ts red/);

  assert.deepEqual(stopHook(stopEvent(dir)), { decision: "block", reason: statusText });

  const publish = spawnSync(process.execPath, [PUBLISH_GATE], {
    input: JSON.stringify({ session_id: "s", tool_name: "Bash", tool_input: { command: "git push" }, cwd: dir }),
    env: isolatedEnv(),
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(publish.status, 0, publish.stderr);
  const reason: unknown = JSON.parse(publish.stdout).hookSpecificOutput.permissionDecisionReason;
  assert.equal(typeof reason, "string");
  assert.ok((reason as string).includes(statusText), String(reason));
});

test("T-594 red with GIT_INDEX_FILE pointing at the repository index leaves git ls-files -s unchanged and checks out base in the clone", () => {
  const dir = redRepo();
  addTestFailingOnBase(dir);
  git(dir, "add", "src/a.txt");
  const before = git(dir, "ls-files", "-s");
  const index = git(dir, "rev-parse", "--path-format=absolute", "--git-path", "index").trim();
  const result = gateWithEnv(dir, { GIT_INDEX_FILE: index }, "red");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git(dir, "ls-files", "-s"), before);
  assert.doesNotMatch(result.stderr, /No such file/);
  assert.equal(readRecordFile(dir, RED_FILE).exitCode, 1);
});

test("T-595 running on after red removes red.json", () => {
  const dir = redRepo();
  addTestFailingOnBase(dir);
  assert.equal(gate(dir, "red").status, 0);
  assert.equal(existsSync(path.join(gateDir(dir), RED_FILE)), true);
  assert.equal(gate(dir, "on").status, 0);
  assert.equal(existsSync(path.join(gateDir(dir), RED_FILE)), false);
});

test("T-596 a setup and a check that print to stdout leave the stdout of red at one line", () => {
  const dir = redRepo({ ...RED_CONFIG, setup: "echo setup-output", check: `echo check-output; ${RUN_TESTS}` });
  writeFiles(dir, { "tests/always.sh": "exit 0\n" });
  const result = gate(dir, "red");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^done_gate: [^\n]*do not verify this change[^\n]*\n$/);
  assert.match(result.stderr, /setup-output/);
  assert.match(result.stderr, /check-output/);
});

test("T-597 red exits 2 with one done_gate line on stderr, empty stdout, no red.json, no clone left and git status unchanged when check cannot start, check is killed by a signal, or a changed test file is a dangling or directory symlink", () => {
  const cases: Array<[string, string, boolean]> = [];
  const unstartable = redRepo({ ...RED_CONFIG, check: ["no-such-binary-xyz"] });
  writeFiles(unstartable, { "tests/new.sh": "exit 0\n" });
  cases.push(["check cannot start", unstartable, true]);
  const killed = redRepo({ ...RED_CONFIG, check: ["sh", "-c", "kill -9 $$"] });
  writeFiles(killed, { "tests/new.sh": "exit 0\n" });
  cases.push(["check killed by a signal", killed, false]);
  const dangling = redRepo();
  symlinkSync("/nonexistent", path.join(dangling, "tests", "dangling.sh"));
  cases.push(["dangling symlink", dangling, true]);
  const directory = redRepo();
  symlinkSync("../src", path.join(directory, "tests", "link.sh"));
  cases.push(["directory symlink", directory, true]);

  for (const [label, dir, onlyLine] of cases) {
    const porcelain = git(dir, "status", "--porcelain");
    const scratch = realpathSync(mkdtempSync(path.join(tmpdir(), "done-gate-tmp-")));
    const result = gateWithEnv(dir, { TMPDIR: scratch }, "red");
    assert.equal(result.status, 2, `${label}: ${result.stdout}${result.stderr}`);
    assert.equal(result.stdout, "", label);
    assert.equal(result.stderr.split("\n").filter((line) => line.startsWith("done_gate:")).length, 1, label);
    if (onlyLine) {
      assert.match(result.stderr, /^done_gate: [^\n]+\n$/, label);
    }
    assert.equal(existsSync(path.join(gateDir(dir), RED_FILE)), false, label);
    assert.deepEqual(readdirSync(scratch), [], label);
    assert.equal(git(dir, "status", "--porcelain"), porcelain, label);
  }
});

test("T-598 check exits 1 and records exit code 1 when its argv command cannot start", () => {
  const dir = repo({ ".dotagents.json": '{"check": ["no-such-binary-xyz"]}' });
  assert.equal(gate(dir, "on").status, 0);
  const result = gate(dir, "check");
  assert.equal(result.status, 1, result.stderr);
  assert.equal(readRecordFile(dir, CHECK_FILE).exitCode, 1);
});

test("T-599 red copies the content of a changed test file that is a symlink to a regular file and exits 0 when that content fails on base", () => {
  const dir = redRepo();
  writeFiles(dir, { "src/fails.txt": "exit 1\n" });
  symlinkSync("../src/fails.txt", path.join(dir, "tests", "ln.sh"));
  const result = gate(dir, "red");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readRecordFile(dir, RED_FILE).tests, ["tests/ln.sh"]);
});
