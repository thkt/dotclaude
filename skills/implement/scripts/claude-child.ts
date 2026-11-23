/// <reference types="node" />
import { spawn } from "node:child_process";

const CHILD_TOOLS = process.env.CLAUDE_RUN_TOOLS || "Read,Write,Edit,MultiEdit,Glob,Grep,LS";
const CHILD_DENIED = "Agent,Workflow";
export const GIVE_REPLY =
  "Your work in this session is done. Give its result now through the structured output, in the shape the schema asks for. Do no further work.";

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
