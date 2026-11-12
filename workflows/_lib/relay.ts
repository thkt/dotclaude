/// <reference types="node" />
// Usage: relay.ts <digest> [--spec <file>] [--projects <dir>]
//        relay.ts <digest> --replay
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
//                 tail:N      the last N lines of stdout and stderr together
//                 fail_tail:N the same when the exit code is not 0, else an empty string
//   append      list field <- source appended
// A field whose name starts with `_` steers later steps through `when` and is not printed.
//
// stdout, one line of JSON:
//   {...fields, relay_check}    every step ran. relay_check is the digest of the fields, so the
//                               script can tell when the agent changed a character returning them
//   {"relay_continue": true}    the next step may not fit in this call. Run the same command again
//   {"relay_error": "..."}      no spec with that digest was found, or the file's digest differs
// exit 0, or 1 on relay_error.
//
// --replay prints the line the last complete run of that spec printed, and runs nothing. A script asks for
// it when the fields an agent returned do not carry relay_check: the copy went wrong, not the commands.
import { spawnSync } from "node:child_process";
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
// step that could run past that, so the call always prints its line before the tool kills it.
// The variable exists for the test, which cannot wait nine minutes.
const CALL_BUDGET_MS = Number(process.env.RELAY_CALL_BUDGET_MS) || 540_000;
// A state file left by a call that died is not picked up by a later run of the same spec.
const STATE_MAX_AGE_MS = 15 * 60 * 1000;
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

const publicFields = (fields: Fields): Fields =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !key.startsWith("_")));

const lastLines = (text: string, count: number): string =>
  text.replace(/\n+$/, "").split("\n").slice(-count).join("\n");

const runStep = (step: Step): ((source: string) => Value) => {
  const result = spawnSync("/bin/sh", ["-c", step.sh], {
    cwd: step.cwd,
    input: step.stdin,
    timeout: step.timeout_ms ?? STEP_TIMEOUT_MS,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const timedOut = (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT";
  const exit = timedOut || result.status === null ? -1 : result.status;
  const stdout = result.stdout ?? "";
  const combined = `${stdout}${result.stderr ?? ""}`;
  return (source) => {
    if (source === "exit") return exit;
    if (source === "ok") return exit === 0;
    if (source === "timed_out") return timedOut;
    if (source === "out") return stdout.replace(/\n$/, "");
    if (source === "last") return lastLines(stdout, 1);
    const tail = /^(fail_)?tail:(\d+)$/.exec(source);
    if (!tail) throw new Error(`unknown source "${source}"`);
    return tail[1] && exit === 0 ? "" : lastLines(combined, Number(tail[2]));
  };
};

const holds = (when: Fields | undefined, fields: Fields): boolean =>
  !when || Object.entries(when).every(([key, value]) => fields[key] === value);

// Runs the steps from `from` and returns the fields, or the index of the step it stopped before
// when `fits` says that step may not fit in the caller's budget.
export const runSpec = (
  spec: Spec,
  from = 0,
  seed: Fields = { ...spec.defaults },
  fits: (step: Step, index: number) => boolean = () => true,
): { fields: Fields; next: number } => {
  const fields = { ...seed };
  for (let index = from; index < spec.steps.length; index += 1) {
    const step = spec.steps[index];
    if (!holds(step.when, fields)) continue;
    if (!fits(step, index)) return { fields, next: index };
    const pick = runStep(step);
    for (const [field, source] of Object.entries(step.set ?? {})) fields[field] = pick(source);
    for (const [field, source] of Object.entries(step.append ?? {}))
      fields[field] = [...((fields[field] as number[] | undefined) ?? []), pick(source) as number];
  }
  return { fields, next: spec.steps.length };
};

const readSpec = (text: string, wanted: string): Spec | null =>
  digest(text) === wanted ? (JSON.parse(text) as Spec) : null;

const specInTranscript = (projects: string, wanted: string): Spec | null => {
  for (const { text } of recentPrompts(projects, "RELAY_SPEC")) {
    for (const [, named, json] of text.matchAll(BLOCK)) {
      if (named !== wanted) continue;
      const spec = readSpec(json, wanted);
      if (spec) return spec;
    }
  }
  return null;
};

const flag = (argv: string[], name: string): string | undefined => {
  const at = argv.indexOf(name);
  return at < 0 ? undefined : argv[at + 1];
};

function main(argv: string[]): number {
  const print = (value: object) => process.stdout.write(`${JSON.stringify(value)}\n`);
  const wanted = argv[0] ?? "";
  if (!/^[0-9a-f]{8}:\d+$/.test(wanted)) {
    print({ relay_error: "usage: relay.ts <digest> [--spec <file>] [--projects <dir>]" });
    return 1;
  }
  const keptPath = join(tmpdir(), `relay-${wanted.replace(":", "-")}.out.json`);
  if (argv.includes("--replay")) {
    const kept = existsSync(keptPath) && Date.now() - statSync(keptPath).mtimeMs <= STATE_MAX_AGE_MS;
    if (!kept) {
      print({ relay_error: `no result of ${wanted} is kept` });
      return 1;
    }
    process.stdout.write(readFileSync(keptPath, "utf8"));
    return 0;
  }
  const specFile = flag(argv, "--spec");
  let spec: Spec | null;
  try {
    spec = specFile
      ? readSpec(readFileSync(specFile, "utf8"), wanted)
      : specInTranscript(flag(argv, "--projects") ?? defaultProjects(), wanted);
  } catch (error) {
    print({ relay_error: `the spec could not be read: ${String(error)}` });
    return 1;
  }
  if (!spec) {
    print({
      relay_error: specFile
        ? `the spec in ${specFile} does not have the digest ${wanted}`
        : `no recent agent transcript opens with a spec of digest ${wanted}`,
    });
    return 1;
  }

  const statePath = join(tmpdir(), `relay-${wanted.replace(":", "-")}.json`);
  const fresh =
    existsSync(statePath) && Date.now() - statSync(statePath).mtimeMs <= STATE_MAX_AGE_MS;
  const state = fresh
    ? (JSON.parse(readFileSync(statePath, "utf8")) as { next: number; fields: Fields })
    : { next: 0, fields: { ...spec.defaults } };
  const started = Date.now();
  // The first step of a call always runs, so a single step longer than the budget still makes progress.
  const fits = (step: Step, index: number) =>
    index === state.next ||
    Date.now() - started + (step.timeout_ms ?? STEP_TIMEOUT_MS) <= CALL_BUDGET_MS;
  const { fields, next } = runSpec(spec, state.next, state.fields, fits);
  if (next < spec.steps.length) {
    writeFileSync(statePath, JSON.stringify({ next, fields }));
    print({ relay_continue: true });
    return 0;
  }
  rmSync(statePath, { force: true });
  const shown = publicFields(fields);
  const line = `${JSON.stringify({ ...shown, relay_check: digest(canonical(shown)) })}\n`;
  // The line is kept so that a reply the agent miscopied can be asked for again without running the steps.
  writeFileSync(keptPath, line);
  process.stdout.write(line);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
