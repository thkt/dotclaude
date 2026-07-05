// workflow script (workflows/*.js) を node:test から行動検証するための harness。
// script は `export const meta` + top-level return + agent/workflow/parallel/phase/log の
// 注入 global という形で書かれているため、ESM import では実行できない。
// ソースの `export const meta` を `const meta` に置換し、AsyncFunction の body として
// 実行することで top-level return と注入 global の両方を再現する。
import { readFileSync } from "node:fs";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// runWorkflow(scriptPath, { args, stubs }) -> { result, calls, logs }
// stubs.agent / stubs.workflow は (prompt|name, opts|args) を受けて stub 結果を返す。
// calls は agent / workflow / phase の呼び出し capture。
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
