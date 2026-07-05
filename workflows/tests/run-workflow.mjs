// Harness for behavior-testing workflow scripts (workflows/*.js) from node:test.
// Scripts are written as `export const meta` + top-level return + injected globals
// (agent/workflow/parallel/phase/log), so they cannot run via ESM import.
// Replacing the source's `export const meta` with `const meta` and executing it as
// an AsyncFunction body reproduces both the top-level return and the injected globals.
import { readFileSync } from "node:fs";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// runWorkflow(scriptPath, { args, stubs }) -> { result, calls, logs }
// stubs.agent / stubs.workflow receive (prompt|name, opts|args) and return the stub result.
// calls captures the agent / workflow / phase invocations.
export async function runWorkflow(scriptPath, { args = {}, stubs = {} } = {}) {
  const source = readFileSync(scriptPath, "utf8").replace(
    /^export const meta/m,
    "const meta",
  );
  const calls = { agent: [], workflow: [], phase: [] };
  const logs = [];

  const agent = async (prompt, opts = {}) => {
    calls.agent.push({ prompt, opts });
    return stubs.agent ? stubs.agent(prompt, opts) : undefined;
  };
  const workflow = async (name, wfArgs) => {
    calls.workflow.push({ name, args: wfArgs });
    return stubs.workflow ? stubs.workflow(name, wfArgs) : undefined;
  };
  const parallel = async (tasks) =>
    Promise.all(tasks.map((t) => (typeof t === "function" ? t() : t)));
  const phase = (title) => {
    calls.phase.push(title);
  };
  const log = (message) => {
    logs.push(message);
  };

  const run = new AsyncFunction(
    "args",
    "agent",
    "workflow",
    "parallel",
    "phase",
    "log",
    source,
  );
  const result = await run(args, agent, workflow, parallel, phase, log);
  return { result, calls, logs };
}
