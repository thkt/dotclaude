// Tier 1 checks on relay.ts: it runs the steps a workflow script declares as data and prints their
// results with a digest, reading the spec from the transcript of the agent that runs it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonical, runSpec } from "../relay.ts";
import type { Spec } from "../relay.ts";
import { digest } from "../transcript.ts";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "relay.ts");
const fieldsOf = (spec: Spec) => runSpec(spec).fields;

test("each source reads its part of a command's result", () => {
  const fields = fieldsOf({
    defaults: { code: 0, held: true, text: "", line: "", late: true, both: "", quiet: "x" },
    steps: [
      {
        sh: "printf 'a\\nb\\n\\n'; printf 'err\\n' >&2; exit 3",
        set: { code: "exit", held: "ok", text: "out", line: "last", late: "timed_out", both: "tail:2" },
      },
      { sh: "printf 'fine\\n'", set: { quiet: "fail_tail:5" } },
    ],
  });
  assert.deepEqual(fields, {
    code: 3,
    held: false,
    text: "a\nb\n",
    line: "b",
    late: false,
    // stdout ends in a blank line, and the tail counts it.
    both: "\nerr",
    quiet: "",
  });
});

test("a failing command's tail is kept by fail_tail, and a command that cannot start reads as exit -1", () => {
  const fields = fieldsOf({
    defaults: { tail: "", code: 0 },
    steps: [
      { sh: "echo one; echo two; exit 1", set: { tail: "fail_tail:1" } },
      { sh: "exit 0", cwd: "/nonexistent-directory", set: { code: "exit" } },
    ],
  });
  assert.deepEqual(fields, { tail: "two", code: -1 });
});

test("a command that runs past its timeout reads as timed out with exit -1", () => {
  const fields = fieldsOf({
    defaults: { code: 0, late: false },
    steps: [{ sh: "sleep 5", timeout_ms: 200, set: { code: "exit", late: "timed_out" } }],
  });
  assert.deepEqual(fields, { code: -1, late: true });
});

test("a step runs only when every field named in when holds its value, and an unset field keeps its default", () => {
  const fields = fieldsOf({
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
test("append collects one value per step, and a field named with a leading underscore steers later steps", () => {
  const { fields } = runSpec({
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

test("a step receives its stdin and runs in its cwd", () => {
  const dir = mkdtempSync(join(tmpdir(), "relay-"));
  const fields = fieldsOf({
    defaults: { echoed: "", where: "" },
    steps: [
      { sh: "cat", stdin: '{"quote":"\'","dollar":"$HOME"}', set: { echoed: "out" } },
      { sh: "pwd -P", cwd: dir, set: { where: "out" } },
    ],
  });
  assert.equal(fields.echoed, '{"quote":"\'","dollar":"$HOME"}');
  assert.ok(String(fields.where).endsWith(dir.split("/").at(-1) ?? ""));
});

test("an unknown source fails the run instead of leaving a field at its default", () => {
  assert.throws(() => fieldsOf({ defaults: { a: "" }, steps: [{ sh: "true", set: { a: "stderr" } }] }));
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
  return { root, projects, agents, tmp };
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

test("the command runs the spec stored in a transcript and prints the fields with their digest, leaving internal fields out", () => {
  const { projects, agents, tmp } = project();
  const { wanted, prompt } = promptWith(SPEC);
  store(agents, "a1", prompt);
  const { code, out } = cli([wanted, "--projects", projects], tmp);
  assert.equal(code, 0);
  const { relay_check, ...fields } = out;
  assert.deepEqual(fields, { text: 'ﾉｰﾄ "q" `c` $HOME', code: 4 });
  assert.equal(relay_check, digest(canonical(fields)));
  assert.deepEqual(readdirSync(tmp), [`relay-${wanted.replace(":", "-")}.out.json`], "only the printed line is kept");
});

test("the digest of the fields does not depend on the order they come back in", () => {
  assert.equal(canonical({ b: 1, a: "x" }), canonical({ a: "x", b: 1 }));
  assert.notEqual(digest(canonical({ a: "x", b: 1 })), digest(canonical({ a: "y", b: 1 })));
});

test("a digest no transcript carries, or a transcript whose spec was altered, prints relay_error and runs nothing", () => {
  const { root, projects, agents, tmp } = project();
  const marker = join(root, "ran");
  const spec: Spec = { defaults: { a: "" }, steps: [{ sh: `touch '${marker}'`, set: { a: "out" } }] };
  const { wanted, prompt } = promptWith(spec);
  store(agents, "a1", prompt.replace("touch", "touch -c"));
  for (const args of [[wanted, "--projects", projects], ["00000000:1", "--projects", projects], ["not-a-digest"]]) {
    const { code, out } = cli(args, tmp);
    assert.equal(code, 1, args.join(" "));
    assert.equal(typeof out.relay_error, "string");
  }
  assert.ok(!existsSync(marker));
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
  assert.match(refused.out.relay_error, /does not have the digest/);
});

// The agent's Bash call is capped at 600 s. A call stops before a step that could run past the
// budget and asks to be run again, so its line is always printed before the tool kills it.
test("a call that cannot fit the next step asks to be run again, and the next call goes on from that step", () => {
  const { root, projects, agents, tmp } = project();
  const log = join(root, "ran.log");
  const spec: Spec = {
    defaults: { first: "", second: "", third: "" },
    steps: ["first", "second", "third"].map((name) => ({
      sh: `echo ${name} >> '${log}'; echo ${name}`,
      timeout_ms: 400,
      set: { [name]: "out" },
    })),
  };
  const { wanted, prompt } = promptWith(spec);
  store(agents, "a1", prompt);
  const args = [wanted, "--projects", projects];
  // The first step of a call always runs. A second 400 ms step does not fit in a 300 ms budget.
  const env = { RELAY_CALL_BUDGET_MS: "300" };
  assert.deepEqual(cli(args, tmp, env).out, { relay_continue: true });
  assert.deepEqual(cli(args, tmp, env).out, { relay_continue: true });
  const { relay_check, ...fields } = cli(args, tmp, env).out;
  assert.deepEqual(fields, { first: "first", second: "second", third: "third" });
  assert.equal(relay_check, digest(canonical(fields)));
  assert.equal(spawnSync("cat", [log], { encoding: "utf8" }).stdout, "first\nsecond\nthird\n");
});

// An agent that miscopies a long field returns fields without their digest. The script then asks a
// second agent for the same line, and the commands must not run a second time.
test("--replay prints the line the complete run printed and runs no step, and prints relay_error when nothing is kept", () => {
  const { root, projects, agents, tmp } = project();
  const log = join(root, "ran.log");
  const spec: Spec = { defaults: { text: "" }, steps: [{ sh: `echo once >> '${log}'; echo ■■■■■■■■■■`, set: { text: "out" } }] };
  const { wanted, prompt } = promptWith(spec);
  store(agents, "a1", prompt);
  assert.equal(cli([wanted, "--replay"], tmp).code, 1, "nothing is kept before the run");
  const ran = cli([wanted, "--projects", projects], tmp);
  const replayed = cli([wanted, "--replay"], tmp);
  assert.deepEqual(replayed, ran);
  assert.equal(spawnSync("cat", [log], { encoding: "utf8" }).stdout, "once\n");
});
