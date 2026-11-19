/// <reference types="node" />
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isMainModule } from "./entry-point.ts";
import { runWorkflow } from "./run-workflow.ts";
import type { RunWorkflowStubs } from "./run-workflow.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
  anyOf?: JsonSchema[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

type JsonValue = any;

type AgentOptions = {
  label?: string;
  agentType?: string;
  model?: string;
  effort?: string;
  schema?: JsonSchema;
};

export const MODEL_MAP: Record<string, string> = {
  haiku: process.env.CODEX_MODEL_HAIKU || "gpt-5.6-luna",
  sonnet: process.env.CODEX_MODEL_SONNET || "gpt-5.6-terra",
  opus: process.env.CODEX_MODEL_OPUS || "gpt-5.6-sol",
};

const DEFAULT_EFFORT = process.env.CODEX_EFFORT || "medium";
const DEFAULT_TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS || 1_800_000);
const DEFAULT_CONCURRENCY = Math.max(1, Math.min(16, availableParallelism() - 2));
const ATTEMPTS = 2;

const NULL_SCHEMA: JsonSchema = { type: "null" };
const nullable = (schema: JsonSchema): JsonSchema => ({ anyOf: [schema, NULL_SCHEMA] });

const typeList = (type: JsonSchema["type"]): string[] =>
  Array.isArray(type) ? type : type === undefined ? [] : [type];

const acceptsNull = (schema: JsonSchema | undefined): boolean => {
  if (!schema || typeof schema !== "object") return true;
  if (typeList(schema.type).includes("null")) return true;
  return schema.type === undefined && !schema.properties && !schema.items;
};

const described = (schema: JsonSchema, description: string | undefined): JsonSchema =>
  description ? { ...schema, description } : schema;

const keepNullBranch = (
  out: JsonSchema,
  includesNull: boolean,
  description: string | undefined,
): JsonSchema => (includesNull ? described(nullable(out), description) : out);

export function strictify(schema: JsonSchema): JsonSchema;
export function strictify(schema: JsonSchema | undefined): JsonSchema | undefined;
export function strictify(schema: JsonSchema | undefined): JsonSchema | undefined {
  if (!schema || typeof schema !== "object") return schema;

  const types = typeList(schema.type);
  const typeIncludesNull = types.includes("null");
  const bare = types.filter((t) => t !== "null");

  if (bare.includes("object") || schema.properties) {
    const properties: Record<string, JsonSchema> = {};
    const originallyRequired = new Set(schema.required || []);
    for (const [key, value] of Object.entries(schema.properties || {})) {
      const translated = strictify(value);
      properties[key] = originallyRequired.has(key) ? translated : nullable(translated);
    }
    const out = described(
      {
        type: "object",
        additionalProperties: false,
        required: Object.keys(properties),
        properties,
      },
      schema.description,
    );
    return keepNullBranch(out, typeIncludesNull, schema.description);
  }

  if (bare.includes("array")) {
    const out = described({ type: "array", items: strictify(schema.items) }, schema.description);
    return keepNullBranch(out, typeIncludesNull, schema.description);
  }

  if (!typeIncludesNull) return { ...schema };
  const scalar: JsonSchema = { ...schema, type: bare.length === 1 ? bare[0] : bare };
  return described(nullable(scalar), schema.description);
}

export function pruneNulls(value: JsonValue, schema: JsonSchema | undefined): JsonValue {
  if (!schema || typeof schema !== "object" || value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    if (!schema.items) return value;
    return value.map((item) => pruneNulls(item, schema.items));
  }

  const types = typeList(schema.type);
  if (types.includes("object") || schema.properties) {
    const required = new Set(schema.required || []);
    const out: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child === null && !required.has(key)) continue;
      out[key] = pruneNulls(child, (schema.properties || {})[key]);
    }
    return out;
  }
  return value;
}

function findArrayViolation(value: JsonValue, schema: JsonSchema, here: string): string {
  if (value === null) return acceptsNull(schema) ? "" : `${here} is null`;
  if (!Array.isArray(value)) return `${here} is not an array`;
  for (let index = 0; index < value.length; index++) {
    const found = findSchemaViolation(value[index], schema.items, `${here}[${index}]`);
    if (found) return found;
  }
  return "";
}

function requiredKeyViolation(
  value: Record<string, JsonValue>,
  schema: JsonSchema,
  path: string,
): string {
  const properties = schema.properties || {};
  for (const key of schema.required || []) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in value)) return `${childPath} is missing`;
    if (value[key] === null && !acceptsNull(properties[key])) return `${childPath} is null`;
  }
  return "";
}

function findObjectViolation(
  value: JsonValue,
  schema: JsonSchema,
  path: string,
  here: string,
): string {
  if (value === null) return acceptsNull(schema) ? "" : `${here} is null`;
  if (typeof value !== "object") return `${here} is not an object`;
  const requiredViolation = requiredKeyViolation(value, schema, path);
  if (requiredViolation) return requiredViolation;
  const properties = schema.properties || {};
  for (const [key, child] of Object.entries(value)) {
    const found = findSchemaViolation(child, properties[key], path ? `${path}.${key}` : key);
    if (found) return found;
  }
  return "";
}

export function findSchemaViolation(
  value: JsonValue,
  schema: JsonSchema | undefined,
  path = "",
): string {
  if (!schema || typeof schema !== "object") return "";
  const here = path || "the response";
  const types = typeList(schema.type);

  if (types.includes("array") || schema.items) return findArrayViolation(value, schema, here);
  if (types.includes("object") || schema.properties) {
    return findObjectViolation(value, schema, path, here);
  }

  if (value === null && !acceptsNull(schema)) return `${here} is null`;
  return "";
}

const withPreamble = (preamble: string, prompt: string): string =>
  preamble ? `${preamble}\n\n---\n\n${prompt}` : prompt;

const schemaCorrection = (reason: string): string =>
  `\n\nThe previous attempt returned a value that did not fit the output schema (${reason}). ` +
  `Answer again with every declared field filled, using null only where the schema allows it.`;

const WRITE_TOOLS = /\b(Edit|Write|NotebookEdit|MultiEdit)\b/;

interface LoadedAgent {
  preamble: string;
  readOnly: boolean;
  missing?: boolean;
}

let agentIndex: Map<string, string> | null = null;
const indexAgents = (): Map<string, string> => {
  if (agentIndex) return agentIndex;
  const index = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) index.set(entry.name.replace(/\.md$/, ""), full);
    }
  };
  const agentsDir = join(ROOT, "agents");
  if (existsSync(agentsDir)) walk(agentsDir);
  agentIndex = index;
  return index;
};

export function loadAgent(agentType: string | undefined): LoadedAgent {
  if (!agentType || agentType === "general-purpose") return { preamble: "", readOnly: false };
  const path = indexAgents().get(agentType);
  if (!path) return { preamble: "", readOnly: false, missing: true };

  const source = readFileSync(path, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const frontmatter = match ? match[1] : "";
  const body = match ? match[2] : source;
  const tools = (frontmatter.match(/^tools:\s*(.*)$/m) || [])[1] || "";
  return { preamble: body.trim(), readOnly: Boolean(tools) && !WRITE_TOOLS.test(tools) };
}

interface CodexRunSpec {
  prompt: string;
  model: string;
  effort: string;
  schemaPath: string;
  outPath: string;
  sandbox: string;
  cwd: string;
  timeoutMs: number;
}

interface CodexRunOutcome {
  code: number | null;
  stderr: string;
  timedOut: boolean;
}

const runCodexOnce = ({
  prompt,
  model,
  effort,
  schemaPath,
  outPath,
  sandbox,
  cwd,
  timeoutMs,
}: CodexRunSpec): Promise<CodexRunOutcome> =>
  new Promise((done) => {
    const argv = [
      "exec",
      "--skip-git-repo-check",
      "-C",
      cwd,
      "-s",
      sandbox,
      "-c",
      'approval_policy="never"',
      "-m",
      model,
      "-c",
      `model_reasoning_effort="${effort}"`,
    ];
    if (sandbox === "workspace-write") {
      argv.push("-c", "sandbox_workspace_write.network_access=true");
    }
    if (schemaPath) argv.push("--output-schema", schemaPath);
    argv.push("-o", outPath, "-");

    const child = spawn("codex", argv, { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", () => {});
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      done({ code: -1, stderr: String(err.message), timedOut: false });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      done({ code, stderr: stderr.slice(-4000), timedOut });
    });

    child.stdin?.end(prompt);
  });

interface AttemptOutcome {
  done: boolean;
  value: JsonValue;
  correction: string;
}

interface AttemptOnceArgs {
  label: string;
  model: string;
  effort: string;
  schema: JsonSchema | undefined;
  schemaPath: string;
  outPath: string;
  sandbox: string;
  repo: string;
  prompt: string;
  runOnce: (spec: CodexRunSpec) => Promise<CodexRunOutcome>;
  onLog: (message: string) => void;
}

async function attemptOnce({
  label,
  model,
  effort,
  schema,
  schemaPath,
  outPath,
  sandbox,
  repo,
  prompt,
  runOnce,
  onLog,
}: AttemptOnceArgs): Promise<AttemptOutcome> {
  const run = await runOnce({
    prompt,
    model,
    effort,
    schemaPath,
    outPath,
    sandbox,
    cwd: repo,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });

  if (run.timedOut) {
    onLog(`[${label}] killed at ${DEFAULT_TIMEOUT_MS} ms.`);
    return { done: false, value: null, correction: "" };
  }
  if (run.code !== 0) {
    const tail = run.stderr.split("\n").slice(-3).join(" ");
    onLog(`[${label}] codex exited ${run.code}. ${tail}`);
    return { done: false, value: null, correction: "" };
  }

  let raw = "";
  try {
    raw = readFileSync(outPath, "utf8");
  } catch {
    onLog(`[${label}] codex wrote no final message.`);
    return { done: false, value: null, correction: "" };
  }
  if (!schema) return { done: true, value: raw.trim(), correction: "" };

  try {
    const value = pruneNulls(JSON.parse(raw), schema);
    const violation = findSchemaViolation(value, schema);
    if (violation) throw new Error(violation);
    return { done: true, value, correction: "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog(`[${label}] response did not fit the schema: ${message}`);
    return { done: false, value: null, correction: schemaCorrection(message) };
  }
}

export const makeSlots = (limit: number) => {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((r) => waiting.push(r));
    active++;
    try {
      return await task();
    } finally {
      active--;
      const next = waiting.shift();
      if (next) next();
    }
  };
};

export const resolveWorkflowPath = (name: string): string => {
  const path = join(ROOT, "workflows", `${name}.js`);
  if (!existsSync(path)) throw new Error(`workflow('${name}'): no workflow with that name`);
  return path;
};

interface AgentRunConfig {
  label: string;
  model: string;
  effort: string;
  sandbox: "read-only" | "workspace-write";
  schema: JsonSchema | undefined;
  schemaPath: string;
  outPath: string;
  base: string;
}

function prepareAgentRun(
  prompt: string,
  opts: AgentOptions,
  tmp: string,
  id: number,
  onLog: (message: string) => void,
): AgentRunConfig {
  const label = opts.label || opts.agentType || "agent";
  const { preamble, readOnly, missing } = loadAgent(opts.agentType);
  if (missing) {
    onLog(`[${label}] agents/${opts.agentType}.md is missing; running with no preamble.`);
  }
  const model = (opts.model && MODEL_MAP[opts.model]) || MODEL_MAP.sonnet;
  const effort = opts.effort || DEFAULT_EFFORT;
  const sandbox = readOnly ? "read-only" : "workspace-write";
  const schemaPath = opts.schema ? join(tmp, `schema-${id}.json`) : "";
  const outPath = join(tmp, `out-${id}.json`);
  if (opts.schema) writeFileSync(schemaPath, JSON.stringify(strictify(opts.schema)));
  return {
    label,
    model,
    effort,
    sandbox,
    schema: opts.schema,
    schemaPath,
    outPath,
    base: withPreamble(preamble, prompt),
  };
}

async function runAgentAttempts(
  config: AgentRunConfig,
  repo: string,
  runOnce: (spec: CodexRunSpec) => Promise<CodexRunOutcome>,
  onLog: (message: string) => void,
): Promise<JsonValue> {
  let correction = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    onLog(
      `[${config.label}] codex ${config.model}/${config.effort} ${config.sandbox} ` +
        `(attempt ${attempt}/${ATTEMPTS})`,
    );
    const outcome = await attemptOnce({
      label: config.label,
      model: config.model,
      effort: config.effort,
      schema: config.schema,
      schemaPath: config.schemaPath,
      outPath: config.outPath,
      sandbox: config.sandbox,
      repo,
      prompt: config.base + correction,
      runOnce,
      onLog,
    });
    if (outcome.done) return outcome.value;
    correction = outcome.correction;
  }
  onLog(`[${config.label}] gave up after ${ATTEMPTS} attempts; the stage returns null.`);
  return null;
}

interface CreateStubsOptions {
  repo: string;
  concurrency?: number;
  onLog?: (message: string) => void;
  tmp: string;
  runOnce?: (spec: CodexRunSpec) => Promise<CodexRunOutcome>;
}

export function createStubs({
  repo,
  concurrency = DEFAULT_CONCURRENCY,
  onLog = () => {},
  tmp,
  runOnce = runCodexOnce,
}: CreateStubsOptions): RunWorkflowStubs {
  const withSlot = makeSlots(concurrency);
  const stubs: RunWorkflowStubs = {};
  let serial = 0;

  stubs.agent = async (prompt: string, opts: AgentOptions = {}) =>
    withSlot(async () => {
      const id = ++serial;
      const config = prepareAgentRun(prompt, opts, tmp, id, onLog);
      return runAgentAttempts(config, repo, runOnce, onLog);
    });

  stubs.workflow = async (name: string, wfArgs: JsonValue) => {
    const path = resolveWorkflowPath(name);
    onLog(`[workflow] ${name}`);
    const nested = await runWorkflow(path, {
      args: wfArgs,
      stubs,
      onLog,
      onPhase: (title) => onLog(`== ${name}: ${title}`),
    });
    return nested.result;
  };

  return stubs;
}

interface RunOnCodexArgs {
  repo: string;
  [key: string]: unknown;
}

interface RunOnCodexOptions {
  concurrency?: number;
  onLog?: (message: string) => void;
}

async function runOnCodex(
  name: string,
  args: RunOnCodexArgs,
  { concurrency, onLog = () => {} }: RunOnCodexOptions = {},
): Promise<JsonValue> {
  const path = resolveWorkflowPath(name);
  const tmp = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "codex-run-"));
  try {
    const stubs = createStubs({ repo: args.repo, concurrency, onLog, tmp });
    const { result } = await runWorkflow(path, {
      args,
      stubs,
      onLog,
      onPhase: (title) => onLog(`== ${title}`),
    });
    return result;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const mergeArgs = (target: Record<string, unknown>, source: unknown): void => {
  if (!source || typeof source !== "object") return;
  for (const key of Object.keys(source)) target[key] = (source as Record<string, unknown>)[key];
};

interface ParsedArgv {
  name: string | undefined;
  args: Record<string, unknown>;
  concurrency: number | undefined;
}

export function parseArgv(argv: string[]): ParsedArgv {
  const [name, ...rest] = argv;
  const args: Record<string, unknown> = Object.create(null);
  let concurrency: number | undefined;
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (flag === "--repo") args.repo = resolve(value);
    else if (flag === "--issue") args.issue = value;
    else if (flag === "--base") args.base = value;
    else if (flag === "--concurrency") concurrency = Number(value);
    else if (flag === "--args") mergeArgs(args, JSON.parse(value));
    else throw new Error(`unknown flag: ${flag}`);
    i++;
  }
  return { name, args, concurrency };
}

if (isMainModule(import.meta.url)) {
  const { name, args, concurrency } = parseArgv(process.argv.slice(2));
  if (!name || typeof args.repo !== "string") {
    process.stderr.write(
      "usage: node workflows/_lib/codex-run.ts <workflow> --repo <abs path> " +
        "[--issue N] [--base B] [--concurrency N] [--args <json>]\n",
    );
    process.exit(2);
  }
  const result = await runOnCodex(
    name,
    { ...args, repo: args.repo },
    {
      concurrency,
      onLog: (message) => process.stderr.write(`${message}\n`),
    },
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
