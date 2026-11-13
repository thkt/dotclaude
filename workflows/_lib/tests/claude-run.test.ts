// Tier 1 checks on claude-run.ts: a relay's commands run with no agent, the other agent() calls go
// to a child session, and a run started with the same state file runs nothing a second time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHost, holdState, main, probeChild, readCall } from "../claude-run.ts";
import type { ChildOutcome, ChildRun } from "../claude-run.ts";
import { canonical } from "../relay.ts";
import type { Spec } from "../relay.ts";
import { runWorkflow } from "../run-workflow.ts";
import { digest } from "../transcript.ts";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "claude-run.ts");
const specBlock = (spec: Spec) => {
  const json = JSON.stringify(spec);
  return `RELAY_SPEC ${digest(json)}\n${json}\nRELAY_SPEC_END`;
};
const relayPrompt = (spec: Spec, extra = "") => `Run the command.\n1. relay\n${specBlock(spec)}${extra}`;
// The options the script's relay() gives a relay: a schema that asks for relay_check.
const relayOpts = (label: string) => ({
  label,
  model: "haiku",
  schema: { type: "object", properties: { relay_check: { type: "string" }, relay_note: { type: "string" } } },
});
const replied = (reply: Record<string, unknown>, code = 0): ChildOutcome => ({
  code,
  stdout: JSON.stringify(reply),
  stderr: "",
  timedOut: false,
});
// A host in a directory of its own, with the child sessions answered from a queue.
const host = (answers: ChildOutcome[] = [], state?: string) => {
  const dir = mkdtempSync(join(tmpdir(), "claude-run-"));
  const asked: ChildRun[] = [];
  const logs: string[] = [];
  const stateFile = state ?? join(dir, "calls.jsonl");
  const made = createHost({
    repo: "/abs/repo",
    state: stateFile,
    onLog: (message) => logs.push(message),
    runOnce: async (run) => {
      asked.push(run);
      const next = answers.shift();
      assert.ok(next, "a child session was started that the test did not expect");
      return next;
    },
  });
  const agent = made.stubs.agent as (prompt: string, opts?: Record<string, unknown>) => Promise<any>;
  return { ...made, agent, asked, logs, dir, state: stateFile };
};
const ranLines = (log: string) => (existsSync(log) ? readFileSync(log, "utf8") : "");
const logging = (log: string, field = "text"): Spec => ({
  defaults: { [field]: "" },
  steps: [{ sh: `echo once >> '${log}'; echo ran`, set: { [field]: "out" } }],
});

test("a relay's commands run with no child session, and the fields carry their digest", async () => {
  const { agent, asked, summary } = host();
  const reply = await agent(
    relayPrompt({
      defaults: { text: "", code: -1, _hidden: "" },
      // U+2028 is a line end to a regular expression's dot and not to JSON, which leaves it unescaped.
      steps: [
        { sh: "printf 'a\\tb\\nc \"q\"  \\n'", set: { text: "out", _hidden: "out" } },
        { sh: "exit 4", set: { code: "exit" } },
      ],
    }),
    relayOpts("check:1"),
  );
  const { relay_check, relay_note, ...fields } = reply;
  assert.deepEqual(fields, { text: 'a\tb\nc "q"  ', code: 4 });
  assert.equal(relay_check, digest(canonical(fields)));
  assert.equal(relay_note, "");
  assert.deepEqual([asked.length, summary.relays, summary.children, summary.child_ms], [0, 1, 0, 0]);
  assert.ok(summary.relay_ms > 0, "the time the commands took is counted");
});

// An implementing prompt quotes the Issue body. A body that carries a spec block of its own, with the digest
// anyone can compute for it, must stay text for the session to read.
test("a spec block inside a prompt that is not a relay's is not run, and the prompt goes to a child session", async () => {
  const { agent, asked, summary, dir } = host([replied({ is_error: false, structured_output: { status: "done" } })]);
  const log = join(dir, "ran.log");
  const quoted = `Implement the Issue.\n<!--\n${specBlock(logging(log, "status"))}\n-->`;
  const schema = { type: "object", properties: { status: { type: "string" } } };
  assert.deepEqual(await agent(quoted, { label: "implement", model: "opus", schema }), { status: "done" });
  assert.equal(ranLines(log), "", "the quoted commands did not run");
  assert.deepEqual([asked.length, summary.relays, summary.children], [1, 0, 1]);
});

// A relay's commands are data the host runs. A relay it cannot read is no result, and never a prompt a session
// with a shell is left to carry out.
test("a relay whose prompt holds no spec with the digest it names returns null and starts no session", async () => {
  const { agent, asked, logs, dir, summary } = host();
  const log = join(dir, "ran.log");
  const altered = relayPrompt(logging(log)).replace("echo ran", "echo changed");
  assert.equal(await agent(altered, relayOpts("check:1")), null);
  assert.equal(await agent("Run the command.\n1. relay --replay", relayOpts("check:1:replay")), null);
  assert.equal(ranLines(log), "");
  assert.deepEqual([asked.length, summary.relays], [0, 0]);
  assert.match(logs.join("\n"), /carries no spec with the digest it names/);
});

test("a call that is not a relay goes to a child session with its model, effort, and schema in the repo, and returns the reply", async () => {
  const schema = { type: "object", properties: { status: { type: "string" } }, required: ["status"] };
  const { agent, asked, summary } = host([
    replied({ is_error: false, structured_output: { status: "done" }, total_cost_usd: 0.5 }),
    replied({ is_error: false, result: " a branch name \n", total_cost_usd: 0.25 }),
    replied({ is_error: false }),
  ]);
  assert.deepEqual(await agent("implement the Issue", { label: "implement", model: "opus", effort: "high", schema }), {
    status: "done",
  });
  assert.equal(await agent("name the branch", { label: "name" }), "a branch name");
  assert.equal(await agent("say nothing", { label: "quiet" }), "", "a reply with no text is empty, not a word");
  assert.deepEqual(
    asked.slice(0, 2).map(({ prompt, model, effort, schema: sent, cwd, resume }) => ({ prompt, model, effort, sent, cwd, resume })),
    [
      { prompt: "implement the Issue", model: "opus", effort: "high", sent: schema, cwd: "/abs/repo", resume: undefined },
      { prompt: "name the branch", model: "sonnet", effort: undefined, sent: undefined, cwd: "/abs/repo", resume: undefined },
    ],
  );
  assert.deepEqual([summary.children, summary.relays, summary.cost_usd], [3, 0, 0.75]);
});

// A script branches on null, the value the Agent tool returns for an agent that died.
test("a child session that fails, is ended at its time limit, or gives no structured reply returns null and says why", async () => {
  const schema = { type: "object" };
  const unshaped = replied({ is_error: false, subtype: "success", result: "text", session_id: "s-1" });
  const cases: [string, ChildOutcome | ChildOutcome[], RegExp, number][] = [
    ["an error result", replied({ is_error: true, subtype: "error_max_turns", total_cost_usd: 1 }), /ended as error_max_turns/, 1],
    ["a non-zero exit", replied({ is_error: false, subtype: "success", total_cost_usd: 1 }, 1), /ended as success/, 1],
    ["no result", { code: 1, stdout: "", stderr: "boom", timedOut: false }, /exited 1 with no result. boom/, 0],
    ["a time limit", { code: null, stdout: '{"structured_output":{}}', stderr: "", timedOut: true }, /time limit/, 0],
    ["no structured reply, also when asked again", [unshaped, unshaped], /asked once more in the same session and got no reply/, 0],
    ["no structured reply and no session to ask in", replied({ is_error: false, subtype: "success", result: "text" }), /no reply in the schema's shape/, 0],
  ];
  for (const [name, outcome, why, cost] of cases) {
    const { agent, logs, summary } = host([outcome].flat());
    assert.equal(await agent("review", { label: "review:1", schema }), null, name);
    assert.match(logs.join("\n"), why, name);
    assert.equal(summary.cost_usd, cost, `${name}: the cost the session reported is counted`);
  }
});

// The work is in the worktree by the time a session gives its reply. Dropping the reply for an error that came
// after it would implement the Issue a second time.
test("a structured reply is returned also when the session then ended on an error", async () => {
  const { agent, logs } = host([
    replied({ is_error: true, subtype: "error_during_execution", structured_output: { status: "done" } }, 1),
  ]);
  assert.deepEqual(await agent("implement", { label: "implement", schema: { type: "object" } }), { status: "done" });
  assert.match(logs.join("\n"), /ended as error_during_execution after giving its reply/);
});

// An implementing session wrote the change and ended in prose. Returning null there made the workflow stop with
// the work already in the worktree.
test("a session that ends without a structured reply is asked for it once more in the same session, and that reply is returned", async () => {
  const schema = { type: "object" };
  const { agent, asked, summary } = host([
    replied({ is_error: false, subtype: "success", result: "done, in prose", session_id: "s-1", total_cost_usd: 1 }),
    replied({ is_error: false, structured_output: { status: "done" }, total_cost_usd: 0.25 }),
  ]);
  assert.deepEqual(await agent("implement", { label: "implement", model: "opus", schema }), { status: "done" });
  assert.deepEqual(
    asked.map(({ resume, model, schema: sent }) => ({ resume, model, sent })),
    [
      { resume: undefined, model: "opus", sent: schema },
      { resume: "s-1", model: "opus", sent: schema },
    ],
  );
  assert.match(asked[1].prompt, /structured output/);
  assert.doesNotMatch(asked[1].prompt, /implement/);
  assert.deepEqual([summary.children, summary.cost_usd], [1, 1.25]);
});

// A stopped run is resumed with the retry the stop returned. Every call before the stopped boundary has the
// prompt it had, and must come back without implementing, or pushing, a second time.
test("a run started with the same state file returns the kept results and runs nothing, and a call that returned nothing is asked again", async () => {
  const first = host([replied({ is_error: false, structured_output: { status: "done" } }), replied({ is_error: true }, 1)]);
  const log = join(first.dir, "ran.log");
  const relay = relayPrompt(logging(log));
  const opts = { label: "implement", effort: "high", schema: { type: "object" } };
  const relayedOnce = await first.agent(relay, relayOpts("check:1"));
  const implemented = await first.agent("implement", opts);
  assert.equal(await first.agent("review", { label: "review:1", schema: { type: "object" } }), null);
  // The host was ended while it wrote its next line.
  appendFileSync(first.state, '{"key":"cut sho');

  const second = host([replied({ is_error: false, structured_output: { accepted: true } })], first.state);
  assert.deepEqual(await second.agent(relay, relayOpts("check:1")), relayedOnce);
  assert.deepEqual(await second.agent("implement", opts), implemented);
  assert.deepEqual(await second.agent("review", { label: "review:1", schema: { type: "object" } }), { accepted: true });
  assert.equal(ranLines(log), "once\n");
  assert.deepEqual(second.asked.map((run) => run.prompt), ["review"]);
  assert.deepEqual([second.summary.kept, second.summary.relays, second.summary.children], [2, 0, 1]);

  // The line written after the cut one is whole, and the same prompt with another option is another call.
  const third = host(
    [replied({ is_error: false, structured_output: { status: "again" } }), replied({ is_error: false, structured_output: { status: "more" } })],
    first.state,
  );
  assert.deepEqual(await third.agent("review", { label: "review:1", schema: { type: "object" } }), { accepted: true });
  assert.deepEqual(await third.agent("implement", { ...opts, effort: "low" }), { status: "again" });
  assert.deepEqual(await third.agent("implement", { ...opts, schema: { type: "object", required: [] } }), { status: "more" });
});

// write-body.ts reads the PR body from the prompt of the agent that runs it. Here no agent runs the command,
// so the host stores the prompt where the helpers' scan finds it.
test("a relay's command finds the prompt of its own call through the scan the helpers use", async () => {
  const { agent } = host();
  const transcript = join(here, "..", "transcript.ts");
  const read =
    `import { defaultProjects, recentPrompts } from ${JSON.stringify(transcript)}; ` +
    `const found = [...recentPrompts(defaultProjects(), "BODY_DATA")]; ` +
    `console.log(found.length, found[0].text.split("BODY_DATA ").at(-1));`;
  const reply = await agent(
    relayPrompt({ defaults: { seen: "" }, steps: [{ sh: `node --input-type=module -e '${read}'`, set: { seen: "out" } }] }, "\nBODY_DATA 本文 one"),
    relayOpts("body:read"),
  );
  assert.equal(reply.seen, "1 本文 one");
});

// Prompts and command output can carry a token, such as a remote URL with credentials.
test("the state file and what is kept beside it are readable by their owner alone, and a label with a slash names a file", async () => {
  const { agent, dir, state } = host([replied({ is_error: false, structured_output: { ok: true } })]);
  await agent(relayPrompt({ defaults: { a: "" }, steps: [{ sh: "echo secret", set: { a: "out" } }] }), relayOpts("target"));
  await agent("review", { label: "review/fix:1", schema: { type: "object" } });
  const kept = readdirSync(join(dir, "sessions"));
  assert.deepEqual(kept, ["2-review_fix_1.json"]);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "sessions", kept[0]), "utf8")).structured_output, { ok: true });
  const transcripts = join(dir, "projects", "claude-run", "host", "subagents");
  const modes = [state, join(dir, "sessions", kept[0]), join(transcripts, "agent-1.jsonl"), join(dir, "sessions"), transcripts].map(
    (path) => (statSync(path).mode & 0o777).toString(8),
  );
  assert.deepEqual(modes, ["600", "600", "600", "700", "700"]);
});

test("a workflow script run on the host gets its relays and its agents answered through one agent() call, and nests by name", async () => {
  const { stubs, dir, asked, summary } = host([replied({ is_error: false, structured_output: { verdict: "ok" } })]);
  const file = join(dir, "sample.js");
  writeFileSync(
    file,
    `export const meta = { name: "sample", description: "a relay, then an agent" };
const relayed = await agent(args.relay, args.relayOpts);
const judged = await agent("judge " + relayed.head, { label: "judge", model: "opus", schema: { type: "object" } });
return { head: relayed.head, verdict: judged.verdict };
`,
  );
  const { result } = await runWorkflow(file, {
    args: { relay: relayPrompt({ defaults: { head: "" }, steps: [{ sh: "echo abc123", set: { head: "out" } }] }), relayOpts: relayOpts("observe") },
    stubs,
  });
  assert.deepEqual(result, { head: "abc123", verdict: "ok" });
  assert.deepEqual(asked.map((run) => run.prompt), ["judge abc123"]);
  assert.deepEqual([summary.relays, summary.children], [1, 1]);
  const nest = stubs.workflow as (name: string, args: unknown) => Promise<unknown>;
  await assert.rejects(nest("no-such-workflow", {}), /no workflow with that name/);
});

// The one place that talks to the real command. A fake claude on PATH records what it was given.
test("a child session is started as claude -p with the model, the tools, the effort, the schema, and the prompt on stdin, and is resumed by its session id", async () => {
  const dir = mkdtempSync(join(tmpdir(), "claude-run-fake-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "claude"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const n = fs.readdirSync(${JSON.stringify(dir)}).filter((f) => f.startsWith("call-")).length;
fs.writeFileSync(${JSON.stringify(dir)} + "/call-" + n + ".json", JSON.stringify({ argv: process.argv.slice(2), stdin: fs.readFileSync(0, "utf8"), cwd: process.cwd() }));
console.log(JSON.stringify(n === 0 ? { is_error: false, result: "prose", session_id: "s-9", total_cost_usd: 1 } : { is_error: false, structured_output: { status: "done" }, total_cost_usd: 0.5 }));
`,
    { mode: 0o755 },
  );
  const before = { PATH: process.env.PATH, settings: process.env.CLAUDE_RUN_SETTINGS };
  process.env.PATH = `${bin}:${before.PATH}`;
  process.env.CLAUDE_RUN_SETTINGS = '{"sandbox":{"enabled":false}}';
  try {
    const { stubs, summary } = createHost({ repo: dir, state: join(dir, "calls.jsonl") });
    const agent = stubs.agent as (prompt: string, opts: Record<string, unknown>) => Promise<unknown>;
    const schema = { type: "object" };
    assert.deepEqual(await agent("implement 本文", { label: "implement", model: "opus", effort: "high", schema }), { status: "done" });
    const calls = [0, 1].map((n) => JSON.parse(readFileSync(join(dir, `call-${n}.json`), "utf8")));
    const common = ["-p", "--model", "opus", "--output-format", "json", "--allowedTools", "Read,Write,Edit,MultiEdit,Glob,Grep,LS", "--disallowedTools", "Agent,Workflow", "--effort", "high"];
    const tail = ["--json-schema", JSON.stringify(schema), "--settings", '{"sandbox":{"enabled":false}}'];
    assert.deepEqual(calls[0].argv, [...common, ...tail]);
    assert.deepEqual(calls[1].argv, [...common, "--resume", "s-9", ...tail]);
    assert.equal(calls[0].stdin, "implement 本文");
    assert.equal(calls[0].cwd, realpathSync(dir));
    assert.equal(summary.cost_usd, 1.5);

    // No claude to start is a session that failed, not a throw.
    process.env.PATH = "/nonexistent";
    const logs: string[] = [];
    const none = createHost({ repo: dir, state: join(dir, "other.jsonl"), onLog: (message) => logs.push(message) });
    assert.equal(await (none.stubs.agent as typeof agent)("name", { label: "name" }), null);
    assert.match(logs.join("\n"), /exited -1 with no result/);
  } finally {
    process.env.PATH = before.PATH;
    if (before.settings === undefined) delete process.env.CLAUDE_RUN_SETTINGS;
    else process.env.CLAUDE_RUN_SETTINGS = before.settings;
  }
});

// Two hosts on one state file would each miss the other's results and push twice.
test("a state file held by a running process is refused, and one left by a process that is gone is taken over", () => {
  const dir = mkdtempSync(join(tmpdir(), "claude-run-lock-"));
  const state = join(dir, "calls.jsonl");
  writeFileSync(`${state}.lock`, String(process.ppid));
  assert.throws(() => holdState(state), /held by the running process/);
  const gone = spawnSync("true").pid;
  writeFileSync(`${state}.lock`, String(gone));
  const release = holdState(state);
  assert.equal(readFileSync(`${state}.lock`, "utf8"), String(process.pid));
  release();
  assert.ok(!existsSync(`${state}.lock`));
});

test("a call is read with its state path made absolute, and one it cannot read is refused with the usage", () => {
  const read = readCall(["implement", "--repo", "/abs/repo", "--issue", "12", "--state", "run/calls.jsonl", "--concurrency", "2"]);
  assert.deepEqual(
    [read?.name, read?.args.repo, read?.args.issue, read?.state, read?.concurrency],
    ["implement", "/abs/repo", "12", resolve("run/calls.jsonl"), 2],
  );
  assert.equal(readCall(["implement", "--repo", "/abs/repo"])?.state, undefined);
  // A request written by a person holds quotes and line breaks. From a file it passes through no shell quoting.
  const dir = mkdtempSync(join(tmpdir(), "claude-run-args-"));
  const request = `it's "wrong"\nfix the 'order'`;
  writeFileSync(join(dir, "args.json"), JSON.stringify({ issue: "12", revision: { pr: "https://example.test/pr/1", request } }));
  const fromFile = readCall(["implement", "--repo", "/abs/repo", "--args-file", join(dir, "args.json")]);
  assert.deepEqual([fromFile?.args.issue, (fromFile?.args.revision as { request: string }).request], ["12", request]);
  writeFileSync(join(dir, "broken.json"), '{"issue": ');
  const refused = [
    ["implement", "--repo", "/abs/repo", "--state"],
    ["implement", "--state", "--repo", "/abs/repo"],
    ["implement", "--repo", "/abs/repo", "--concurrency", "0"],
    ["implement", "--repo", "/abs/repo", "--concurrency", "many"],
    ["implement", "--repo", "/abs/repo", "--unknown", "x"],
    ["implement", "--repo", "/abs/repo", "--args-file"],
    ["implement", "--repo", "/abs/repo", "--args-file", join(dir, "no-such.json")],
    ["implement", "--repo", "/abs/repo", "--args-file", join(dir, "broken.json")],
    ["implement"],
    [],
  ];
  for (const argv of refused) assert.equal(readCall(argv), null, argv.join(" "));
  const ran = spawnSync("node", [script, "implement", "--state"], { encoding: "utf8" });
  assert.equal(ran.status, 2);
  assert.match(ran.stderr, /^usage: claude-run\.ts /);
  assert.equal(ran.stdout, "");
});

// A session that cannot run a command would implement for minutes and then say it could not run a test.
test("the probe says whether a child session ran the commands, and names the ones the user's rules refused", async () => {
  const asked: ChildRun[] = [];
  const answer = (outcome: ChildOutcome) => async (run: ChildRun) => {
    asked.push(run);
    return outcome;
  };
  assert.deepEqual(await probeChild("/abs/repo", ["git status --short", "bun --version"], answer(replied({ is_error: false, result: "done", permission_denials: [] }))), {
    ran: true,
    denied: [],
    why: "",
  });
  assert.deepEqual([asked[0].model, asked[0].cwd, asked[0].schema], ["haiku", "/abs/repo", undefined]);
  assert.match(asked[0].prompt, /git status --short\nbun --version$/);
  const refused = await probeChild(
    "/abs/repo",
    ["bun --version"],
    answer(replied({ is_error: false, result: "refused", permission_denials: [{ tool_name: "Bash", tool_input: { command: "bun --version" } }] })),
  );
  assert.deepEqual([refused.ran, refused.denied], [false, ["bun --version"]]);
  const absent = await probeChild("/abs/repo", ["git status"], answer({ code: -1, stdout: "", stderr: "spawn claude ENOENT", timedOut: false }));
  assert.deepEqual([absent.ran, absent.denied], [false, []]);
  assert.match(absent.why, /exited -1 with no result. spawn claude ENOENT/);
  const failed = await probeChild("/abs/repo", ["git status"], answer(replied({ is_error: true, subtype: "error_during_execution" }, 1)));
  assert.deepEqual([failed.ran, failed.why], [false, "the session ended as error_during_execution"]);
});

// The skill reads the result from the file the summary line names, because the log and the result reach it
// through one stream.
test("the command prints the script's return value, writes it beside the state file, and names both files in its last line", async () => {
  const dir = mkdtempSync(join(tmpdir(), "claude-run-main-"));
  const file = join(dir, "sample.js");
  writeFileSync(file, `export const meta = { name: "sample", description: "returns its args" };\nif (args.fail) throw new Error("boom");\nreturn { stopped: "no-issue", issue: args.issue };\n`);
  const run = async (argv: string[]) => {
    const out: string[] = [];
    const logs: string[] = [];
    const code = await main(argv, { resolvePath: () => file, out: (text) => out.push(text), onLog: (message) => logs.push(message) });
    return { code, out: out.join(""), logs };
  };
  const state = join(dir, "run", "calls.jsonl");
  const ok = await run(["sample", "--repo", "/abs/repo", "--issue", "12", "--state", state]);
  assert.equal(ok.code, 0, "a stop is a value the script returned");
  assert.deepEqual(JSON.parse(ok.out), { stopped: "no-issue", issue: "12" });
  const last = JSON.parse(ok.logs.at(-1)?.replace(/^claude-run: /, "") ?? "");
  assert.deepEqual([last.state, last.result], [state, join(dir, "run", "result.json")]);
  assert.equal(readFileSync(last.result, "utf8"), ok.out);
  assert.equal((statSync(last.result).mode & 0o777).toString(8), "600");
  assert.ok(!existsSync(`${state}.lock`), "the state file is released");

  const thrown = await run(["sample", "--repo", "/abs/repo", "--args", '{"fail":true}', "--state", join(dir, "other", "calls.jsonl")]);
  assert.equal(thrown.code, 1);
  assert.equal(thrown.out, "");
  assert.match(thrown.logs.join("\n"), /the script threw: boom/);
  assert.equal(JSON.parse(thrown.logs.at(-1)?.replace(/^claude-run: /, "") ?? "").result, null);
  assert.equal((await run(["sample"])).code, 2);

  // Another host on the same state: one line the skill can read, and nothing run.
  writeFileSync(`${state}.lock`, String(process.ppid));
  const held = await run(["sample", "--repo", "/abs/repo", "--state", state]);
  assert.equal(held.code, 1);
  assert.equal(held.out, "");
  assert.match(held.logs.join("\n"), /^claude-run: the state file .* is held by the running process \d+$/);
});
