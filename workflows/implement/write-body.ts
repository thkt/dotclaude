#!/usr/bin/env node
/// <reference types="node" />
// Usage: write-body.ts <digest> <outfile> [projects-dir]
//
// Writes the PR body the implement workflow generated to <outfile> without an agent copying it.
// The workflow puts the body into its body agent's prompt as a base64 block, and this reads the
// block back from the agent's transcript (see ../_lib/transcript.ts), so no character of the body
// passes through the model. An agent copying about 10 KB of base64 changes a character often
// enough that the digest check kept stopping the publication.
//
// <digest> is the workflow's digest of the body. Only a block that decodes to a body with that
// digest is written, so a block left by another run or for another body is never taken.
// [projects-dir] defaults to $HOME/.claude/projects.
//
// stdout: one line of JSON. {ok: true, transcript} or {ok: false, reason}
// exit 0 when the body was written. exit 1 otherwise, with nothing written: no transcript holds a
// matching block, or the scan itself failed. A host that keeps no transcript there (the Codex
// runner) always exits 1, and the workflow then has an agent copy the block.
import { writeFileSync } from "node:fs";
import { isMainModule } from "../_lib/entry-point.ts";
import { defaultProjects, digest, recentPrompts } from "../_lib/transcript.ts";

// The block as the read-back prompt carries it, and as the copy prompt's heredoc carries it.
const BLOCK = /(?:PR_BODY_B64_BEGIN|<<'PR_BODY_B64')\n([\s\S]*?)\n\s*PR_BODY_B64(?:_END)?/g;

const bodyIn = (prompt: string, wanted: string): string | null => {
  for (const [, block] of prompt.matchAll(BLOCK)) {
    // The harness indents every line of a computed prompt, so whitespace carries nothing.
    const body = Buffer.from(block.replace(/\s+/g, ""), "base64").toString("utf8");
    if (digest(body) === wanted) return body;
  }
  return null;
};

function main(argv: string[]): number {
  const [wanted, outfile, projects = defaultProjects()] = argv;
  const report = (value: object) => process.stdout.write(`${JSON.stringify(value)}\n`);
  if (!wanted || !outfile) {
    report({ ok: false, reason: "usage: write-body.ts <digest> <outfile> [projects-dir]" });
    return 1;
  }
  try {
    for (const { transcript, text } of recentPrompts(projects, "PR_BODY_B64")) {
      const body = bodyIn(text, wanted);
      if (body === null) continue;
      writeFileSync(outfile, body);
      report({ ok: true, transcript });
      return 0;
    }
  } catch (error) {
    report({ ok: false, reason: `the scan of ${projects} failed: ${String(error)}` });
    return 1;
  }
  report({
    ok: false,
    reason: `no recent agent transcript under ${projects} opens with a body of digest ${wanted}`,
  });
  return 1;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
