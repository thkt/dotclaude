#!/usr/bin/env node
/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { isMainModule } from "../_lib/entry-point.ts";
import { defaultProjects, digest, recentPrompts } from "../_lib/transcript.ts";

const BLOCK = /(?:PR_BODY_B64_BEGIN|<<'PR_BODY_B64')\n([\s\S]*?)\n\s*PR_BODY_B64(?:_END)?/g;

const bodyIn = (prompt: string, wanted: string): string | null => {
  for (const [, block] of prompt.matchAll(BLOCK)) {
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
