/// <reference types="node" />
import assert from "node:assert/strict";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { GATE_DIR_NAME, PUBLISH_LOG_FILE, treeHash } from "../../_lib/gate_record.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "publish_gate.ts");
const DONE_GATE = path.join(HERE, "..", "..", "lifecycle", "done_gate.ts");

function isolatedEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "publish-gate-test",
    GIT_AUTHOR_EMAIL: "publish-gate-test@example.invalid",
    GIT_COMMITTER_NAME: "publish-gate-test",
    GIT_COMMITTER_EMAIL: "publish-gate-test@example.invalid",
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

function repo(): string {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "publish-gate-")));
  git(dir, "init", "-q");
  mkdirSync(path.join(dir, "sub"));
  writeFileSync(path.join(dir, "sub", "kept.txt"), "kept\n");
  writeFileSync(path.join(dir, ".dotagents.json"), '{"check": ["sh", "-c", "exit 0"]}');
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--no-verify", "-m", "fixture");
  return dir;
}

function doneGate(cwd: string, ...args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [DONE_GATE, ...args], {
    cwd,
    env: isolatedEnv(),
    encoding: "utf8",
    timeout: 60_000,
  });
}

function gatedRepo(mode: "record" | "enforce" = "record"): string {
  const dir = repo();
  const on = doneGate(dir, "on", "--mode", mode);
  assert.equal(on.status, 0, on.stderr);
  return dir;
}

function passCheck(dir: string): void {
  const result = doneGate(dir, "check");
  assert.equal(result.status, 0, result.stderr);
}

function hook(input: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [HOOK], {
    input,
    env: isolatedEnv(),
    encoding: "utf8",
    timeout: 60_000,
  });
}

function bash(command: string, cwd: string): SpawnSyncReturns<string> {
  const result = hook(
    JSON.stringify({
      session_id: "publish-gate-session",
      tool_name: "Bash",
      tool_input: { command },
      cwd,
    }),
  );
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function logLines(dir: string): Array<Record<string, unknown>> {
  const gateDir = git(dir, "rev-parse", "--path-format=absolute", "--git-path", GATE_DIR_NAME).trim();
  const log = path.join(gateDir, PUBLISH_LOG_FILE);
  if (!existsSync(log)) {
    return [];
  }
  return readFileSync(log, "utf8")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

test("T-569 every matching form of git push, gh pr create and gh pr ready appends one line naming its kind", () => {
  const dir = gatedRepo();
  const cases: Array<[string, string]> = [
    ["git push", "git push"],
    ["git push origin HEAD", "git push"],
    ["git -c k=v push", "git push"],
    [`git -C ${dir} push`, "git push"],
    ["gh pr create", "gh pr create"],
    ['gh pr create --fill --title "x"', "gh pr create"],
    ["gh pr ready", "gh pr ready"],
    ["gh pr ready 12", "gh pr ready"],
  ];
  for (const [command, kind] of cases) {
    const before = logLines(dir).length;
    const result = bash(command, dir);
    assert.equal(result.stdout, "", command);
    const lines = logLines(dir);
    assert.equal(lines.length, before + 1, command);
    const last = lines[lines.length - 1];
    assert.equal(last.command, kind, command);
    assert.equal(last.session_id, "publish-gate-session", command);
    assert.equal(last.done, false, command);
    assert.equal(last.reason, "no-record", command);
    assert.equal(typeof last.tree, "string", command);
    assert.equal(typeof last.at, "string", command);
  }
});

test("T-570 help forms, gh pr ready --undo, git push inside a string, and other git commands append no line", () => {
  const dir = gatedRepo();
  for (const command of [
    "git push --help",
    "git push -h",
    "gh pr create --help",
    "gh pr ready --undo",
    "gh pr ready --help",
    'echo "git push"',
    'git commit -m "git push"',
    "git status",
  ]) {
    const result = bash(command, dir);
    assert.equal(result.stdout, "", command);
    assert.deepEqual(logLines(dir), [], command);
  }
});

test("T-571 a publish command after cd, after a semicolon, or behind env assignments appends one line", () => {
  const dir = gatedRepo();
  for (const command of ["cd sub && git push", "a; git push", "env A=1 git push"]) {
    const before = logLines(dir).length;
    bash(command, dir);
    assert.equal(logLines(dir).length, before + 1, command);
  }
});

test("T-572 in mode record stdout stays empty both before and after a passing check, and the line records the verdict", () => {
  const dir = gatedRepo("record");
  assert.equal(bash("git push", dir).stdout, "");
  passCheck(dir);
  assert.equal(bash("git push", dir).stdout, "");
  const lines = logLines(dir);
  assert.deepEqual(
    lines.map((line) => [line.done, line.reason]),
    [
      [false, "no-record"],
      [true, undefined],
    ],
  );
});

test("T-573 in mode enforce stdout stays empty once a check passed on the current tree", () => {
  const dir = gatedRepo("enforce");
  passCheck(dir);
  assert.equal(bash("gh pr create", dir).stdout, "");
  assert.equal(logLines(dir).length, 1);
});

test("T-574 in mode enforce with no passing check the command is denied with the status text in the reason", () => {
  const dir = gatedRepo("enforce");
  const status = doneGate(dir, "status");
  assert.equal(status.status, 1);
  const result = bash("git push origin HEAD", dir);
  const output = JSON.parse(result.stdout) as {
    hookSpecificOutput: { permissionDecision: string; permissionDecisionReason: string };
  };
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.ok(
    output.hookSpecificOutput.permissionDecisionReason.includes(status.stdout.trim()),
    output.hookSpecificOutput.permissionDecisionReason,
  );
  assert.ok(output.hookSpecificOutput.permissionDecisionReason.includes("commit"));
});

test("T-575 cd <dir> && git push and git -C <dir> push judge the working tree at <dir>, not the event cwd", () => {
  const plain = repo();
  const gated = gatedRepo();
  bash(`cd ${gated} && git push`, plain);
  assert.equal(logLines(gated).length, 1);
  bash(`git -C ${gated} push`, plain);
  assert.equal(logLines(gated).length, 2);
  assert.deepEqual(logLines(plain), []);
});

test("T-576 in mode record a cd whose target is not literal appends one unresolved line holding exactly at, session_id, command and unresolved", () => {
  const gated = gatedRepo("record");
  const result = bash('cd "$X" && git push', gated);
  assert.equal(result.stdout, "");
  const lines = logLines(gated);
  assert.equal(lines.length, 1);
  const [line] = lines;
  assert.deepEqual(Object.keys(line).sort(), ["at", "command", "session_id", "unresolved"]);
  assert.equal(line.unresolved, true);
  assert.equal(line.command, "git push");
  assert.equal(line.session_id, "publish-gate-session");
  assert.equal(typeof line.at, "string");
});

test("T-580 in mode enforce with no passing check an unresolved target is allowed with an unresolved line, while a plain git push is denied", () => {
  const gated = gatedRepo("enforce");
  assert.equal(bash('cd "$X" && git push', gated).stdout, "");
  const lines = logLines(gated);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].unresolved, true);
  const denied = JSON.parse(bash("git push", gated).stdout) as {
    hookSpecificOutput: { permissionDecision: string };
  };
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
});

test("T-581 every form whose target cannot be read from the line appends one unresolved line", () => {
  const gated = gatedRepo();
  for (const command of [
    "cd && git push",
    "cd - && git push",
    "cd ~/x && git push",
    'cd "$X" && git push',
    'cd "$(pwd)" && git push',
    "cd a b && git push",
    'git -C "$X" push',
    "git -C ~/x push",
    'cd "$X" && cd sub && git push',
    'cd "$X" && git -C sub push',
  ]) {
    const before = logLines(gated).length;
    assert.equal(bash(command, gated).stdout, "", command);
    const lines = logLines(gated);
    assert.equal(lines.length, before + 1, command);
    assert.equal(lines[lines.length - 1].unresolved, true, command);
    assert.equal(lines[lines.length - 1].tree, undefined, command);
  }
});

test("T-582 an absolute cd or -C after an unresolved cd judges the working tree at that path", () => {
  const plain = repo();
  const gated = gatedRepo();
  bash(`cd "$X" && cd ${gated} && git push`, plain);
  bash(`cd "$X" && git -C ${gated} push`, plain);
  const lines = logLines(gated);
  assert.equal(lines.length, 2);
  for (const line of lines) {
    assert.equal(typeof line.tree, "string");
    assert.equal(line.unresolved, undefined);
  }
  assert.deepEqual(logLines(plain), []);
});

test("T-583 an unresolved target from a cwd without on or outside git appends no line anywhere and leaves stdout empty", () => {
  const gated = gatedRepo();
  const plain = repo();
  const outside = realpathSync(mkdtempSync(path.join(tmpdir(), "publish-gate-outside-")));
  assert.equal(bash('cd "$X" && git push', plain).stdout, "");
  assert.equal(bash('cd "$X" && git push', outside).stdout, "");
  assert.deepEqual(logLines(plain), []);
  assert.deepEqual(logLines(gated), []);
});

test("T-584 an unresolved target leaves git status --porcelain unchanged", () => {
  const gated = gatedRepo("enforce");
  writeFileSync(path.join(gated, "untracked.txt"), "dirty\n");
  const statusBefore = git(gated, "status", "--porcelain");
  bash('cd "$X" && git push', gated);
  assert.equal(git(gated, "status", "--porcelain"), statusBefore);
});

test("T-577 a repo without on, a cwd outside git, and stdin that is not a JSON object end with empty stdout and exit 0", () => {
  const plain = repo();
  assert.equal(bash("git push", plain).stdout, "");
  assert.deepEqual(logLines(plain), []);

  const outside = realpathSync(mkdtempSync(path.join(tmpdir(), "publish-gate-outside-")));
  assert.equal(bash("git push", outside).stdout, "");

  for (const input of ["git push {", '["git push"]', '{"tool_input": {"command": 1}, "cwd": "/"}']) {
    const result = hook(input);
    assert.equal(result.status, 0, input);
    assert.equal(result.stdout, "", input);
  }
});

test("T-578 a line with two publish commands appends one line judged on the first", () => {
  const dir = gatedRepo();
  bash("git push && gh pr create", dir);
  const lines = logLines(dir);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].command, "git push");
});

test("T-579 running the hook leaves the tree hash and git status --porcelain unchanged", () => {
  const dir = gatedRepo("enforce");
  writeFileSync(path.join(dir, "untracked.txt"), "dirty\n");
  const hashBefore = treeHash(dir);
  const statusBefore = git(dir, "status", "--porcelain");
  bash("git push", dir);
  assert.equal(treeHash(dir), hashBefore);
  assert.equal(git(dir, "status", "--porcelain"), statusBefore);
});

test("T-601 a git push on the line after a comment line appends one line naming git push", () => {
  const dir = gatedRepo();
  assert.equal(bash("# note\ngit push", dir).stdout, "");
  const lines = logLines(dir);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].command, "git push");
});

test("T-602 in mode enforce with no passing check a git push on the line after a comment line is denied", () => {
  const dir = gatedRepo("enforce");
  const output = JSON.parse(bash("# note\ngit push", dir).stdout) as {
    hookSpecificOutput: { permissionDecision: string };
  };
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
});

test("T-604 a git push on the line after a line ending in && or after a blank line appends one line naming git push", () => {
  for (const input of ["echo a &&\ngit push", "echo a\n\ngit push"]) {
    const dir = gatedRepo();
    assert.equal(bash(input, dir).stdout, "", JSON.stringify(input));
    const lines = logLines(dir);
    assert.equal(lines.length, 1, JSON.stringify(input));
    assert.equal(lines[0].command, "git push", JSON.stringify(input));
  }
});

test("T-605 in mode enforce with no passing check a git push after a line ending in && or after a blank line is denied", () => {
  for (const input of ["echo a &&\ngit push", "echo a\n\ngit push"]) {
    const dir = gatedRepo("enforce");
    const output = JSON.parse(bash(input, dir).stdout) as {
      hookSpecificOutput: { permissionDecision: string };
    };
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny", JSON.stringify(input));
  }
});

test("T-608 a git push after then or do appends one line naming git push", () => {
  for (const input of ["if true; then git push; fi", "for r in a; do git push; done"]) {
    const dir = gatedRepo();
    assert.equal(bash(input, dir).stdout, "", input);
    const lines = logLines(dir);
    assert.equal(lines.length, 1, input);
    assert.equal(lines[0].command, "git push", input);
  }
});

test("T-609 in mode enforce with no passing check a git push after then or do is denied", () => {
  for (const input of ["if true; then git push; fi", "for r in a; do git push; done"]) {
    const dir = gatedRepo("enforce");
    const output = JSON.parse(bash(input, dir).stdout) as {
      hookSpecificOutput: { permissionDecision: string };
    };
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny", input);
  }
});

test("T-610 a cd <dir> inside a brace group judges the git push after it at <dir>, not the event cwd", () => {
  const plain = repo();
  const gated = gatedRepo();
  bash(`{ cd ${gated}; git push; }`, plain);
  assert.equal(logLines(gated).length, 1);
  assert.deepEqual(logLines(plain), []);
});
