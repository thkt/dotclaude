// Tier 1 checks on relay.ts: it runs the steps a workflow script declares as data and prints their
// results with a digest, reading the spec from the transcript of the agent that runs it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonical, runSpec } from "../relay.ts";
import type { Spec } from "../relay.ts";
import { digest, recentPrompts } from "../transcript.ts";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "relay.ts");
const fieldsOf = async (spec: Spec) => (await runSpec(spec)).fields;
// Waits until `holds` answers true, and fails the test when it does not within the limit. A fixed wait is too
// short on a loaded machine, and a wait with no limit hangs the suite.
const until = async (holds: () => boolean, what: string, limitMs = 10_000) => {
  const deadline = Date.now() + limitMs;
  while (!holds()) {
    assert.ok(Date.now() < deadline, `${what} within ${limitMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
const gone = (pid: string) => spawnSync("kill", ["-0", pid]).status !== 0;

test("each source reads its part of a command's result", async () => {
  const fields = await fieldsOf({
    defaults: { code: 0, held: true, text: "", line: "", late: true, quiet: "x" },
    steps: [
      {
        sh: "printf 'a\\nb\\n\\n'; exit 3",
        set: { code: "exit", held: "ok", text: "out", line: "last", late: "timed_out" },
      },
      { sh: "printf 'fine\\n'", set: { quiet: "fail_tail:5" } },
    ],
  });
  assert.deepEqual(fields, { code: 3, held: false, text: "a\nb\n", line: "b", late: false, quiet: "" });
});

// A failing check prints its failure on stdout and warnings on stderr. The tail has to show them in
// the order they were printed, or the failure falls out of the last lines.
test("a tail holds stdout and stderr in the order they arrived, and fail_tail keeps it only for a failed command", async () => {
  const fields = await fieldsOf({
    defaults: { both: "", failed: "", code: 0 },
    steps: [
      { sh: "echo out1; sleep 0.2; echo err1 >&2; sleep 0.2; echo out2", set: { both: "tail:3" } },
      { sh: "echo one; echo two; exit 1", set: { failed: "fail_tail:1" } },
      { sh: "exit 0", cwd: "/nonexistent-directory", set: { code: "exit" } },
    ],
  });
  assert.deepEqual(fields, { both: "out1\nerr1\nout2", failed: "two", code: -1 });
});

// A compound command has children. Ending only the shell left them writing into the worktree after
// the step was reported as timed out.
test("a command that runs past its timeout reads as timed out with exit -1, and none of its children is left running", async () => {
  const dir = mkdtempSync(join(tmpdir(), "relay-"));
  const pidFile = join(dir, "child.pid");
  const fields = await fieldsOf({
    defaults: { code: 0, late: false },
    steps: [
      {
        sh: `sleep 30 & echo $! > '${pidFile}'; wait`,
        timeout_ms: 300,
        set: { code: "exit", late: "timed_out" },
      },
    ],
  });
  assert.deepEqual(fields, { code: -1, late: true });
  const child = readFileSync(pidFile, "utf8").trim();
  await until(() => gone(child), "the background sleep is gone");
});

test("a step runs only when every field named in when holds its value, and an unset field keeps its default", async () => {
  const fields = await fieldsOf({
    defaults: { existing: false, created: false, head: "", skipped: "default" },
    steps: [
      { sh: "exit 1", set: { existing: "ok" } },
      { sh: "exit 0", when: { existing: false }, set: { created: "ok" } },
      { sh: "echo abc", when: { existing: false, created: true }, set: { head: "out" } },
      { sh: "echo never", when: { existing: true }, set: { skipped: "out" } },
    ],
  });
  assert.deepEqual(fields, { existing: false, created: true, head: "abc", skipped: "default" });
});

// The setup commands stop at the first failure: an internal field carries whether to go on.
test("append collects one value per step, and a field named with a leading underscore steers later steps", async () => {
  const { fields } = await runSpec({
    defaults: { exits: [], _ok: true },
    steps: ["exit 0", "exit 2", "exit 0"].map((sh) => ({
      sh,
      when: { _ok: true },
      set: { _ok: "ok" },
      append: { exits: "exit" },
    })),
  });
  assert.deepEqual(fields.exits, [0, 2]);
});

test("a step receives its stdin and runs in its cwd", async () => {
  const dir = mkdtempSync(join(tmpdir(), "relay-"));
  const fields = await fieldsOf({
    defaults: { echoed: "", where: "" },
    steps: [
      { sh: "cat", stdin: '{"quote":"\'","dollar":"$HOME"}', set: { echoed: "out" } },
      { sh: "pwd -P", cwd: dir, set: { where: "out" } },
    ],
  });
  assert.equal(fields.echoed, '{"quote":"\'","dollar":"$HOME"}');
  assert.ok(String(fields.where).endsWith(dir.split("/").at(-1) ?? ""));
});

test("an unknown source fails the run instead of leaving a field at its default", async () => {
  await assert.rejects(fieldsOf({ defaults: { a: "" }, steps: [{ sh: "true", set: { a: "stderr" } }] }));
});

// ---- the command an agent runs ----
const SPEC: Spec = {
  defaults: { text: "", code: -1, _hidden: "" },
  steps: [
    { sh: "printf 'ﾉｰﾄ \"q\" `c` $HOME\\n'", set: { text: "out", _hidden: "out" } },
    { sh: "exit 4", set: { code: "exit" } },
  ],
};
// The prompt as the harness stores it: a frame line, then every line of the computed text indented.
const promptWith = (spec: Spec) => {
  const json = JSON.stringify(spec);
  const text = `Run the command.\n1. relay\nRELAY_SPEC ${digest(json)}\n${json}\nRELAY_SPEC_END`;
  return { wanted: digest(json), prompt: `[Workflow harness — computed task]\n${text.replace(/^/gm, "  ")}` };
};
const project = () => {
  const root = mkdtempSync(join(tmpdir(), "relay-"));
  const projects = join(root, "projects");
  const agents = join(projects, "-abs-repo", "session-1", "subagents", "workflows", "wf_1");
  const tmp = join(root, "tmp");
  mkdirSync(agents, { recursive: true });
  mkdirSync(tmp);
  return { root, projects, agents, tmp, log: join(root, "ran.log") };
};
const store = (agents: string, id: string, prompt: string) =>
  writeFileSync(
    join(agents, `agent-${id}.jsonl`),
    `${JSON.stringify({ type: "user", message: { role: "user", content: prompt } })}\n{"type":"assistant"}\n`,
  );
const cli = (args: string[], tmp: string, env: Record<string, string> = {}) => {
  const r = spawnSync("node", [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, TMPDIR: tmp, ...env },
  });
  return { code: r.status, out: JSON.parse(r.stdout) };
};
const ranLines = (log: string) => (existsSync(log) ? readFileSync(log, "utf8") : "");
// A spec whose every step writes its name to the log, so a test can see which steps ran.
const logging = (log: string, names: string[], timeout_ms?: number): Spec => ({
  defaults: Object.fromEntries(names.map((name) => [name, ""])),
  steps: names.map((name) => ({
    sh: `echo ${name} >> '${log}'; echo ${name}`,
    ...(timeout_ms ? { timeout_ms } : {}),
    set: { [name]: "out" },
  })),
});

test("the command runs the spec stored in a transcript and prints the fields with their digest, leaving internal fields out", () => {
  const { projects, agents, tmp } = project();
  const { wanted, prompt } = promptWith(SPEC);
  store(agents, "a1", prompt);
  const { code, out } = cli([wanted, "--projects", projects], tmp);
  assert.equal(code, 0);
  const { relay_check, ...fields } = out;
  assert.deepEqual(fields, { text: 'ﾉｰﾄ "q" `c` $HOME', code: 4 });
  assert.equal(relay_check, digest(canonical(fields)));
});

test("the digest of the fields does not depend on the order they come back in", () => {
  assert.equal(canonical({ b: 1, a: "x" }), canonical({ a: "x", b: 1 }));
  assert.notEqual(digest(canonical({ a: "x", b: 1 })), digest(canonical({ a: "y", b: 1 })));
});

// No step ran, so the agent may hand the spec over in a file. relay_missing says so, apart from relay_error.
test("a digest no transcript carries, or a transcript whose spec was altered, prints relay_missing and runs nothing", () => {
  const { projects, agents, tmp, log } = project();
  const { wanted, prompt } = promptWith(logging(log, ["only"]));
  store(agents, "a1", prompt.replace("echo only >>", "echo other >>"));
  for (const args of [[wanted, "--projects", projects], ["00000000:1", "--projects", projects]]) {
    const { code, out } = cli(args, tmp);
    assert.equal(code, 1, args.join(" "));
    assert.equal(typeof out.relay_missing, "string");
  }
  assert.equal(typeof cli(["not-a-digest"], tmp).out.relay_error, "string");
  assert.equal(ranLines(log), "");
});

test("a spec handed over in a file runs when its digest matches, and is refused when it does not", () => {
  const { root, tmp } = project();
  const json = JSON.stringify(SPEC);
  const file = join(root, "spec.json");
  writeFileSync(file, json);
  assert.equal(cli([digest(json), "--spec", file], tmp).out.code, 4);
  writeFileSync(file, json.replace("exit 4", "exit 5"));
  const refused = cli([digest(json), "--spec", file], tmp);
  assert.equal(refused.code, 1);
  assert.match(refused.out.relay_missing, /does not have the digest/);
});

// The agent's Bash call is capped at 600 s. A call stops before a step that could run past the
// budget and asks to be run again, so its line is always printed before the tool kills it.
test("a call that cannot fit the next step asks to be run again, and the next call goes on from that step", () => {
  const { projects, agents, tmp, log } = project();
  const { wanted, prompt } = promptWith(logging(log, ["first", "second", "third"], 400));
  store(agents, "a1", prompt);
  const args = [wanted, "--projects", projects];
  // The first step of a call always runs. A second 400 ms step does not fit in a 300 ms budget.
  const env = { RELAY_CALL_BUDGET_MS: "300" };
  assert.deepEqual(cli(args, tmp, env).out, { relay_continue: true });
  assert.deepEqual(cli(args, tmp, env).out, { relay_continue: true });
  const { relay_check, ...fields } = cli(args, tmp, env).out;
  assert.deepEqual(fields, { first: "first", second: "second", third: "third" });
  assert.equal(relay_check, digest(canonical(fields)));
  assert.equal(ranLines(log), "first\nsecond\nthird\n");
});

// Every snapshot and every check of a run carries the same spec. A later agent that picked up the
// state of an earlier agent's call that never finished skipped the check and returned its old result.
test("an agent whose transcript carries the same spec as an unfinished call of another agent starts from the first step", () => {
  const { projects, agents, tmp, log } = project();
  const { wanted, prompt } = promptWith(logging(log, ["first", "second"], 400));
  const args = [wanted, "--projects", projects];
  store(agents, "a1", prompt);
  assert.deepEqual(cli(args, tmp, { RELAY_CALL_BUDGET_MS: "300" }).out, { relay_continue: true });
  // The first agent never runs the command again. A second agent gets the same spec.
  store(agents, "a2", prompt);
  const { relay_check, ...fields } = cli(args, tmp).out;
  assert.deepEqual(fields, { first: "first", second: "second" });
  assert.equal(relay_check, digest(canonical(fields)));
  assert.equal(ranLines(log), "first\nfirst\nsecond\n");
});

// The prompt tells the agent to run the command again until a line with relay_check appears. A step
// that writes, such as opening the PR, must not run a second time for an agent whose call finished.
test("the agent that ran every step gets the same line when it runs the command again, and no step runs twice", () => {
  const { projects, agents, tmp, log } = project();
  const { wanted, prompt } = promptWith(logging(log, ["write"]));
  store(agents, "a1", prompt);
  const args = [wanted, "--projects", projects];
  const first = cli(args, tmp);
  assert.deepEqual(cli(args, tmp), first);
  assert.equal(ranLines(log), "write\n");
});

// An agent that miscopies a long field returns fields without their digest. The script then asks a
// second agent for the same line, and the commands must not run a second time.
test("--replay prints the line the complete call printed, runs no step, and refuses a check that line does not carry", () => {
  const { projects, agents, tmp, log } = project();
  const { wanted, prompt } = promptWith({
    defaults: { text: "" },
    steps: [{ sh: `echo once >> '${log}'; echo ■■■■■■■■■■`, set: { text: "out" } }],
  });
  store(agents, "a1", prompt);
  assert.equal(cli([wanted, "--replay", "00000000:0"], tmp).code, 1, "nothing is kept before the call");
  const ran = cli([wanted, "--projects", projects], tmp);
  assert.deepEqual(cli([wanted, "--replay", ran.out.relay_check], tmp), ran);
  assert.equal(ranLines(log), "once\n");
  // The line goes only to the agent that saw it. A reply naming another check came from another call, or from
  // an agent that never ran the command.
  for (const check of [["00000000:0"], []]) {
    const refused = cli([wanted, "--replay", ...check], tmp);
    assert.equal(refused.code, 1);
    assert.match(refused.out.relay_error, /does not carry the check/);
  }
});

// Every snapshot shares one spec. When the call before a write did not finish, --replay must not
// answer with the snapshot taken before it: the Issue and the tree would go unobserved.
test("--replay after a call that did not finish prints relay_error, not the line of the call before it", () => {
  const { projects, agents, tmp, log } = project();
  const { wanted, prompt } = promptWith(logging(log, ["first", "second"], 400));
  const args = [wanted, "--projects", projects];
  store(agents, "a1", prompt);
  const first = cli(args, tmp);
  assert.equal(first.code, 0);
  assert.equal(cli([wanted, "--replay", first.out.relay_check], tmp).code, 0);
  store(agents, "a2", prompt);
  assert.deepEqual(cli(args, tmp, { RELAY_CALL_BUDGET_MS: "300" }).out, { relay_continue: true });
  const replayed = cli([wanted, "--replay", first.out.relay_check], tmp);
  assert.equal(replayed.code, 1);
  assert.match(replayed.out.relay_error, /no result/);
});

// A Bash call returns about 30,000 characters. A longer line reaches the agent cut short, and no
// reply can match its digest.
test("a result longer than a Bash call returns prints relay_error naming the length, and the caller running the command again runs no step", () => {
  const { projects, agents, tmp, log } = project();
  const { wanted, prompt } = promptWith({
    defaults: { big: "" },
    steps: [{ sh: `echo ran >> '${log}'; head -c 40000 /dev/zero | tr '\\0' 'x'`, set: { big: "out" } }],
  });
  store(agents, "a1", prompt);
  const args = [wanted, "--projects", projects];
  const first = cli(args, tmp);
  assert.equal(first.code, 1);
  assert.match(first.out.relay_error, /4\d{4} characters/);
  // The step may have written something. Running the command again must not run it a second time.
  assert.deepEqual(cli(args, tmp), first);
  assert.equal(ranLines(log), "ran\n");
  assert.equal(cli([wanted, "--replay"], tmp).code, 1);
});

// A failing check's last 80 lines can be a minified error or a progress bar drawn with carriage returns.
// Returning them whole made the relay an error, and the failure never reached the repair.
test("a tail is cut to its last characters, so a failing command with wide lines still returns its exit code and the end of its output", async () => {
  const fields = await fieldsOf({
    defaults: { code: 0, tail: "" },
    steps: [
      {
        sh: "head -c 20000 /dev/zero | tr '\\0' 'x'; echo; echo the failure is here; exit 1",
        set: { code: "exit", tail: "fail_tail:80" },
      },
    ],
  });
  assert.equal(fields.code, 1);
  assert.equal(String(fields.tail).length, 6000);
  assert.ok(String(fields.tail).endsWith("the failure is here"));
});

// A step runs in its own process group, so a signal sent to relay.ts does not reach it by itself.
test("ending the command while a step runs ends that step too", async () => {
  const { projects, agents, tmp, root } = project();
  const pidFile = join(root, "step.pid");
  const { wanted, prompt } = promptWith({
    defaults: { a: "" },
    steps: [{ sh: `sleep 30 & echo $! > '${pidFile}'; wait`, timeout_ms: 20000, set: { a: "out" } }],
  });
  store(agents, "a1", prompt);
  const child = spawn("node", [script, wanted, "--projects", projects], { env: { ...process.env, TMPDIR: tmp } });
  const closed = new Promise((resolve) => child.on("close", resolve));
  const started = () => existsSync(pidFile) && readFileSync(pidFile, "utf8").trim() !== "";
  await until(() => started() || child.exitCode !== null, "the step starts");
  assert.ok(started(), "the command ended before its step started");
  const step = readFileSync(pidFile, "utf8").trim();
  child.kill("SIGTERM");
  await closed;
  await until(() => gone(step), "the step's sleep is gone");
});

// A call can be ended in the middle of a step. The steps before it ran, and running them again would repeat
// a write.
test("a call ended in the middle of a step goes on from that step, and the steps before it do not run again", async () => {
  const { projects, agents, tmp, root, log } = project();
  const pidFile = join(root, "step.pid");
  const quick = join(root, "quick");
  const { wanted, prompt } = promptWith({
    defaults: { first: "", second: "" },
    steps: [
      { sh: `echo first >> '${log}'; echo first`, set: { first: "out" } },
      {
        sh: `echo second >> '${log}'; [ -e '${quick}' ] || { sleep 30 & echo $! > '${pidFile}'; wait; }; echo second`,
        timeout_ms: 20000,
        set: { second: "out" },
      },
    ],
  });
  store(agents, "a1", prompt);
  const args = [wanted, "--projects", projects];
  const child = spawn("node", [script, ...args], { env: { ...process.env, TMPDIR: tmp } });
  const closed = new Promise((resolve) => child.on("close", resolve));
  const started = () => existsSync(pidFile) && readFileSync(pidFile, "utf8").trim() !== "";
  await until(() => started() || child.exitCode !== null, "the second step starts");
  assert.ok(started(), "the command ended before its second step started");
  child.kill("SIGTERM");
  await closed;
  writeFileSync(quick, "");
  const again = cli(args, tmp);
  assert.equal(again.code, 0);
  assert.deepEqual([again.out.first, again.out.second], ["first", "second"]);
  assert.equal(ranLines(log), "first\nsecond\nsecond\n");
});

// The helper's own session is read first, so a relay does not open the transcripts of every other session. The
// variable can name a session that holds other agents but not this one, and the spec is still found.
test("the spec is found when CLAUDE_CODE_SESSION_ID names a session that holds other transcripts but not the agent's", () => {
  const { projects, agents, tmp } = project();
  const { wanted, prompt } = promptWith(SPEC);
  const elsewhere = join(projects, "-abs-repo", "session-2", "subagents");
  mkdirSync(elsewhere, { recursive: true });
  store(agents, "other", "another agent's prompt");
  store(elsewhere, "a1", prompt);
  const args = [wanted, "--projects", projects];
  assert.equal(cli(args, tmp, { CLAUDE_CODE_SESSION_ID: "session-1" }).code, 0);
  assert.equal(cli(args, tmp, { CLAUDE_CODE_SESSION_ID: "no-such-session" }).code, 0);
});

test("a transcript of the helper's own session is read before a newer one of another session", () => {
  const { projects, agents } = project();
  const elsewhere = join(projects, "-abs-repo", "session-2", "subagents");
  mkdirSync(elsewhere, { recursive: true });
  store(agents, "own", "MARK own");
  store(elsewhere, "newer", "MARK newer");
  const earlier = new Date(Date.now() - 60_000);
  utimesSync(join(agents, "agent-own.jsonl"), earlier, earlier);
  const order = (session: string | undefined) => {
    const before = process.env.CLAUDE_CODE_SESSION_ID;
    if (session === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
    else process.env.CLAUDE_CODE_SESSION_ID = session;
    try {
      return [...recentPrompts(projects, "MARK")].map((found) => found.text);
    } finally {
      if (before === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
      else process.env.CLAUDE_CODE_SESSION_ID = before;
    }
  };
  assert.deepEqual(order("session-1"), ["MARK own", "MARK newer"]);
  assert.deepEqual(order(undefined), ["MARK newer", "MARK own"]);
});

// The agent reaches --spec only after relay_missing. A file it failed to write is one more case of no step run.
test("a spec file that does not exist prints relay_missing", () => {
  const { tmp } = project();
  const { wanted } = promptWith(SPEC);
  const { code, out } = cli([wanted, "--spec", join(tmp, "none.json")], tmp);
  assert.equal(code, 1);
  assert.match(out.relay_missing, /cannot be read/);
});

// The workflow starts the helper on bun when bun runs, and the rest of this file starts it on node.
test("the command prints the same line on bun as on node", { skip: spawnSync("bun", ["--version"]).status !== 0 }, () => {
  const { projects, agents, tmp } = project();
  const { wanted, prompt } = promptWith({
    defaults: { text: "", code: 0, late: false },
    steps: [
      { sh: "printf 'ﾉｰﾄ\\n'; echo warn >&2", set: { text: "tail:2" } },
      { sh: "sleep 5", timeout_ms: 300, set: { code: "exit", late: "timed_out" } },
    ],
  });
  store(agents, "a1", prompt);
  const onNode = cli([wanted, "--projects", projects], tmp);
  store(agents, "a2", prompt);
  const bun = spawnSync("bun", [script, wanted, "--projects", projects], {
    encoding: "utf8",
    env: { ...process.env, TMPDIR: tmp },
  });
  assert.deepEqual({ code: bun.status, out: JSON.parse(bun.stdout) }, onNode);
  assert.deepEqual(onNode.out.late, true);
});

test("a state file is kept per agent, and the line for --replay per spec", () => {
  const { projects, agents, tmp } = project();
  const { wanted, prompt } = promptWith(SPEC);
  store(agents, "a1", prompt);
  cli([wanted, "--projects", projects], tmp);
  const name = wanted.replace(":", "-");
  const files = readdirSync(tmp).sort();
  assert.equal(files.length, 2);
  assert.ok(files.includes(`relay-${name}.out.json`));
  assert.ok(files.some((file) => new RegExp(`^relay-${name}-[0-9a-f]{8}-\\d+\\.json$`).test(file)));
});
