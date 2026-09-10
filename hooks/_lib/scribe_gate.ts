/// <reference types="node" />
// The .ts side of hooks/_lib/scribe_gate.py
// (docs/decisions/0116-place-the-scribe-gate-outside-the-hooks-shebang-rule.md keeps it in
// hooks/_lib/, next to scribe_trigger.py/.ts, rather than skills/scribe/scripts/). No shebang and
// no exec bit: the DR's `gate` step in .github/workflows/scribe.yml calls this with an explicit
// interpreter (`node hooks/_lib/scribe_gate.ts`), the same shape `python3 hooks/_lib/
// scribe_gate.py` has today, so hooks/_lib/tests/shebang-ts.test.ts's T-013 (no shebang line
// under hooks/_lib/*.ts) applies to this file without exception.
//
// should_run's gh-shaped decision (which PRs/issues count, in which order) is
// scribe_trigger.py's _unmerged_scribe_pr_exists / _last_scribe_merge / _has_new_input, not
// scribe_gate.py's own. scribe_trigger.ts is not part of this unit (out of scope per DR-0116's
// Migration Strategy, a later slice), so the three helpers are ported here, unexported, scoped
// to what should_run needs -- the same values scribe_gate.py's should_run gets by importing
// scribe_trigger, not a reimplementation of scribe_trigger.py's own public surface
// (should_prompt, the cooldown stamp). Contract: hooks/_lib/scribe_gate.py's should_run and its
// GITHUB_OUTPUT-writing CLI, exercised the way hooks/_lib/tests/scribe_gate_test.py exercises
// them. Ported by hooks/_lib/tests/scribe-gate.test.ts.
import { appendFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { isMainModule } from "../../workflows/_lib/entry-point.ts";

/** A gh invocation, injected so tests hand over canned stdout instead of a live gh process.
 * Mirrors scribe_gate.py's GhRunner (Callable[[Sequence[str]], str]). */
export type GhRunner = (args: readonly string[]) => string;

export interface ShouldRunOptions {
  runner?: GhRunner;
  gh?: string;
}

// A hook/CI process starts with PATH cut down, so a bare `gh` can miss. Mirrors
// scribe_trigger.py's DEFAULT_GH.
const DEFAULT_GH = "/opt/homebrew/bin/gh";

/** Runs `gh` for real and returns its stdout, throwing on a non-zero exit or a spawn failure --
 * mirrors scribe_trigger.py's _default_runner (subprocess.run(..., check=True)). */
function defaultRunner(gh: string): GhRunner {
  return (args) => {
    const result = spawnSync(gh, args, { encoding: "utf-8" });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`${gh} ${args.join(" ")} exited ${result.status}: ${result.stderr}`);
    }
    return result.stdout;
  };
}

/** scribe_trigger.py's _unmerged_scribe_pr_exists: an open scribe PR already covers the
 * backlog, so a second run would only invite a collision with it. */
function unmergedScribePrExists(call: GhRunner): boolean {
  const output = call(["pr", "list", "--label", "scribe", "--state", "open", "--json", "number"]);
  return (JSON.parse(output) as unknown[]).length > 0;
}

/** scribe_trigger.py's _last_scribe_merge: the mergedAt of the last merged scribe PR, empty
 * when none has ever merged. `-q` hands back the bare value, not a JSON-quoted string. */
function lastScribeMerge(call: GhRunner): string {
  return call([
    "pr",
    "list",
    "--label",
    "scribe",
    "--state",
    "merged",
    "--limit",
    "1",
    "--json",
    "mergedAt",
    "-q",
    ".[0].mergedAt",
  ]).trim();
}

/** scribe_trigger.py's _has_new_input: returns on the first kind that has anything, so a
 * backlog carrying merged PRs costs one gh call rather than two. */
function hasNewInput(cursor: string, call: GhRunner): boolean {
  const search = cursor ? `-label:scribe merged:>${cursor}` : "-label:scribe";
  const prs = ["pr", "list", "--state", "merged", "--search", search, "--json", "number"];
  if ((JSON.parse(call(prs)) as unknown[]).length >= 1) {
    return true;
  }
  const issues = ["issue", "list", "--state", "closed", "--json", "number"];
  if (cursor) {
    issues.push("--search", `closed:>${cursor}`);
  }
  return (JSON.parse(call(issues)) as unknown[]).length >= 1;
}

/** Whether scribe has anything new to read, decided the way scribe_gate.py's should_run decides
 * it. */
export function shouldRun(options: ShouldRunOptions = {}): boolean {
  const binary = options.gh || process.env.CLAUDE_GH_BIN || DEFAULT_GH;
  const call = options.runner || defaultRunner(binary);
  try {
    if (unmergedScribePrExists(call)) {
      return false;
    }
    if (!hasNewInput(lastScribeMerge(call), call)) {
      return false;
    }
  } catch {
    // None of a failed gh call, a non-JSON response, or a spawn error say a backlog is
    // waiting, and rethrowing here would turn a plain CI run into a failed job over a
    // transient gh problem -- mirrors scribe_gate.py's except (OSError,
    // subprocess.CalledProcessError, json.JSONDecodeError).
    return false;
  }
  return true;
}

async function main(): Promise<number> {
  const result = shouldRun();
  const line = `should_run=${result ? "true" : "false"}\n`;
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    await appendFile(outputPath, line, "utf-8");
  } else {
    process.stdout.write(line);
  }
  return 0;
}

if (isMainModule(import.meta.url)) {
  main().then((code) => process.exit(code));
}
