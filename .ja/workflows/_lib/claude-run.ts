/// <reference types="node" />
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

type JsonValue = any;

interface AgentOptions {
  label?: string;
  model?: string;
  effort?: string;
  schema?: { properties?: Record<string, unknown>; [key: string]: unknown };
}

const CHILD_TOOLS = process.env.CLAUDE_RUN_TOOLS || "Read,Write,Edit,MultiEdit,Glob,Grep,LS";
const CHILD_DENIED = "Agent,Workflow";
const CHILD_TIMEOUT_MS = Number(process.env.CLAUDE_RUN_TIMEOUT_MS) || 3_600_000;
const DEFAULT_CONCURRENCY = 4;
const SPEC_BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n([^\n]*)\nRELAY_SPEC_END/;
export const GIVE_REPLY =
  "Your work in this session is done. Give its result now through the structured output, in the shape the schema asks for. Do no further work.";
const PRIVATE_DIR = { recursive: true, mode: 0o700 } as const;
const PRIVATE_FILE = { mode: 0o600 } as const;

export interface ChildRun {
  prompt: string;
  model: string;
  effort: string | undefined;
  schema: Record<string, unknown> | undefined;
  cwd: string;
  timeoutMs: number;
  resume?: string;
  fork?: boolean;
  tools?: string;
  sessionId?: string;
  everyTurn?: boolean;
  onStart?: (pid: number) => void;
}
export interface ChildOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const runningChildren = new Set<number>();
const endGroup = (pid: number, name: NodeJS.Signals) => {
  try {
    process.kill(-pid, name);
  } catch {
  }
};
export const endAll = () => {
  endRunningGroups();
  for (const pid of runningChildren) endGroup(pid, "SIGTERM");
};

const claudeArgv = ({ model, effort, schema, resume, fork, tools, sessionId, everyTurn }: ChildRun): string[] => {
  const format = everyTurn ? ["stream-json", "--verbose"] : ["json"];
  const argv = ["-p", "--model", model, "--output-format", ...format, "--allowedTools", tools ?? CHILD_TOOLS];
  argv.push("--disallowedTools", CHILD_DENIED);
  if (effort) argv.push("--effort", effort);
  if (resume) argv.push("--resume", resume);
  if (resume && fork) argv.push("--fork-session");
  if (sessionId) argv.push("--session-id", sessionId);
  if (schema) argv.push("--json-schema", JSON.stringify(schema));
  if (process.env.CLAUDE_RUN_SETTINGS) argv.push("--settings", process.env.CLAUDE_RUN_SETTINGS);
  return argv;
};

export const runClaudeOnce = (run: ChildRun): Promise<ChildOutcome> =>
  new Promise((done) => {
    const { prompt, cwd, timeoutMs } = run;
    const argv = claudeArgv(run);
    const child = spawn("claude", argv, { cwd, stdio: ["pipe", "pipe", "pipe"], detached: true });
    const pid = child.pid ?? 0;
    if (pid) runningChildren.add(pid);
    if (pid) run.onStart?.(pid);
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
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });

export interface Summary {
  relays: number;
  children: number;
  kept: number;
  cost_usd: number;
  relay_ms: number;
  child_ms: number;
}

export interface HostOptions {
  repo: string;
  state: string;
  concurrency?: number;
  onLog?: (message: string) => void;
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
    try {
      const { key, value } = JSON.parse(line) as { key: string; value: JsonValue };
      if (typeof key === "string") kept.set(key, value);
    } catch {
    }
  }
  return kept;
};

const isRelay = (opts: AgentOptions): boolean =>
  Boolean(opts.schema?.properties && "relay_check" in opts.schema.properties);
const specIn = (prompt: string): Spec | null => {
  const found = SPEC_BLOCK.exec(prompt);
  return found && digest(found[2]) === found[1] ? (JSON.parse(found[2]) as Spec) : null;
};

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
  if (existsSync(state) && !readFileSync(state, "utf8").endsWith("\n")) appendFileSync(state, "\n", PRIVATE_FILE);
  const withSlot = makeSlots(concurrency);
  const projects = join(beside, "projects");
  const transcripts = join(projects, "claude-run", "host", "subagents");
  mkdirSync(transcripts, PRIVATE_DIR);
  const sessions = join(beside, "sessions");
  mkdirSync(sessions, PRIVATE_DIR);
  let serial = readdirSync(transcripts).length + readdirSync(sessions).length;

  const relayed = async (prompt: string, label: string): Promise<JsonValue> => {
    const spec = specIn(prompt);
    if (!spec) {
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
    const { fields } = await runSpec(spec, 0, { ...spec.defaults }, undefined, undefined, { RELAY_PROJECTS: projects });
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
    if (value !== null && value !== undefined) {
      kept.set(key, value);
      appendFileSync(state, `${JSON.stringify({ key, label, value })}\n`, PRIVATE_FILE);
    }
    return value;
  };
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

export const holdState = (state: string): (() => void) => {
  const lock = `${state}.lock`;
  mkdirSync(dirname(state), PRIVATE_DIR);
  const holder = existsSync(lock) ? Number(readFileSync(lock, "utf8")) : 0;
  const alive = (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
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

const takeFlag = (argv: string[], name: string): { value: string | undefined; rest: string[]; bad: boolean } => {
  const at = argv.indexOf(name);
  if (at < 0) return { value: undefined, rest: argv, bad: false };
  const value = argv[at + 1];
  return { value, rest: [...argv.slice(0, at), ...argv.slice(at + 2)], bad: !value || value.startsWith("--") };
};
export const readCall = (argv: string[]): Call | null => {
  const stateFlag = takeFlag(argv, "--state");
  const fileFlag = takeFlag(stateFlag.rest, "--args-file");
  if (stateFlag.bad || fileFlag.bad) return null;
  const state = stateFlag.value;
  try {
    const rest = fileFlag.value
      ? [...fileFlag.rest, "--args", readFileSync(fileFlag.value, "utf8")]
      : fileFlag.rest;
    const { name, args, concurrency } = parseArgv(rest);
    if (!name || typeof args.repo !== "string") return null;
    if (concurrency !== undefined && !(Number.isInteger(concurrency) && concurrency >= 1)) return null;
    return { name, args: { ...args, repo: args.repo }, concurrency, state: state ? resolve(state) : undefined };
  } catch {
    return null;
  }
};

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
  "[--args-file <file>] [--state <file>] [--concurrency N]\n";

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
  let release: () => void;
  try {
    release = holdState(state);
  } catch (error) {
    onLog(`claude-run: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
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
