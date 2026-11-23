/// <reference types="node" />
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../../skills/_lib/entry-point.ts";
import { defaultProjects, digest, recentPrompts } from "./transcript.ts";

type Value = string | number | boolean | number[];
type Fields = Record<string, Value>;
interface Step {
  sh: string;
  cwd?: string;
  stdin?: string;
  timeout_ms?: number;
  when?: Fields;
  set?: Record<string, string>;
  append?: Record<string, string>;
}
export interface Spec {
  defaults: Fields;
  steps: Step[];
}

const STEP_TIMEOUT_MS = 100_000;
const CALL_BUDGET_MS = Number(process.env.RELAY_CALL_BUDGET_MS) || 590_000;
const STATE_MAX_AGE_MS = 15 * 60 * 1000;
const MAX_LINE = 28_000;
const BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n\s*(\S[^\n]*)\n\s*RELAY_SPEC_END/g;

export const canonical = (fields: Record<string, unknown>): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(fields)
        .sort()
        .map((key) => [key, fields[key]]),
    ),
  );

export const publicFields = (fields: Fields): Fields =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !key.startsWith("_")));

const lastLines = (text: string, count: number): string =>
  text.replace(/\n+$/, "").split("\n").slice(-count).join("\n");
const TAIL_MAX_CHARS = 6000;
const tailOf = (text: string, count: number): string => lastLines(text, count).slice(-TAIL_MAX_CHARS);

interface Ran {
  exit: number;
  timedOut: boolean;
  stdout: string;
  combined: string;
}

const runningGroups = new Set<number>();
export const endRunningGroups = () => {
  for (const group of runningGroups) {
    try {
      process.kill(-group, "SIGTERM");
    } catch {
    }
  }
};
const endGroupOnSignal = () => {
  for (const name of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
    process.on(name, () => {
      endRunningGroups();
      process.exit(143);
    });
  }
};

const runStep = (step: Step, env: Record<string, string>): Promise<Ran> =>
  new Promise((resolve) => {
    const child = spawn("/bin/sh", ["-c", step.sh], {
      cwd: step.cwd,
      detached: true,
      env: { ...process.env, ...env },
    });
    const group = child.pid ?? 0;
    if (group) runningGroups.add(group);
    const ran: Ran = { exit: -1, timedOut: false, stdout: "", combined: "" };
    const signal = (name: NodeJS.Signals) => {
      try {
        if (child.pid) process.kill(-child.pid, name);
      } catch {
      }
    };
    const timer = setTimeout(() => {
      ran.timedOut = true;
      signal("SIGTERM");
      setTimeout(() => signal("SIGKILL"), 2000).unref();
    }, step.timeout_ms ?? STEP_TIMEOUT_MS);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      ran.stdout += chunk;
      ran.combined += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      ran.combined += chunk;
    });
    child.stdin.on("error", () => {});
    child.stdin.end(step.stdin ?? "");
    child.on("error", () => {
      clearTimeout(timer);
      runningGroups.delete(group);
      resolve(ran);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      runningGroups.delete(group);
      resolve({ ...ran, exit: ran.timedOut || code === null ? -1 : code });
    });
  });

const pick = (ran: Ran, source: string): Value => {
  if (source === "exit") return ran.exit;
  if (source === "ok") return ran.exit === 0;
  if (source === "timed_out") return ran.timedOut;
  if (source === "out") return ran.stdout.replace(/\n$/, "");
  if (source === "last") return lastLines(ran.stdout, 1);
  const tail = /^(fail_)?tail:(\d+)$/.exec(source);
  if (!tail) throw new Error(`unknown source "${source}"`);
  return tail[1] && ran.exit === 0 ? "" : tailOf(ran.combined, Number(tail[2]));
};

const holds = (when: Fields | undefined, fields: Fields): boolean =>
  !when || Object.entries(when).every(([key, value]) => fields[key] === value);

export const runSpec = async (
  spec: Spec,
  from = 0,
  seed: Fields = { ...spec.defaults },
  fits: (step: Step, index: number) => boolean = () => true,
  ran: (next: number, fields: Fields) => void = () => {},
  env: Record<string, string> = {},
): Promise<{ fields: Fields; next: number }> => {
  const fields = { ...seed };
  for (let index = from; index < spec.steps.length; index += 1) {
    const step = spec.steps[index];
    if (!holds(step.when, fields)) continue;
    if (!fits(step, index)) return { fields, next: index };
    const result = await runStep(step, env);
    for (const [field, source] of Object.entries(step.set ?? {})) fields[field] = pick(result, source);
    for (const [field, source] of Object.entries(step.append ?? {}))
      fields[field] = [...((fields[field] as number[] | undefined) ?? []), pick(result, source) as number];
    ran(index + 1, fields);
  }
  return { fields, next: spec.steps.length };
};

const readSpec = (text: string, wanted: string): Spec | null =>
  digest(text) === wanted ? (JSON.parse(text) as Spec) : null;

const specInTranscript = (
  projects: string,
  wanted: string,
): { spec: Spec; caller: string } | null => {
  for (const { transcript, text } of recentPrompts(projects, "RELAY_SPEC")) {
    for (const [, named, json] of text.matchAll(BLOCK)) {
      if (named !== wanted) continue;
      const spec = readSpec(json, wanted);
      if (spec) return { spec, caller: transcript };
    }
  }
  return null;
};

const flag = (argv: string[], name: string): string | undefined => {
  const at = argv.indexOf(name);
  return at < 0 ? undefined : argv[at + 1];
};

type State = { next: number; fields: Fields } | { done: string; code?: number };
const fresh = (path: string): boolean =>
  existsSync(path) && Date.now() - statSync(path).mtimeMs <= STATE_MAX_AGE_MS;
const keep = (path: string, text: string): boolean => {
  try {
    writeFileSync(path, text);
    return true;
  } catch {
    return false;
  }
};

const findSpec = (argv: string[], wanted: string): { spec: Spec; caller: string } | string => {
  const specFile = flag(argv, "--spec");
  if (!specFile) {
    return (
      specInTranscript(flag(argv, "--projects") ?? defaultProjects(), wanted) ??
      `no recent agent transcript opens with a spec of digest ${wanted}`
    );
  }
  if (!existsSync(specFile)) return `the spec file ${specFile} cannot be read`;
  const spec = readSpec(readFileSync(specFile, "utf8"), wanted);
  return spec
    ? { spec, caller: `${specFile}@${statSync(specFile).mtimeMs}` }
    : `the spec in ${specFile} does not have the digest ${wanted}`;
};

const runCall = async (
  spec: Spec,
  statePath: string,
  keptPath: string,
): Promise<{ line: string; code: number }> => {
  const state: State = fresh(statePath)
    ? (JSON.parse(readFileSync(statePath, "utf8")) as State)
    : { next: 0, fields: { ...spec.defaults } };
  if ("done" in state) return { line: state.done, code: state.code ?? 0 };
  if (state.next === 0) rmSync(keptPath, { force: true });

  const started = Date.now();
  let saved = true;
  const fits = (step: Step, index: number) =>
    index === state.next ||
    !saved ||
    Date.now() - started + (step.timeout_ms ?? STEP_TIMEOUT_MS) <= CALL_BUDGET_MS;
  let from = state.next;
  let fields = state.fields;
  while (from < spec.steps.length) {
    const ran = await runSpec(spec, from, fields, fits, (next, reached) => {
      keep(statePath, JSON.stringify({ next, fields: reached }));
    });
    ({ fields } = ran);
    from = ran.next;
    if (from >= spec.steps.length) break;
    saved = keep(statePath, JSON.stringify({ next: from, fields }));
    if (saved) return { line: `${JSON.stringify({ relay_continue: true })}\n`, code: 0 };
  }

  const shown = publicFields(fields);
  const line = `${JSON.stringify({ ...shown, relay_check: digest(canonical(shown)) })}\n`;
  if (line.length > MAX_LINE) {
    const relay_error = `the result is ${line.length} characters, more than a Bash call returns. A field has to be bounded by its command`;
    const refused = `${JSON.stringify({ relay_error })}\n`;
    keep(statePath, JSON.stringify({ done: refused, code: 1 }));
    return { line: refused, code: 1 };
  }
  keep(statePath, JSON.stringify({ done: line }));
  keep(keptPath, line);
  return { line, code: 0 };
};

async function main(argv: string[]): Promise<number> {
  const fail = (relay_error: string) => {
    process.stdout.write(`${JSON.stringify({ relay_error })}\n`);
    return 1;
  };
  const wanted = argv[0] ?? "";
  if (!/^[0-9a-f]{8}:\d+$/.test(wanted)) {
    return fail("usage: relay.ts <digest> [--spec <file>] [--projects <dir>]");
  }
  const name = wanted.replace(":", "-");
  const keptPath = join(tmpdir(), `relay-${name}.out.json`);
  if (argv.includes("--replay")) {
    if (!fresh(keptPath)) return fail(`no result of ${wanted} is kept`);
    const kept = readFileSync(keptPath, "utf8");
    const check = flag(argv, "--replay");
    if ((JSON.parse(kept) as { relay_check?: string }).relay_check !== check)
      return fail(`the kept result of ${wanted} does not carry the check ${String(check)}`);
    process.stdout.write(kept);
    return 0;
  }
  const found = findSpec(argv, wanted);
  if (typeof found === "string") {
    process.stdout.write(`${JSON.stringify({ relay_missing: found })}\n`);
    return 1;
  }
  const statePath = join(tmpdir(), `relay-${name}-${digest(found.caller).replace(":", "-")}.json`);
  const { line, code } = await runCall(found.spec, statePath, keptPath);
  process.stdout.write(line);
  return code;
}

if (isMainModule(import.meta.url)) {
  endGroupOnSignal();
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      process.stdout.write(`${JSON.stringify({ relay_error: `the run failed: ${String(error)}` })}\n`);
      process.exit(1);
    },
  );
}
