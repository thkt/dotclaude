/// <reference types="node" />
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { objectOf, parseObject } from "./launch-state.ts";

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
export const endGroup = (pid: number, name: NodeJS.Signals) => {
  try {
    process.kill(-pid, name);
  } catch {
  }
};
export const endAll = () => {
  for (const pid of runningChildren) endGroup(pid, "SIGTERM");
};

const GITHUB_HOSTS = ["github.com", "api.github.com", "*.github.com"];

const givenSettingsOf = (given: string | undefined, cwd: string): Record<string, unknown> | string => {
  if (!given) return {};
  if (/^\s*[{[]/.test(given)) {
    return parseObject(given) ?? `CLAUDE_RUN_SETTINGS is not a JSON object: ${given}`;
  }
  const path = resolve(cwd, given);
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    return `CLAUDE_RUN_SETTINGS names a file that could not be read: ${(err as Error).message}`;
  }
  return parseObject(text) ?? `CLAUDE_RUN_SETTINGS names ${path}, which does not hold a JSON object.`;
};

const sandboxedSettingsOf = (given: Record<string, unknown>): Record<string, unknown> => {
  const sandbox = objectOf(given.sandbox) ?? {};
  const network = objectOf(sandbox.network) ?? {};
  const denied = Array.isArray(network.deniedDomains) ? network.deniedDomains.filter((host) => typeof host === "string") : [];
  return {
    ...given,
    sandbox: {
      ...sandbox,
      enabled: true,
      failIfUnavailable: true,
      allowUnsandboxedCommands: false,
      network: { ...network, strictAllowlist: true, deniedDomains: [...new Set([...denied, ...GITHUB_HOSTS])] },
    },
  };
};

const claudeArgv = ({ model, effort, schema, resume, fork, tools, sessionId, everyTurn, cwd }: ChildRun): string[] | string => {
  const given = givenSettingsOf(process.env.CLAUDE_RUN_SETTINGS, cwd);
  if (typeof given === "string") return given;
  const format = everyTurn ? ["stream-json", "--verbose"] : ["json"];
  const argv = ["-p", "--model", model, "--output-format", ...format, "--allowedTools", tools ?? CHILD_TOOLS];
  argv.push("--disallowedTools", CHILD_DENIED);
  if (effort) argv.push("--effort", effort);
  if (resume) argv.push("--resume", resume);
  if (resume && fork) argv.push("--fork-session");
  if (sessionId) argv.push("--session-id", sessionId);
  if (schema) argv.push("--json-schema", JSON.stringify(schema));
  argv.push("--settings", JSON.stringify(sandboxedSettingsOf(given)));
  return argv;
};

export const runClaudeOnce = (run: ChildRun): Promise<ChildOutcome> =>
  new Promise((done) => {
    const { prompt, cwd, timeoutMs } = run;
    const argv = claudeArgv(run);
    if (typeof argv === "string") {
      done({ code: 1, stdout: "", stderr: `claude was not started: ${argv}`, timedOut: false });
      return;
    }
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
    child.on("error", (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      const message = typeof code === "string" ? `${code}: ${err.message}` : String(err.message);
      finish({ code: -1, stdout, stderr: message, timedOut: false });
    });
    child.on("close", (code) => finish({ code, stdout, stderr: stderr.slice(-4000), timedOut }));
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });
