/// <reference types="node" />
import assert from "node:assert/strict";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { GATE_DIR_NAME, LAUNCH_FILE, PUBLISH_LOG_FILE, treeHash } from "../../_lib/gate_record.ts";
import { git, isolatedEnv } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "publish_gate.ts");
const DONE_GATE = path.join(HERE, "..", "..", "lifecycle", "done_gate.ts");

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

function gateDir(dir: string): string {
  return git(dir, "rev-parse", "--path-format=absolute", "--git-path", GATE_DIR_NAME).trim();
}

function launchedRepo(mode: "record" | "enforce"): string {
  const dir = gatedRepo(mode);
  writeFileSync(path.join(gateDir(dir), LAUNCH_FILE), "{}\n");
  return dir;
}

function denialReason(result: SpawnSyncReturns<string>): string {
  const output = JSON.parse(result.stdout) as {
    hookSpecificOutput: { permissionDecision: string; permissionDecisionReason: string };
  };
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  return output.hookSpecificOutput.permissionDecisionReason;
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
  const log = path.join(gateDir(dir), PUBLISH_LOG_FILE);
  if (!existsSync(log)) {
    return [];
  }
  return readFileSync(log, "utf8")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

test("every matching form of git push, gh pr create and gh pr ready appends one line naming its kind", () => {
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

test("help forms, gh pr ready --undo, git push inside a string, and other git commands append no line", () => {
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

test("a publish command after cd, after a semicolon, or behind env assignments appends one line", () => {
  const dir = gatedRepo();
  for (const command of ["cd sub && git push", "a; git push", "env A=1 git push"]) {
    const before = logLines(dir).length;
    bash(command, dir);
    assert.equal(logLines(dir).length, before + 1, command);
  }
});

test("in mode record stdout stays empty both before and after a passing check, and the line records the verdict", () => {
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

test("in mode enforce stdout stays empty once a check passed on the current tree", () => {
  const dir = gatedRepo("enforce");
  passCheck(dir);
  assert.equal(bash("gh pr create", dir).stdout, "");
  assert.equal(logLines(dir).length, 1);
});

test("in mode enforce with no passing check the command is denied with the status text in the reason", () => {
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

test("cd <dir> && git push and git -C <dir> push judge the working tree at <dir>, not the event cwd", () => {
  const plain = repo();
  const gated = gatedRepo();
  bash(`cd ${gated} && git push`, plain);
  assert.equal(logLines(gated).length, 1);
  bash(`git -C ${gated} push`, plain);
  assert.equal(logLines(gated).length, 2);
  assert.deepEqual(logLines(plain), []);
});

test("in mode record a cd whose target is not literal appends one unresolved line holding exactly at, session_id, command and unresolved", () => {
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

test("in mode enforce with no launch.json an unresolved target is denied with an unresolved line and a reason naming a literal path", () => {
  const gated = gatedRepo("enforce");
  const reason = denialReason(bash('cd "$X" && git push', gated));
  assert.ok(reason.includes("literal path"), reason);
  assert.ok(!reason.includes("launch.ts"), reason);
  const lines = logLines(gated);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].unresolved, true);
  denialReason(bash("git push", gated));
});

test("every form whose target cannot be read from the line appends one unresolved line", () => {
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

test("an absolute cd or -C after an unresolved cd judges the working tree at that path", () => {
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

test("an unresolved target from a cwd without on or outside git appends no line anywhere and leaves stdout empty", () => {
  const gated = gatedRepo();
  const plain = repo();
  const outside = realpathSync(mkdtempSync(path.join(tmpdir(), "publish-gate-outside-")));
  assert.equal(bash('cd "$X" && git push', plain).stdout, "");
  assert.equal(bash('cd "$X" && git push', outside).stdout, "");
  assert.deepEqual(logLines(plain), []);
  assert.deepEqual(logLines(gated), []);
});

test("an unresolved target leaves git status --porcelain unchanged", () => {
  const gated = gatedRepo("enforce");
  writeFileSync(path.join(gated, "untracked.txt"), "dirty\n");
  const statusBefore = git(gated, "status", "--porcelain");
  bash('cd "$X" && git push', gated);
  assert.equal(git(gated, "status", "--porcelain"), statusBefore);
});

test("a repo without on, a cwd outside git, and stdin that is not a JSON object end with empty stdout and exit 0", () => {
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

test("a line with two publish commands appends one line judged on the first", () => {
  const dir = gatedRepo();
  bash("git push && gh pr create", dir);
  const lines = logLines(dir);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].command, "git push");
});

test("running the hook leaves the tree hash and git status --porcelain unchanged", () => {
  const dir = gatedRepo("enforce");
  writeFileSync(path.join(dir, "untracked.txt"), "dirty\n");
  const hashBefore = treeHash(dir);
  const statusBefore = git(dir, "status", "--porcelain");
  bash("git push", dir);
  assert.equal(treeHash(dir), hashBefore);
  assert.equal(git(dir, "status", "--porcelain"), statusBefore);
});

test("a git push on the line after a comment line appends one line naming git push", () => {
  const dir = gatedRepo();
  assert.equal(bash("# note\ngit push", dir).stdout, "");
  const lines = logLines(dir);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].command, "git push");
});

test("in mode enforce with no passing check a git push on the line after a comment line is denied", () => {
  const dir = gatedRepo("enforce");
  const output = JSON.parse(bash("# note\ngit push", dir).stdout) as {
    hookSpecificOutput: { permissionDecision: string };
  };
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
});

test("a git push on the line after a line ending in && or after a blank line appends one line naming git push", () => {
  for (const input of ["echo a &&\ngit push", "echo a\n\ngit push"]) {
    const dir = gatedRepo();
    assert.equal(bash(input, dir).stdout, "", JSON.stringify(input));
    const lines = logLines(dir);
    assert.equal(lines.length, 1, JSON.stringify(input));
    assert.equal(lines[0].command, "git push", JSON.stringify(input));
  }
});

test("in mode enforce with no passing check a git push after a line ending in && or after a blank line is denied", () => {
  for (const input of ["echo a &&\ngit push", "echo a\n\ngit push"]) {
    const dir = gatedRepo("enforce");
    const output = JSON.parse(bash(input, dir).stdout) as {
      hookSpecificOutput: { permissionDecision: string };
    };
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny", JSON.stringify(input));
  }
});

test("a git push after then or do appends one line naming git push", () => {
  for (const input of ["if true; then git push; fi", "for r in a; do git push; done"]) {
    const dir = gatedRepo();
    assert.equal(bash(input, dir).stdout, "", input);
    const lines = logLines(dir);
    assert.equal(lines.length, 1, input);
    assert.equal(lines[0].command, "git push", input);
  }
});

test("in mode enforce with no passing check a git push after then or do is denied", () => {
  for (const input of ["if true; then git push; fi", "for r in a; do git push; done"]) {
    const dir = gatedRepo("enforce");
    const output = JSON.parse(bash(input, dir).stdout) as {
      hookSpecificOutput: { permissionDecision: string };
    };
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny", input);
  }
});

test("a cd <dir> inside a brace group judges the git push after it at <dir>, not the event cwd", () => {
  const plain = repo();
  const gated = gatedRepo();
  bash(`{ cd ${gated}; git push; }`, plain);
  assert.equal(logLines(gated).length, 1);
  assert.deepEqual(logLines(plain), []);
});

test("a publish command inside or after a subshell appends its line to the working tree the subshell leaves in effect", () => {
  const a = gatedRepo();
  const b = gatedRepo();
  const c = gatedRepo();
  const cases: Array<[string, string]> = [
    ["(git push)", a],
    [`(cd ${b} && git push)`, b],
    [`(cd ${b} && true); git push`, a],
    [`(\ncd ${b}\n)\ngit push`, a],
    [`x=$(cd ${b} && git rev-parse HEAD); git push`, a],
    ['(cd "$X" && true); git push', a],
    [`cd ${b} && (cd "$X" && true); git push`, b],
    [`(cd ${b}; (cd ${c}; true); git push)`, b],
    ["case x in a) git push;; esac", a],
    [`f() { cd ${b}; }; git push`, b],
  ];
  for (const [command, expected] of cases) {
    const before = [a, b, c].map((dir) => logLines(dir).length);
    assert.equal(bash(command, a).stdout, "", command);
    const after = [a, b, c].map((dir) => logLines(dir).length);
    const grown = [a, b, c].filter((_, index) => after[index] === before[index] + 1);
    assert.deepEqual(grown, [expected], command);
    const lines = logLines(expected);
    const last = lines[lines.length - 1];
    assert.equal(last.command, "git push", command);
    assert.equal(last.unresolved, undefined, command);
    assert.equal(typeof last.tree, "string", command);
  }
});

test("an unresolved cd before a subshell stays unresolved after the subshell closes and appends an unresolved line to the event cwd", () => {
  const a = gatedRepo();
  const b = gatedRepo();
  bash(`cd "$X"; (cd ${b} && true); git push`, a);
  const lines = logLines(a);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].unresolved, true);
  assert.deepEqual(logLines(b), []);
});

test("in mode enforce a push inside a subshell is judged at the subshell cd target and a push after the subshell at the event cwd", () => {
  const a = gatedRepo("enforce");
  const b = gatedRepo("enforce");
  passCheck(a);
  const denied = JSON.parse(bash(`(cd ${b} && git push)`, a).stdout) as {
    hookSpecificOutput: { permissionDecision: string };
  };
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.equal(bash(`(cd ${b} && true); git push`, a).stdout, "");
});

test("in mode enforce in a working tree with launch.json git push and gh pr create are denied after a passing check, naming launch.ts publish --worktree and the root", () => {
  const dir = launchedRepo("enforce");
  passCheck(dir);
  for (const command of ["git push", "gh pr create", "cd sub && git push"]) {
    const reason = denialReason(bash(command, dir));
    assert.ok(reason.includes(`launch.ts publish --worktree ${dir}`), reason);
    assert.ok(!reason.includes(path.join(dir, "sub")), reason);
  }
  const lines = logLines(dir);
  assert.equal(lines.length, 3);
  for (const line of lines) {
    assert.equal(line.direct, true);
    assert.equal(line.done, true);
  }
});

test("in mode record in a working tree with launch.json git push and gh pr create are allowed and their lines hold direct true", () => {
  const dir = launchedRepo("record");
  for (const command of ["git push", "gh pr create"]) {
    assert.equal(bash(command, dir).stdout, "", command);
  }
  const lines = logLines(dir);
  assert.deepEqual(
    lines.map((line) => [line.command, line.direct, line.done, line.reason]),
    [
      ["git push", true, false, "no-record"],
      ["gh pr create", true, false, "no-record"],
    ],
  );
});

test("in a working tree with launch.json gh pr ready is judged as without it, before and after a passing check", () => {
  const dir = launchedRepo("enforce");
  assert.ok(denialReason(bash("gh pr ready", dir)).includes("commit"));
  passCheck(dir);
  assert.equal(bash("gh pr ready", dir).stdout, "");
  const lines = logLines(dir);
  assert.deepEqual(
    lines.map((line) => [line.command, line.done, line.direct]),
    [
      ["gh pr ready", false, undefined],
      ["gh pr ready", true, undefined],
    ],
  );
});

test("with the cwd gate in mode enforce cd \"$WT\" && git push and git -C \"$(pwd)\" push are denied with an unresolved line", () => {
  const dir = gatedRepo("enforce");
  for (const command of ['cd "$WT" && git push', 'git -C "$(pwd)" push']) {
    const before = logLines(dir).length;
    denialReason(bash(command, dir));
    const lines = logLines(dir);
    assert.equal(lines.length, before + 1, command);
    assert.equal(lines[lines.length - 1].unresolved, true, command);
  }
});

test("with the cwd gate in mode enforce and launch.json an unresolved target is denied with a reason naming launch.ts publish --worktree and the root", () => {
  const dir = launchedRepo("enforce");
  const reason = denialReason(bash('cd "$WT" && git push', path.join(dir, "sub")));
  assert.ok(reason.includes(`launch.ts publish --worktree ${dir}`), reason);
});

test("with the cwd gate in mode enforce an unclosed quote is denied with the scan error in the reason and an error line", () => {
  const dir = gatedRepo("enforce");
  const reason = denialReason(bash("echo 'a && git push", dir));
  assert.ok(reason.includes("No closing quotation"), reason);
  const lines = logLines(dir);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].error, true);
  assert.equal(lines[0].session_id, "publish-gate-session");
});

test("a scan error on a command without push or gh is allowed with no line even in mode enforce", () => {
  const dir = gatedRepo("enforce");
  const result = hook(
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "echo 'a" }, cwd: dir, session_id: "push-gh" }),
  );
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.ok(result.stderr.includes("allowed after an error"), result.stderr);
  assert.deepEqual(logLines(dir), []);
});

test("with the cwd gate in mode record unresolved targets and unclosed quotes are allowed, recording as before", () => {
  const dir = gatedRepo("record");
  for (const command of ['cd "$WT" && git push', 'git -C "$(pwd)" push']) {
    assert.equal(bash(command, dir).stdout, "", command);
  }
  const quoted = bash("echo 'a && git push", dir);
  assert.equal(quoted.stdout, "");
  assert.ok(quoted.stderr.includes("allowed after an error"), quoted.stderr);
  const lines = logLines(dir);
  assert.deepEqual(
    lines.map((line) => Object.keys(line).sort()),
    [
      ["at", "command", "session_id", "unresolved"],
      ["at", "command", "session_id", "unresolved"],
    ],
  );
});

test("from a cwd without on or outside git unresolved targets and unclosed quotes are allowed with no line", () => {
  const gated = gatedRepo("enforce");
  const plain = repo();
  const outside = realpathSync(mkdtempSync(path.join(tmpdir(), "publish-gate-outside-")));
  for (const cwd of [plain, outside]) {
    for (const command of ['cd "$WT" && git push', 'git -C "$(pwd)" push', "echo 'a && git push"]) {
      assert.equal(bash(command, cwd).stdout, "", command);
    }
  }
  assert.deepEqual(logLines(plain), []);
  assert.deepEqual(logLines(gated), []);
});

test("launch.ts publish --worktree <path> is not found as a publish command in either mode", () => {
  for (const mode of ["record", "enforce"] as const) {
    const dir = launchedRepo(mode);
    assert.equal(bash(`launch.ts publish --worktree ${dir}`, dir).stdout, "", mode);
    assert.equal(bash(`bun skills/implement/scripts/launch.ts publish --worktree ${dir}`, dir).stdout, "", mode);
    assert.deepEqual(logLines(dir), [], mode);
  }
});

test("in mode enforce with launch.json an unresolved gh pr ready is denied without naming launch.ts publish", () => {
  const dir = launchedRepo("enforce");
  const reason = denialReason(bash('cd "$WT" && gh pr ready', dir));
  assert.ok(reason.includes("literal path"), reason);
  assert.ok(!reason.includes("launch.ts"), reason);
});
