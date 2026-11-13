/// <reference types="node" />
// Runs a workflow script (workflows/<name>.js) outside Claude Code's workflow runtime.
//
// Inside Claude Code a script cannot run a command, so every command goes through an agent (a
// relay, DR-0126). A relay's prompt carries its commands as a spec. This host runs that spec
// itself with relay.ts's runSpec, so a relay costs no agent, and hands the agent() calls that
// are not relays (implementing, reviewing, repairing, naming) to one `claude -p` child session
// each. The evaluation form is run-workflow.ts's, the one the tests use.
//
// Usage: claude-run.ts <workflow> --repo <abs path> [--issue N] [--base B] [--args <json>]
//                      [--state <file>] [--concurrency N]
// stdout: the workflow's return value as JSON, also written to result.json beside the state file.
// stderr: the log, the phases, and one summary line that names the state file and the result file.
// exit: 0 when the script returned, a stop included. 1 when it threw. 2 for a call it cannot read.
//
// --state names the file that keeps the result of every agent() call. A run started with the same
// file returns the kept result of a call whose prompt and options are the same and runs nothing
// for it. A stopped run is resumed that way: the same file, and the `retry` the stop returned in
// --args (DR-0124). One host at a time holds a state file.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { makeSlots, parseArgv, resolveWorkflowPath } from "./codex-run.ts";
import { isMainModule } from "./entry-point.ts";
import { canonical, endRunningGroups, publicFields, runSpec } from "./relay.ts";
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
  schema?: { properties?: Record<string, unknown>; [key: string]: unknown };
}

// The tools a child session may use without asking. Its prompt carries text the script did not
// write (an Issue body, a check's output), so Bash is not among them: a command runs when the
// user's own permission rules allow it, as it would for an agent inside Claude Code. A caller with
// no one to ask and a repository it trusts names a wider list in CLAUDE_RUN_TOOLS.
const CHILD_TOOLS = process.env.CLAUDE_RUN_TOOLS || "Read,Write,Edit,MultiEdit,Glob,Grep,LS";
// An agent inside Claude Code's workflow runtime starts no agent of its own. A child session is a whole session
// and would: an implementing session started two reviewers, which the script's own review then repeated.
const CHILD_DENIED = "Agent,Workflow";
// An implementing session is the longest call. The ceiling is for that one, not per label.
const CHILD_TIMEOUT_MS = Number(process.env.CLAUDE_RUN_TIMEOUT_MS) || 3_600_000;
// A fan-out script starts one child per unit. Claude Code caps in-process agents, and child
// processes carry no cap of their own.
const DEFAULT_CONCURRENCY = 4;
const SPEC_BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n([^\n]*)\nRELAY_SPEC_END/;
// What a session is told when it ended without giving its result in the structured form.
const GIVE_REPLY =
  "Your work in this session is done. Give its result now through the structured output, in the shape the schema asks for. Do no further work.";
// A state file and what is kept beside it hold prompts and command output, which can carry a
// token (a remote URL with credentials). They are the user's alone.
const PRIVATE_DIR = { recursive: true, mode: 0o700 } as const;
const PRIVATE_FILE = { mode: 0o600 } as const;

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

// The child sessions that are running, each in its own process group, so the tools a session
// started end with it.
const runningChildren = new Set<number>();
const endGroup = (pid: number, name: NodeJS.Signals) => {
  try {
    process.kill(-pid, name);
  } catch {
    // already gone
  }
};
// Ends what this host started: the steps of the relays and the child sessions. A host that is
// ended leaves nothing writing into the worktree for the resumed run to race.
export const endAll = () => {
  endRunningGroups();
  for (const pid of runningChildren) endGroup(pid, "SIGTERM");
};

export const runClaudeOnce = ({
  prompt,
  model,
  effort,
  schema,
  cwd,
  timeoutMs,
  resume,
}: ChildRun): Promise<ChildOutcome> =>
  new Promise((done) => {
    const argv = ["-p", "--model", model, "--output-format", "json", "--allowedTools", CHILD_TOOLS];
    argv.push("--disallowedTools", CHILD_DENIED);
    if (effort) argv.push("--effort", effort);
    // The session did its work and ended in prose. Its reply is asked for in the same session, where the work is known.
    if (resume) argv.push("--resume", resume);
    if (schema) argv.push("--json-schema", JSON.stringify(schema));
    // Settings for the child alone, such as a sandbox a browser check cannot run in.
    if (process.env.CLAUDE_RUN_SETTINGS) argv.push("--settings", process.env.CLAUDE_RUN_SETTINGS);
    const child = spawn("claude", argv, { cwd, stdio: ["pipe", "pipe", "pipe"], detached: true });
    const pid = child.pid ?? 0;
    if (pid) runningChildren.add(pid);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (pid) endGroup(pid, "SIGKILL");
    }, timeoutMs);
    const finish = (outcome: ChildOutcome) => {
      clearTimeout(timer);
      runningChildren.delete(pid);
      done(outcome);
    };
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (err) => finish({ code: -1, stdout, stderr: String(err.message), timedOut: false }));
    child.on("close", (code) => finish({ code, stdout, stderr: stderr.slice(-4000), timedOut }));
    // The prompt goes in on stdin, which keeps an Issue body off argv.
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });

export interface Summary {
  relays: number;
  children: number;
  kept: number;
  cost_usd: number;
  // The time the relays' commands and the child sessions took, as this host measured it. A session's own
  // duration leaves out the time it waited on what it started.
  relay_ms: number;
  child_ms: number;
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

// A host that was ended while it wrote leaves a last line cut short. That line is one call asked
// again, and not a reason to lose every call before it.
const readKept = (state: string): Map<string, JsonValue> => {
  const kept = new Map<string, JsonValue>();
  if (!existsSync(state)) return kept;
  for (const line of readFileSync(state, "utf8").split("\n")) {
    try {
      const { key, value } = JSON.parse(line) as { key: string; value: JsonValue };
      if (typeof key === "string") kept.set(key, value);
    } catch {
      // not a whole line
    }
  }
  return kept;
};

// A relay is a call whose schema asks for relay_check. The schema is the script's, so text the
// script did not write cannot make a call a relay: an Issue body quoted in an implementing prompt
// can hold a spec block of its own, and it is never run. The spec is the first block, which in a
// relay's prompt comes before anything the script appends.
const isRelay = (opts: AgentOptions): boolean =>
  Boolean(opts.schema?.properties && "relay_check" in opts.schema.properties);
const specIn = (prompt: string): Spec | null => {
  const found = SPEC_BLOCK.exec(prompt);
  return found && digest(found[2]) === found[1] ? (JSON.parse(found[2]) as Spec) : null;
};

// What a child session printed, as the value agent() returns: the structured reply under a schema,
// the final text without one, and null for a session that failed, as the Agent tool returns for
// an agent that died. `unshaped` names the session that finished without the structured form.
const replyOf = (
  outcome: ChildOutcome,
  schema: unknown,
  label: string,
  onLog: (message: string) => void,
): { value: JsonValue; cost: number; unshaped?: string } => {
  if (outcome.timedOut) {
    onLog(`[${label}] the child session was ended at its time limit; the call returns null.`);
    return { value: null, cost: 0 };
  }
  let reply: JsonValue;
  try {
    reply = JSON.parse(outcome.stdout);
  } catch {
    const tail = outcome.stderr.split("\n").slice(-3).join(" ");
    onLog(`[${label}] the child session exited ${outcome.code} with no result. ${tail}; the call returns null.`);
    return { value: null, cost: 0 };
  }
  const cost = Number(reply.total_cost_usd) || 0;
  const failed = Boolean(reply.is_error) || outcome.code !== 0;
  // A reply in the schema's shape is the session's result, also when the session then ended on an error.
  if (schema && reply.structured_output !== undefined && reply.structured_output !== null) {
    if (failed) onLog(`[${label}] the child session ended as ${reply.subtype} after giving its reply.`);
    return { value: reply.structured_output, cost };
  }
  if (failed) {
    onLog(`[${label}] the child session ended as ${reply.subtype}; the call returns null.`);
    return { value: null, cost };
  }
  if (!schema) return { value: String(reply.result ?? "").trim(), cost };
  onLog(`[${label}] the child session gave no reply in the schema's shape.`);
  return { value: null, cost, unshaped: String(reply.session_id ?? "") };
};

export function createHost({
  repo,
  state,
  concurrency = DEFAULT_CONCURRENCY,
  onLog = () => {},
  runOnce = runClaudeOnce,
}: HostOptions): { stubs: RunWorkflowStubs; summary: Summary } {
  const summary: Summary = { relays: 0, children: 0, kept: 0, cost_usd: 0, relay_ms: 0, child_ms: 0 };
  const beside = dirname(state);
  mkdirSync(beside, PRIVATE_DIR);
  const kept = readKept(state);
  // A whole line follows a line that was cut short only after a line break.
  if (existsSync(state) && !readFileSync(state, "utf8").endsWith("\n")) appendFileSync(state, "\n", PRIVATE_FILE);
  const withSlot = makeSlots(concurrency);
  // A relay's command can read data from the prompt of the agent that runs it (write-body.ts reads
  // the PR body that way, DR-0125). There is no agent here, so the prompt is stored where such a
  // command looks: as the first line of a transcript under the directory RELAY_PROJECTS names.
  const transcripts = join(beside, "projects", "claude-run", "host", "subagents");
  mkdirSync(transcripts, PRIVATE_DIR);
  process.env.RELAY_PROJECTS = join(beside, "projects");
  const sessions = join(beside, "sessions");
  mkdirSync(sessions, PRIVATE_DIR);
  // A resumed run numbers its files after the ones the stopped run left.
  let serial = readdirSync(transcripts).length + readdirSync(sessions).length;

  const relayed = async (prompt: string, label: string): Promise<JsonValue> => {
    const spec = specIn(prompt);
    if (!spec) {
      // A relay's commands are never handed to a session to run by hand.
      onLog(`[${label}] the relay's prompt carries no spec with the digest it names; the call returns null.`);
      return null;
    }
    serial += 1;
    writeFileSync(
      join(transcripts, `agent-${serial}.jsonl`),
      `${JSON.stringify({ type: "user", message: { role: "user", content: prompt } })}\n`,
      PRIVATE_FILE,
    );
    const started = Date.now();
    const { fields } = await runSpec(spec);
    const shown = publicFields(fields);
    summary.relays += 1;
    summary.relay_ms += Date.now() - started;
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
        const started = Date.now();
        const outcome = await runOnce(asked);
        summary.child_ms += Date.now() - started;
        // Each session's own result, for reading why a call returned nothing and what it cost.
        serial += 1;
        writeFileSync(
          join(sessions, `${serial}-${label.replace(/[^\w.-]/g, "_")}${part}.json`),
          outcome.stdout,
          PRIVATE_FILE,
        );
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
      if (second.value === null)
        onLog(`[${label}] asked once more in the same session and got no reply; the call returns null.`);
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
    const value = isRelay(opts) ? await relayed(prompt, label) : await answered(prompt, opts, label);
    // A call that returned nothing is asked again on a resume.
    if (value !== null && value !== undefined) {
      kept.set(key, value);
      appendFileSync(state, `${JSON.stringify({ key, label, value })}\n`, PRIVATE_FILE);
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

// Two hosts on one state file would each miss the other's results and run the same push twice. The
// lock names the process that holds the file, and a lock whose process is gone is taken over.
export const holdState = (state: string): (() => void) => {
  const lock = `${state}.lock`;
  mkdirSync(dirname(state), PRIVATE_DIR);
  const holder = existsSync(lock) ? Number(readFileSync(lock, "utf8")) : 0;
  const alive = (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // A process of another user is running all the same.
      return (error as NodeJS.ErrnoException).code === "EPERM";
    }
  };
  if (holder && holder !== process.pid && alive(holder)) {
    throw new Error(`the state file ${state} is held by the running process ${holder}`);
  }
  writeFileSync(lock, String(process.pid), PRIVATE_FILE);
  return () => rmSync(lock, { force: true });
};

interface Call {
  name: string;
  args: Record<string, unknown> & { repo: string };
  concurrency: number | undefined;
  state: string | undefined;
}

// --state is this host's own flag. The rest is the argv codex-run.ts reads. A call that cannot be
// read is null, and the caller prints the usage.
export const readCall = (argv: string[]): Call | null => {
  const at = argv.indexOf("--state");
  const state = at < 0 ? undefined : argv[at + 1];
  if (at >= 0 && (!state || state.startsWith("--"))) return null;
  const rest = at < 0 ? argv : [...argv.slice(0, at), ...argv.slice(at + 2)];
  try {
    const { name, args, concurrency } = parseArgv(rest);
    if (!name || typeof args.repo !== "string") return null;
    if (concurrency !== undefined && !(Number.isInteger(concurrency) && concurrency >= 1)) return null;
    // A step runs in the worktree, so a path relative to where the host started would not be found from there.
    return { name, args: { ...args, repo: args.repo }, concurrency, state: state ? resolve(state) : undefined };
  } catch {
    return null;
  }
};

// Whether a child session can run commands under the user's permission rules. A session that cannot would
// implement for minutes and then report that it could not run a test, so a caller asks before it starts a run.
// `denied` lists the commands the rules refused.
export async function probeChild(
  repo: string,
  commands: string[],
  runOnce: (run: ChildRun) => Promise<ChildOutcome> = runClaudeOnce,
): Promise<{ ran: boolean; denied: string[]; why: string }> {
  const outcome = await runOnce({
    prompt: `Run each of these commands with the Bash tool, one call for each, and then reply with the single word done. Do nothing else.\n${commands.join("\n")}`,
    model: "haiku",
    effort: undefined,
    schema: undefined,
    cwd: repo,
    timeoutMs: 120_000,
  });
  let reply: JsonValue;
  try {
    reply = JSON.parse(outcome.stdout);
  } catch {
    return { ran: false, denied: [], why: `claude -p exited ${outcome.code} with no result. ${outcome.stderr.slice(-300)}` };
  }
  const denials: JsonValue[] = Array.isArray(reply.permission_denials) ? reply.permission_denials : [];
  const denied = denials.map((denial) => String(denial?.tool_input?.command ?? denial?.tool_name ?? ""));
  if (denied.length) return { ran: false, denied, why: "the user's permission rules refused a command" };
  if (reply.is_error || outcome.code !== 0)
    return { ran: false, denied, why: `the session ended as ${reply.subtype}` };
  return { ran: true, denied, why: "" };
}

const USAGE =
  "usage: claude-run.ts <workflow> --repo <abs path> [--issue N] [--base B] [--args <json>] " +
  "[--state <file>] [--concurrency N]\n";

// The command as a function, so a skill's script and the tests can call it. `resolvePath` names the script a
// workflow name stands for.
export async function main(
  argv: string[],
  {
    resolvePath = resolveWorkflowPath,
    out = (text: string) => process.stdout.write(text),
    onLog = (message: string) => process.stderr.write(`${message}\n`),
  }: {
    resolvePath?: (name: string) => string;
    out?: (text: string) => void;
    onLog?: (message: string) => void;
  } = {},
): Promise<number> {
  const call = readCall(argv);
  if (!call) {
    onLog(USAGE.trimEnd());
    return 2;
  }
  const state =
    call.state ?? join(mkdtempSync(join(process.env.TMPDIR || tmpdir(), "claude-run-")), "calls.jsonl");
  const resultPath = join(dirname(state), "result.json");
  const release = holdState(state);
  const ended = () => {
    endAll();
    release();
    process.exit(143);
  };
  const signals = ["SIGTERM", "SIGINT", "SIGHUP"] as const;
  for (const name of signals) process.on(name, ended);
  onLog(`claude-run: state ${state}`);
  const { stubs, summary } = createHost({ repo: call.args.repo, state, concurrency: call.concurrency, onLog });
  let code = 0;
  try {
    const { result } = await runWorkflow(resolvePath(call.name), {
      args: call.args,
      stubs,
      onLog,
      onPhase: (title) => onLog(`== ${title}`),
    });
    const text = `${JSON.stringify(result, null, 2)}\n`;
    writeFileSync(resultPath, text, PRIVATE_FILE);
    out(text);
  } catch (error) {
    endAll();
    onLog(`claude-run: the script threw: ${error instanceof Error ? error.message : String(error)}`);
    code = 1;
  }
  onLog(`claude-run: ${JSON.stringify({ ...summary, state, result: code === 0 ? resultPath : null })}`);
  for (const name of signals) process.off(name, ended);
  release();
  return code;
}

if (isMainModule(import.meta.url)) process.exit(await main(process.argv.slice(2)));
