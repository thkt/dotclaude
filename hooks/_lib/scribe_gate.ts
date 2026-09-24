/// <reference types="node" />
// The TypeScript port of the retired Python scribe gate
// (docs/decisions/0116-place-the-scribe-gate-outside-the-hooks-shebang-rule.md keeps it in
// hooks/_lib/, next to scribe_trigger.ts, rather than skills/scribe/scripts/; the retired
// original's history lives in that DR and in git log, per docs/wiki/retire-rename-procedure.md).
// No shebang and no exec bit: the DR's `gate` step in .github/workflows/scribe.yml calls this
// with an explicit interpreter (`node hooks/_lib/scribe_gate.ts`), the same shape the retired
// original had (`python3 ...` with an explicit interpreter), so hooks/_lib/tests/
// shebang-ts.test.ts's T-013 (no shebang line under hooks/_lib/*.ts) applies to this file without
// exception.
//
// should_run's gh-shaped decision (which PRs/issues count, in which order) is scribe_trigger.ts's
// unmergedScribePrExists / lastScribeMerge / hasNewInput, imported in process the way the
// retired Python original imported scribe_trigger (DR-0116), not a decision this file makes on
// its own. Contract: should_run's decision and its
// GITHUB_OUTPUT-writing CLI, the behavior hooks/_lib/tests/scribe-gate.test.ts pins.
import { appendFile } from "node:fs/promises";
import { isMainModule } from "../../workflows/_lib/entry-point.ts";
import {
  DEFAULT_GH,
  defaultRunner,
  type GhRunner,
  hasNewInput,
  lastScribeMerge,
  unmergedScribePrExists,
} from "./scribe_trigger.ts";


export interface ShouldRunOptions {
  runner?: GhRunner;
  gh?: string;
}

/** Whether scribe has anything new to read: no open scribe PR is already covering the backlog,
 * and a merged PR or closed issue has landed since the last scribe merge. */
export function shouldRun(options: ShouldRunOptions = {}): boolean {
  const binary = options.gh || process.env.CLAUDE_GH_BIN || DEFAULT_GH;
  const call = options.runner || defaultRunner(process.cwd(), binary);
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
    // transient gh problem.
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
