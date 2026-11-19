/// <reference types="node" />
import { readFileSync } from "node:fs";
import vm from "node:vm";

type ScriptValue = any;

export interface RunWorkflowStubs {
  agent?: (prompt: ScriptValue, opts: ScriptValue) => unknown;
  workflow?: (name: string, args: ScriptValue) => unknown;
  pipeline?: (items: ScriptValue[], ...stages: PipelineStage[]) => unknown;
}

type PipelineStage = (prev: ScriptValue, item: ScriptValue, index: number) => unknown;

export interface RunWorkflowOptions {
  args?: ScriptValue;
  stubs?: RunWorkflowStubs;
  onLog?: (message: ScriptValue) => void;
  onPhase?: (title: ScriptValue) => void;
}

interface RunWorkflowCalls {
  agent: { prompt: ScriptValue; opts: ScriptValue }[];
  workflow: { name: string; args: ScriptValue }[];
  phase: ScriptValue[];
}

export interface RunWorkflowResult {
  result: ScriptValue;
  calls: RunWorkflowCalls;
  logs: ScriptValue[];
}

interface WorkflowMeta {
  name: string;
  description: string;
  whenToUse?: string;
  phases?: { title: string; detail?: string }[];
}

export const PRODUCTION_GLOBALS = ["budget", "console", "setTimeout", "clearTimeout"];

const ERROR_CONSTRUCTORS: Record<string, ErrorConstructor> = {
  Error,
  TypeError,
  RangeError,
  ReferenceError,
  SyntaxError,
  EvalError,
  URIError,
};
const toHostRealmError = (err: unknown): unknown => {
  if (err instanceof Error) return err;
  if (
    err &&
    typeof err === "object" &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    const foreign = err as { name?: unknown; message: string; stack?: unknown };
    const Ctor = ERROR_CONSTRUCTORS[String(foreign.name)] ?? Error;
    const hostErr = new Ctor(foreign.message);
    if (typeof foreign.stack === "string") hostErr.stack = foreign.stack;
    return hostErr;
  }
  return err;
};

export const SCRIPT_ERROR_KEYS = ["name", "message", "stack", "toString"] as const;

const toScriptRealmError = (err: unknown): unknown => {
  if (!(err instanceof Error)) return err;
  const supply: Record<(typeof SCRIPT_ERROR_KEYS)[number], unknown> = {
    name: err.name,
    message: err.message,
    stack: typeof err.stack === "string" ? err.stack : `${err.name}: ${err.message}`,
    toString: () => `${err.name}: ${err.message}`,
  };
  const shim: Record<string, unknown> = Object.create(null);
  for (const key of SCRIPT_ERROR_KEYS) shim[key] = supply[key];
  return shim;
};

const asProductionThrow =
  <A extends unknown[], R>(fn: (...callArgs: A) => R) =>
  (...callArgs: A): R => {
    try {
      const out = fn(...callArgs);
      return out instanceof Promise
        ? (out.catch((err: unknown) => {
            throw toScriptRealmError(err);
          }) as R)
        : out;
    } catch (err) {
      throw toScriptRealmError(err);
    }
  };

const rehome = (value: ScriptValue, seen = new Map<object, ScriptValue>()): ScriptValue => {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const out: ScriptValue[] = [];
    seen.set(value, out);
    for (const item of value) out.push(rehome(item, seen));
    return out;
  }
  const out: Record<string, ScriptValue> = {};
  seen.set(value, out);
  for (const key of Object.keys(value)) out[key] = rehome(value[key], seen);
  return out;
};

const SANDBOX_SETUP_SOURCE = `
(function () {
  const OriginalDate = Date;
  const DATE_MESSAGE = "Date.now() / new Date() are unavailable in workflow scripts (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.";
  const RANDOM_MESSAGE = "Math.random() is unavailable in workflow scripts (breaks resume). For N independent samples, include the index in the agent label or prompt.";
  class SandboxDate extends OriginalDate {
    constructor(...ctorArgs) {
      if (ctorArgs.length === 0) throw new Error(DATE_MESSAGE);
      super(...ctorArgs);
    }
    static now() {
      throw new Error(DATE_MESSAGE);
    }
  }
  globalThis.Date = SandboxDate;
  globalThis.Math = Object.create(Math, {
    random: {
      value: function () { throw new Error(RANDOM_MESSAGE); },
      enumerable: true,
      configurable: true,
      writable: true,
    },
  });
})();
`;

const partToString = (part: unknown): string => {
  if (typeof part === "string") return part;
  try {
    return JSON.stringify(part);
  } catch {
    return `[${typeof part}]`;
  }
};

function stepInQuote(ch: string, quote: string): { consumed: number; quote: string | null } {
  if (ch === "\\") return { consumed: 2, quote };
  if (ch === quote) return { consumed: 1, quote: null };
  return { consumed: 1, quote };
}

const matchBrace = (source: string, start: number): number => {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      const step = stepInQuote(ch, quote);
      i += step.consumed - 1;
      quote = step.quote;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`${start}: unterminated brace`);
};

export function readMeta(scriptPath: string): WorkflowMeta {
  const source = readFileSync(scriptPath, "utf8");
  const marker = "export const meta = {";
  const markerIdx = source.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error(`${scriptPath}: no "export const meta = {" found`);
  }
  const braceStart = source.indexOf("{", markerIdx);
  const braceEnd = matchBrace(source, braceStart);
  const literal = source.slice(braceStart, braceEnd + 1);
  const evaluate = vm.compileFunction(`return (${literal});`, [], { filename: scriptPath });
  return evaluate() as WorkflowMeta;
}

export function checkWorkflowSyntax(scriptPath: string): void {
  const source = readFileSync(scriptPath, "utf8").replace(/^export const meta/m, "const meta");
  vm.compileFunction(
    `return (async () => {\n${source}\n})();`,
    ["args", "agent", "workflow", "parallel", "pipeline", "phase", "log"],
    { filename: scriptPath },
  );
}

export async function runWorkflow(
  scriptPath: string,
  options: RunWorkflowOptions = {},
): Promise<RunWorkflowResult> {
  const { args = {}, stubs = {}, onLog = () => {}, onPhase = () => {} } = options;
  const source = readFileSync(scriptPath, "utf8").replace(/^export const meta/m, "const meta");
  const calls: RunWorkflowCalls = { agent: [], workflow: [], phase: [] };
  const logs: ScriptValue[] = [];
  const mirror = (notify: (value: ScriptValue) => void) => (value: ScriptValue) => {
    try {
      notify(value);
    } catch {
    }
  };
  const notifyPhase = mirror(onPhase);
  const notifyLog = mirror(onLog);

  const agent = asProductionThrow(async (prompt: ScriptValue, opts: ScriptValue = {}) => {
    const hostPrompt = rehome(prompt);
    const hostOpts = rehome(opts);
    calls.agent.push({ prompt: hostPrompt, opts: hostOpts });
    return stubs.agent ? stubs.agent(hostPrompt, hostOpts) : undefined;
  });
  const workflow = asProductionThrow(async (name: string, wfArgs: ScriptValue) => {
    const hostArgs = rehome(wfArgs);
    calls.workflow.push({ name, args: hostArgs });
    return stubs.workflow ? stubs.workflow(name, hostArgs) : undefined;
  });
  const parallel = asProductionThrow(async (tasks: ScriptValue[]) =>
    Promise.all(
      tasks.map(async (t) => {
        try {
          return await (typeof t === "function" ? t() : t);
        } catch {
          return null;
        }
      }),
    ),
  );
  const pipeline = asProductionThrow(async (items: ScriptValue[], ...stages: PipelineStage[]) => {
    if (stubs.pipeline) return stubs.pipeline(items, ...stages);
    return Promise.all(
      items.map(async (item, index) => {
        let prev: ScriptValue = item;
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
  });
  const phase = asProductionThrow((title: ScriptValue) => {
    const hostTitle = rehome(title);
    calls.phase.push(hostTitle);
    notifyPhase(hostTitle);
  });
  const log = asProductionThrow((message: ScriptValue) => {
    const hostMessage = rehome(message);
    logs.push(hostMessage);
    notifyLog(hostMessage);
  });

  const consoleWrite =
    (prefix: string) =>
    (...parts: unknown[]) =>
      logs.push(prefix + parts.map(partToString).join(" "));
  const context = vm.createContext(
    {
      budget: { total: null, spent: () => 0, remaining: () => Infinity },
      console: {
        log: consoleWrite(""),
        info: consoleWrite(""),
        debug: consoleWrite(""),
        warn: consoleWrite("[warn] "),
        error: consoleWrite("[error] "),
      },
      setTimeout,
      clearTimeout,
    },
    { codeGeneration: { strings: false, wasm: false } },
  );
  vm.runInContext(SANDBOX_SETUP_SOURCE, context, { filename: "sandbox-setup.js" });

  const run = vm.compileFunction(
    `return (async () => {\n${source}\n})();`,
    ["args", "agent", "workflow", "parallel", "pipeline", "phase", "log"],
    { parsingContext: context, filename: scriptPath },
  );

  try {
    const result = await run(args, agent, workflow, parallel, pipeline, phase, log);
    return { result: rehome(result), calls, logs };
  } catch (err) {
    throw toHostRealmError(err);
  }
}
