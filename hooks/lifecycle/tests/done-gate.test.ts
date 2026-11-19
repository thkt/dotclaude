/// <reference types="node" />
import assert from "node:assert/strict";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CHECK_FILE, CONFIG_FILE, checkCommand, GATE_DIR_NAME } from "../../_lib/gate_record.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE = path.join(HERE, "..", "done_gate.ts");

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
  return spawnSync(process.execPath, [GATE, ...args], {
    cwd,
    env: isolatedEnv(),
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
