// Harness for behavior-testing workflow scripts (workflows/*.js) from node:test.
// Scripts are written as `export const meta` + top-level return + injected globals
// (agent/workflow/parallel/pipeline/phase/log), so they cannot run via ESM import.
// Replacing the source's `export const meta` with `const meta` and executing it as
// an AsyncFunction body reproduces both the top-level return and the injected globals.
import { readFileSync } from "node:fs";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// runWorkflow(scriptPath, { args, stubs }) -> { result, calls, logs }
// stubs.agent / stubs.workflow receive (prompt|name, opts|args) and return the stub result.
// stubs.pipeline receives (items, ...stages) and replaces the default pipeline implementation.
// calls captures the agent / workflow / phase invocations.
export async function runWorkflow(scriptPath, { args = {}, stubs = {} } = {}) {
  const source = readFileSync(scriptPath, "utf8").replace(/^export const meta/m, "const meta");
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
  // The default mirrors the production runtime contract: every item flows through all
  // stages as (prev, originalItem, index), and an item whose stage throws is left as
  // null at its original position (no compaction, no reordering).
  const pipeline = async (items, ...stages) => {
    if (stubs.pipeline) return stubs.pipeline(items, ...stages);
    return Promise.all(
      items.map(async (item, index) => {
        let prev = item;
        for (const stage of stages) {
          try {
            prev = await stage(prev, item, index);
          } catch {
            return null;
          }
        }
        return prev;
      }),
    );
  };
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
    "pipeline",
    "phase",
    "log",
    source,
  );
  const result = await run(args, agent, workflow, parallel, pipeline, phase, log);
  return { result, calls, logs };
}
