/// <reference types="node" />
// Runs a workflow script (workflows/<name>.js) outside Claude Code's workflow runtime.
//
// Inside Claude Code a script cannot run a command, so every command goes through an agent (a
// relay, DR-0126). A relay's prompt carries its commands as a spec. This host runs that spec
// itself with relay.ts's runSpec, so a relay costs no agent, and hands the agent() calls that
// carry no spec (implementing, reviewing, repairing, naming) to one `claude -p` child session
// each. The evaluation form is run-workflow.ts's, the one the tests use.
//
// Usage: claude-run.ts <workflow> --repo <abs path> [--issue N] [--base B] [--args <json>]
//                      [--state <file>] [--concurrency N]
// stdout: the workflow's return value as JSON. stderr: the log, the phases, and one summary line.
//
// --state names the file that keeps the result of every agent() call. A run started with the same
// file returns the kept result of a call whose prompt and options are the same and runs nothing
// for it. A stopped run is resumed that way: the same file, and the `retry` the stop returned in
// --args (DR-0124).
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { makeSlots, parseArgv, resolveWorkflowPath } from "./codex-run.ts";
import { isMainModule } from "./entry-point.ts";
import { canonical, publicFields, runSpec } from "./relay.ts";
import type { Spec } from "./relay.ts";
import { runWorkflow } from "./run-workflow.ts";
import type { RunWorkflowStubs } from "./run-workflow.ts";
import { digest } from "./transcript.ts";

// A value a workflow script hands across the vm boundary, or one parsed from a child's reply: its
// shape is decided at run time, so it is typed as `any` at that boundary alone.
type JsonValue = any;

interface AgentOptions {
  label?: string;
  model?: string;
  effort?: string;
  schema?: Record<string, unknown>;
}

// The tools a child session may use without asking. It implements and reviews in the worktree the
// prompt names, so it edits files and runs commands. It starts no agent and no workflow of its own.
const CHILD_TOOLS = "Bash,Read,Write,Edit,MultiEdit,Glob,Grep,LS";
// An implementing session is the longest call. The ceiling is for that one, not per label.
const CHILD_TIMEOUT_MS = Number(process.env.CLAUDE_RUN_TIMEOUT_MS) || 3_600_000;
// A fan-out script starts one child per unit. Claude Code caps in-process agents, and child
// processes carry no cap of their own.
const DEFAULT_CONCURRENCY = 4;
const SPEC_BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n(.*)\nRELAY_SPEC_END/;

export interface ChildRun {
  prompt: string;
  model: string;
  effort: string | undefined;
  schema: Record<string, unknown> | undefined;
  cwd: string;
  timeoutMs: number;
  // The session to go on in, when the first reply came without the structured form.
  resume?: string;
}
export interface ChildOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const runClaudeOnce = ({ prompt, model, effort, schema, cwd, timeoutMs, resume }: ChildRun): Promise<ChildOutcome> =>
  new Promise((done) => {
    const argv = ["-p", "--model", model, "--output-format", "json", "--allowedTools", CHILD_TOOLS];
    if (effort) argv.push("--effort", effort);
    // The session did its work and ended in prose. Its reply is asked for in the same session, where the work is known.
    if (resume) argv.push("--resume", resume);
    if (schema) argv.push("--json-schema", JSON.stringify(schema));
    // Settings for the child alone, such as a sandbox a browser check cannot run in.
    if (process.env.CLAUDE_RUN_SETTINGS) argv.push("--settings", process.env.CLAUDE_RUN_SETTINGS);
    const child = spawn("claude", argv, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      done({ code: -1, stdout, stderr: String(err.message), timedOut: false });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      done({ code, stdout, stderr: stderr.slice(-4000), timedOut });
    });
    // The prompt goes in on stdin, which keeps an Issue body off argv.
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });

// What a session is told when it ended without giving its result in the structured form.
const GIVE_REPLY =
  "Your work in this session is done. Give its result now through the structured output, in the shape the schema asks for. Do no further work.";

export interface Summary {
  relays: number;
  children: number;
  kept: number;
  cost_usd: number;
}

export interface HostOptions {
  repo: string;
  // The file that keeps every call's result, and beside it the prompts a relay's commands read.
  state: string;
  concurrency?: number;
  onLog?: (message: string) => void;
  // The seam the tests use in place of a real child session.
  runOnce?: (run: ChildRun) => Promise<ChildOutcome>;
}

const keyOf = (prompt: string, opts: AgentOptions): string =>
  createHash("sha256")
    .update(JSON.stringify([prompt, opts]))
    .digest("hex");

const readKept = (state: string): Map<string, JsonValue> => {
  const kept = new Map<string, JsonValue>();
  if (!existsSync(state)) return kept;
  for (const line of readFileSync(state, "utf8").split("\n")) {
    if (!line) continue;
    const { key, value } = JSON.parse(line) as { key: string; value: JsonValue };
    kept.set(key, value);
  }
  return kept;
};

// The spec a relay's prompt carries, or null for a prompt an agent has to answer.
const specIn = (prompt: string): Spec | null => {
  const found = SPEC_BLOCK.exec(prompt);
  return found && digest(found[2]) === found[1] ? (JSON.parse(found[2]) as Spec) : null;
};

// What a child session printed, as the value agent() returns: the structured reply under a schema,
// the final text without one, and null for a session that failed, as the Agent tool returns for
// an agent that died.
const replyOf = (
  outcome: ChildOutcome,
  schema: unknown,
  label: string,
  onLog: (message: string) => void,
): { value: JsonValue; cost: number; unshaped?: string } => {
  const failed = (why: string) => {
    onLog(`[${label}] ${why}; the call returns null.`);
    return { value: null, cost: 0 };
  };
  if (outcome.timedOut) return failed("the child session was ended at its time limit");
  let reply: JsonValue;
  try {
    reply = JSON.parse(outcome.stdout);
  } catch {
    return failed(`the child session exited ${outcome.code} with no result. ${outcome.stderr.split("\n").slice(-3).join(" ")}`);
  }
  const cost = Number(reply.total_cost_usd) || 0;
  if (reply.is_error || outcome.code !== 0) {
    onLog(`[${label}] the child session ended as ${reply.subtype}; the call returns null.`);
    return { value: null, cost };
  }
  if (!schema) return { value: String(reply.result ?? "").trim(), cost };
  if (reply.structured_output === undefined || reply.structured_output === null) {
    onLog(`[${label}] the child session gave no reply in the schema's shape.`);
    return { value: null, cost, unshaped: String(reply.session_id ?? "") };
  }
  return { value: reply.structured_output, cost };
};

export function createHost({
  repo,
  state,
  concurrency = DEFAULT_CONCURRENCY,
  onLog = () => {},
  runOnce = runClaudeOnce,
}: HostOptions): { stubs: RunWorkflowStubs; summary: Summary } {
  const summary: Summary = { relays: 0, children: 0, kept: 0, cost_usd: 0 };
  const kept = readKept(state);
  const withSlot = makeSlots(concurrency);
  mkdirSync(dirname(state), { recursive: true });
  // A relay's command can read data from the prompt of the agent that runs it (write-body.ts reads
  // the PR body that way, DR-0125). There is no agent here, so the prompt is stored where such a
  // command looks: as the first line of a transcript under the directory RELAY_PROJECTS names.
  const transcripts = join(dirname(state), "projects", "claude-run", "host", "subagents");
  mkdirSync(transcripts, { recursive: true });
  process.env.RELAY_PROJECTS = join(dirname(state), "projects");
  const sessions = join(dirname(state), "sessions");
  mkdirSync(sessions, { recursive: true });
  let serial = 0;

  const relayed = async (prompt: string, spec: Spec): Promise<JsonValue> => {
    serial += 1;
    writeFileSync(
      join(transcripts, `agent-${serial}.jsonl`),
      `${JSON.stringify({ type: "user", message: { role: "user", content: prompt } })}\n`,
    );
    const { fields } = await runSpec(spec);
    const shown = publicFields(fields);
    summary.relays += 1;
    return { ...shown, relay_check: digest(canonical(shown)), relay_note: "" };
  };

  const answered = (prompt: string, opts: AgentOptions, label: string): Promise<JsonValue> =>
    withSlot(async () => {
      onLog(`[${label}] claude -p ${opts.model ?? "sonnet"}`);
      const run: ChildRun = {
        prompt,
        model: opts.model ?? "sonnet",
        effort: opts.effort,
        schema: opts.schema,
        cwd: repo,
        timeoutMs: CHILD_TIMEOUT_MS,
      };
      const session = async (asked: ChildRun, part: string) => {
        const outcome = await runOnce(asked);
      // Each session's own result, for reading why a call returned nothing and what it cost.
        serial += 1;
        writeFileSync(join(sessions, `${serial}-${label.replace(/[^\w.-]/g, "_")}${part}.json`), outcome.stdout);
        const reply = replyOf(outcome, opts.schema, label, onLog);
        summary.cost_usd += reply.cost;
        return reply;
      };
      summary.children += 1;
      const first = await session(run, "");
      if (!first.unshaped) return first.value;
      // A session can finish its work and end in prose, with no reply in the schema's shape. The work is done, so the
      // reply is asked for once more in that session, not the work.
      const second = await session({ ...run, prompt: GIVE_REPLY, resume: first.unshaped }, "-reply");
      if (second.value === null) onLog(`[${label}] asked once more in the same session and got no reply; the call returns null.`);
      return second.value;
    });

  const stubs: RunWorkflowStubs = {};
  stubs.agent = async (prompt: string, opts: AgentOptions = {}) => {
    const label = opts.label || "agent";
    const key = keyOf(prompt, opts);
    if (kept.has(key)) {
      summary.kept += 1;
      return kept.get(key);
    }
    const spec = specIn(prompt);
    const value = spec ? await relayed(prompt, spec) : await answered(prompt, opts, label);
    // A call that returned nothing is asked again on a resume.
    if (value !== null && value !== undefined) {
      kept.set(key, value);
      appendFileSync(state, `${JSON.stringify({ key, label, value })}\n`);
    }
    return value;
  };
  // A script that nests another one (build.js nests code) runs it on the same host.
  stubs.workflow = async (name: string, wfArgs: JsonValue) => {
    onLog(`[workflow] ${name}`);
    const nested = await runWorkflow(resolveWorkflowPath(name), {
      args: wfArgs,
      stubs,
      onLog,
      onPhase: (title) => onLog(`== ${name}: ${title}`),
    });
    return nested.result;
  };
  return { stubs, summary };
}

// --state is this host's own flag. The rest is the argv codex-run.ts reads.
const takeState = (argv: string[]): { state: string | undefined; rest: string[] } => {
  const at = argv.indexOf("--state");
  return at < 0
    ? { state: undefined, rest: argv }
    : { state: argv[at + 1], rest: [...argv.slice(0, at), ...argv.slice(at + 2)] };
};

if (isMainModule(import.meta.url)) {
  const { state: named, rest } = takeState(process.argv.slice(2));
  const { name, args, concurrency } = parseArgv(rest);
  if (!name || typeof args.repo !== "string") {
    process.stderr.write(
      "usage: claude-run.ts <workflow> --repo <abs path> [--issue N] [--base B] [--args <json>] " +
        "[--state <file>] [--concurrency N]\n",
    );
    process.exit(2);
  }
  const state = named ?? join(mkdtempSync(join(process.env.TMPDIR || tmpdir(), "claude-run-")), "calls.jsonl");
  const onLog = (message: string) => process.stderr.write(`${message}\n`);
  onLog(`claude-run: state ${state}`);
  const { stubs, summary } = createHost({ repo: args.repo, state, concurrency, onLog });
  const { result } = await runWorkflow(resolveWorkflowPath(name), {
    args,
    stubs,
    onLog,
    onPhase: (title) => onLog(`== ${title}`),
  });
  onLog(`claude-run: ${JSON.stringify({ ...summary, state })}`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
