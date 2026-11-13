/// <reference types="node" />
// Usage: relay.ts <digest> [--spec <file>] [--projects <dir>]
//        relay.ts <digest> --replay <relay_check>
//
// Runs the commands a workflow script wants run, and prints their results as one line of JSON.
// The script declares them as data (a spec) and puts the spec into a relay agent's prompt between
// `RELAY_SPEC <digest>` and `RELAY_SPEC_END`. The agent runs this command with the digest, and this
// reads the spec back from the agent's transcript. The agent copies no command, and a host that
// evaluates the script itself calls runSpec directly with no agent at all.
//
// A spec is {defaults, steps}. defaults gives every result field its value when no step sets it.
// A step is {sh, cwd?, stdin?, timeout_ms?, when?, set?, append?}:
//   sh          one /bin/sh -c line
//   when        run the step only when every named field equals the given value
//   set         field <- source, where a source is one of
//                 exit        the exit code, or -1 when the command could not start or timed out
//                 ok          whether the exit code is 0
//                 out         stdout without its final newline
//                 last        the last non-empty line of stdout
//                 timed_out   whether the command ran past timeout_ms
//                 tail:N      the last N lines of stdout and stderr as they arrived
//                 fail_tail:N the same when the exit code is not 0, else an empty string
//   append      list field <- source appended
// A field whose name starts with `_` steers later steps through `when` and is not printed.
//
// stdout, one line of JSON:
//   {...fields, relay_check}    every step ran. relay_check is the digest of the fields, so the
//                               script can tell when the agent changed a character returning them
//   {"relay_continue": true}    the next step may not fit in this call. Run the same command again
//   {"relay_missing": "..."}    no spec with that digest was found, or the file's digest differs. No
//                               step ran, and the agent hands the spec over in a file
//   {"relay_error": "..."}      the line is longer than a Bash call returns, or the run itself failed.
//                               Steps may have run, so the agent does not run the spec again
// exit 0, or 1 on relay_missing and relay_error.
//
// A call belongs to the agent whose transcript carried the spec. That agent running the command
// again goes on from where its last call stopped, or gets the same line once every step has run,
// so a step never runs twice for one agent. Another agent with the same spec starts from the first
// step. --replay prints the line of the last call that ran every step of that spec, and runs
// nothing: a script asks for it when the fields an agent returned do not carry relay_check. It
// names the relay_check that agent returned, and a kept line carrying another check is refused. A
// call that starts removes the kept line first.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "./entry-point.ts";
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
// The agent runs this with the Bash tool's timeout at its 600 s ceiling. A call stops before a
// step that could run past the budget, so the call always prints its line before the tool kills it.
// The variable exists for the test, which cannot wait ten minutes.
const CALL_BUDGET_MS = Number(process.env.RELAY_CALL_BUDGET_MS) || 590_000;
// A file left by a call that died is not picked up by a later one.
const STATE_MAX_AGE_MS = 15 * 60 * 1000;
// A Bash call returns about 30,000 characters. A longer line reaches the agent cut short.
const MAX_LINE = 28_000;
const BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n\s*(\S.*)\n\s*RELAY_SPEC_END/g;

// Keys sorted, so the digest does not depend on the order an agent returns the fields in.
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
// A tail is cut by characters too. Eighty lines of a minified error or a progress bar drawn with carriage returns
// are longer than a Bash call returns, and a failing check has to reach the repair with its tail.
const TAIL_MAX_CHARS = 6000;
const tailOf = (text: string, count: number): string => lastLines(text, count).slice(-TAIL_MAX_CHARS);

interface Ran {
  exit: number;
  timedOut: boolean;
  stdout: string;
  // stdout and stderr in the order their chunks arrived.
  combined: string;
}

// The command runs in its own process group. A timeout ends the whole group, so a compound
// command leaves no child writing into the worktree after the step is reported.
// A step runs in its own process group, so a signal sent to this process does not reach it. The group of the
// running step is ended first, and nothing keeps writing into the worktree after this process is gone.
let runningGroup = 0;
const endRunningGroup = () => {
  try {
    if (runningGroup) process.kill(-runningGroup, "SIGTERM");
  } catch {
    // already gone
  }
};
const endGroupOnSignal = () => {
  for (const name of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
    process.on(name, () => {
      endRunningGroup();
      process.exit(143);
    });
  }
};

const runStep = (step: Step): Promise<Ran> =>
  new Promise((resolve) => {
    const child = spawn("/bin/sh", ["-c", step.sh], { cwd: step.cwd, detached: true });
    runningGroup = child.pid ?? 0;
    const ran: Ran = { exit: -1, timedOut: false, stdout: "", combined: "" };
    const signal = (name: NodeJS.Signals) => {
      try {
        if (child.pid) process.kill(-child.pid, name);
      } catch {
        // The group is already gone.
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
      runningGroup = 0;
      resolve(ran);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      runningGroup = 0;
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

// Runs the steps from `from` and returns the fields, or the index of the step it stopped before
// when `fits` says that step may not fit in the caller's budget. `ran` is called after each step
// with the index of the next one, so a caller can keep how far the steps got.
export const runSpec = async (
  spec: Spec,
  from = 0,
  seed: Fields = { ...spec.defaults },
  fits: (step: Step, index: number) => boolean = () => true,
  ran: (next: number, fields: Fields) => void = () => {},
): Promise<{ fields: Fields; next: number }> => {
  const fields = { ...seed };
  for (let index = from; index < spec.steps.length; index += 1) {
    const step = spec.steps[index];
    if (!holds(step.when, fields)) continue;
    if (!fits(step, index)) return { fields, next: index };
    const result = await runStep(step);
    for (const [field, source] of Object.entries(step.set ?? {})) fields[field] = pick(result, source);
    for (const [field, source] of Object.entries(step.append ?? {}))
      fields[field] = [...((fields[field] as number[] | undefined) ?? []), pick(result, source) as number];
    ran(index + 1, fields);
  }
  return { fields, next: spec.steps.length };
};

const readSpec = (text: string, wanted: string): Spec | null =>
  digest(text) === wanted ? (JSON.parse(text) as Spec) : null;

// The spec and the caller it belongs to: the transcript that carried it.
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
// The step ran, so a file that cannot be written must not cost its result.
const keep = (path: string, text: string): boolean => {
  try {
    writeFileSync(path, text);
    return true;
  } catch {
    return false;
  }
};

// The spec and the caller it belongs to, or why none was found. A spec handed over in a file belongs to the
// agent that wrote that file.
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

// One call of one caller: goes on from where that caller's last call stopped, and returns the line to print.
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
  // The first step of a call always runs, so a single step longer than the budget still makes progress. When
  // the state could not be saved, the call runs on: stopping would lose the steps that ran.
  const fits = (step: Step, index: number) =>
    index === state.next ||
    !saved ||
    Date.now() - started + (step.timeout_ms ?? STEP_TIMEOUT_MS) <= CALL_BUDGET_MS;
  let from = state.next;
  let fields = state.fields;
  while (from < spec.steps.length) {
  // Kept after every step. A call that is ended in the middle of a step goes on from that step, and the steps
  // before it are not run a second time.
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
  // The steps ran. The same caller running the command again gets this line and runs nothing a second time.
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
    // The line is returned only to the agent that saw it: the check it names is the one this line carries. A line
    // another call of the same spec left is refused.
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
