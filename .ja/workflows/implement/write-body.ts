#!/usr/bin/env node
/// <reference types="node" />
// Usage: write-body.ts <digest> <outfile> [projects-dir]
//
// implement workflow が生成した PR 本文を、agent に写させずに <outfile> へ書く。
// workflow は本文を base64 のブロックとして body agent の prompt に入れ、このスクリプトが agent の transcript から
// ブロックを読み戻す (../_lib/transcript.ts)。本文の文字は 1 つもモデルを通らない。約 10 KB の base64 を写す agent は
// 文字を取り違え、digest の照合が公開を止め続けた。
//
// <digest> は workflow が計算した本文の digest。その digest を持つ本文に復号できるブロックだけを書くので、
// 別の実行や別の本文が残したブロックを取り違えない。
// [projects-dir] の既定は $HOME/.claude/projects。
//
// stdout: 1 行の JSON。{ok: true, transcript} か {ok: false, reason}
// exit 0 は本文を書いたとき。それ以外は exit 1 で、何も書かない。一致するブロックを持つ transcript が無いか、
// 走査そのものが失敗したとき。そこに transcript を残さない host (Codex の runner) では常に exit 1 になり、
// workflow は agent にブロックを写させる。
import { writeFileSync } from "node:fs";
import { isMainModule } from "../_lib/entry-point.ts";
import { defaultProjects, digest, recentPrompts } from "../_lib/transcript.ts";

// 読み戻しの prompt が持つ形のブロックと、写しの prompt の heredoc が持つ形のブロック。
const BLOCK = /(?:PR_BODY_B64_BEGIN|<<'PR_BODY_B64')\n([\s\S]*?)\n\s*PR_BODY_B64(?:_END)?/g;

const bodyIn = (prompt: string, wanted: string): string | null => {
  for (const [, block] of prompt.matchAll(BLOCK)) {
    // harness は計算された prompt の全行を字下げするので、空白は何も運ばない。
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
