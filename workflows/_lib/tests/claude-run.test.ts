// Tier 1 checks on claude-run.ts: a relay's commands run with no agent, the other agent() calls go
// to a child session, and a run started with the same state file runs nothing a second time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHost } from "../claude-run.ts";
import type { ChildOutcome, ChildRun } from "../claude-run.ts";
import { canonical } from "../relay.ts";
import type { Spec } from "../relay.ts";
import { runWorkflow } from "../run-workflow.ts";
import { digest } from "../transcript.ts";

const here = dirname(fileURLToPath(import.meta.url));
const relayPrompt = (spec: Spec, extra = "") => {
  const json = JSON.stringify(spec);
  return `Run the command.\n1. relay\nRELAY_SPEC ${digest(json)}\n${json}\nRELAY_SPEC_END${extra}`;
};
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
  const made = createHost({
    repo: "/abs/repo",
    state: state ?? join(dir, "calls.jsonl"),
    onLog: (message) => logs.push(message),
    runOnce: async (run) => {
      asked.push(run);
      const next = answers.shift();
      assert.ok(next, "a child session was started that the test did not expect");
      return next;
    },
  });
  const agent = made.stubs.agent as (prompt: string, opts?: Record<string, unknown>) => Promise<any>;
  return { ...made, agent, asked, logs, dir, state: state ?? join(dir, "calls.jsonl") };
};
const ranLines = (log: string) => (existsSync(log) ? readFileSync(log, "utf8") : "");

test("a call whose prompt carries a spec runs its commands with no child session, and the fields carry their digest", async () => {
  const { agent, asked, summary } = host();
  const reply = await agent(
    relayPrompt({
      defaults: { text: "", code: -1, _hidden: "" },
      steps: [
        { sh: "printf 'a\\tb\\nc \"q\"\\n'", set: { text: "out", _hidden: "out" } },
        { sh: "exit 4", set: { code: "exit" } },
      ],
    }),
    { label: "check:1", model: "haiku" },
  );
  const { relay_check, relay_note, ...fields } = reply;
  assert.deepEqual(fields, { text: 'a\tb\nc "q"', code: 4 });
  assert.equal(relay_check, digest(canonical(fields)));
  assert.equal(relay_note, "");
  assert.deepEqual([asked.length, summary.relays, summary.children], [0, 1, 0]);
});

test("a call with no spec goes to a child session with its model, effort, and schema in the repo, and returns the structured reply", async () => {
  const schema = { type: "object", properties: { status: { type: "string" } }, required: ["status"] };
  const { agent, asked, summary } = host([
    replied({ is_error: false, structured_output: { status: "done" }, total_cost_usd: 0.5 }),
    replied({ is_error: false, result: " a branch name \n", total_cost_usd: 0.25 }),
  ]);
  assert.deepEqual(await agent("implement the Issue", { label: "implement", model: "opus", effort: "high", schema }), {
    status: "done",
  });
  assert.equal(await agent("name the branch", { label: "name" }), "a branch name");
  assert.deepEqual(
    asked.map(({ prompt, model, effort, schema: sent, cwd }) => ({ prompt, model, effort, sent, cwd })),
    [
      { prompt: "implement the Issue", model: "opus", effort: "high", sent: schema, cwd: "/abs/repo" },
      { prompt: "name the branch", model: "sonnet", effort: undefined, sent: undefined, cwd: "/abs/repo" },
    ],
  );
  assert.deepEqual([summary.children, summary.relays, summary.cost_usd], [2, 0, 0.75]);
});

// A script branches on null, the value the Agent tool returns for an agent that died.
test("a child session that fails, is ended at its time limit, or gives no structured reply returns null and says why", async () => {
  const schema = { type: "object" };
  const unshaped = replied({ is_error: false, subtype: "success", result: "text", session_id: "s-1" });
  const cases: [string, ChildOutcome | ChildOutcome[], RegExp][] = [
    ["an error result", replied({ is_error: true, subtype: "error_max_turns", total_cost_usd: 1 }, 1), /error_max_turns/],
    ["no result", { code: 1, stdout: "", stderr: "boom", timedOut: false }, /exited 1 with no result. boom/],
    ["a time limit", { code: null, stdout: "", stderr: "", timedOut: true }, /time limit/],
    ["no structured reply, also when asked again", [unshaped, unshaped], /asked once more in the same session and got no reply/],
    ["no structured reply and no session to ask in", replied({ is_error: false, subtype: "success", result: "text" }), /no reply in the schema's shape/],
  ];
  for (const [name, outcome, why] of cases) {
    const { agent, logs } = host([outcome].flat());
    assert.equal(await agent("review", { label: "review:1", schema }), null, name);
    assert.match(logs.join("\n"), why, name);
  }
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
  const relay = relayPrompt({ defaults: { text: "" }, steps: [{ sh: `echo once >> '${log}'; echo ran`, set: { text: "out" } }] });
  const opts = { label: "implement", schema: { type: "object" } };
  const relayedOnce = await first.agent(relay, { label: "check:1" });
  const implemented = await first.agent("implement", opts);
  assert.equal(await first.agent("review", { label: "review:1", schema: { type: "object" } }), null);

  const second = host([replied({ is_error: false, structured_output: { accepted: true } })], first.state);
  assert.deepEqual(await second.agent(relay, { label: "check:1" }), relayedOnce);
  assert.deepEqual(await second.agent("implement", opts), implemented);
  assert.deepEqual(await second.agent("review", { label: "review:1", schema: { type: "object" } }), { accepted: true });
  assert.equal(ranLines(log), "once\n");
  assert.deepEqual(second.asked.map((run) => run.prompt), ["review"]);
  assert.deepEqual([second.summary.kept, second.summary.relays, second.summary.children], [2, 0, 1]);
  // The same prompt with other options is another call.
  const third = host([replied({ is_error: false, structured_output: { status: "again" } })], first.state);
  assert.deepEqual(await third.agent("implement", { ...opts, model: "opus" }), { status: "again" });
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
    { label: "body:read" },
  );
  assert.equal(reply.seen, "1 本文 one");
});

test("a workflow script run on the host gets its relays and its agents answered through one agent() call", async () => {
  const { stubs, dir, asked, summary } = host([replied({ is_error: false, structured_output: { verdict: "ok" } })]);
  const script = join(dir, "sample.js");
  writeFileSync(
    script,
    `export const meta = { name: "sample", description: "a relay, then an agent" };
const relayed = await agent(args.relay, { label: "observe", model: "haiku" });
const judged = await agent("judge " + relayed.head, { label: "judge", model: "opus", schema: { type: "object" } });
return { head: relayed.head, verdict: judged.verdict };
`,
  );
  const { result } = await runWorkflow(script, {
    args: { relay: relayPrompt({ defaults: { head: "" }, steps: [{ sh: "echo abc123", set: { head: "out" } }] }) },
    stubs,
  });
  assert.deepEqual(result, { head: "abc123", verdict: "ok" });
  assert.deepEqual(asked.map((run) => run.prompt), ["judge abc123"]);
  assert.deepEqual([summary.relays, summary.children], [1, 1]);
});
