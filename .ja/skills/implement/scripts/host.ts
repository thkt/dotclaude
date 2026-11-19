#!/usr/bin/env node
/// <reference types="node" />
// why-not: /// <reference> 行は日本語のないコメントと数えられ、"no .ja file in this checkout lost its Japanese" が落ちる
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";
import { main, probeChild } from "../../../workflows/_lib/claude-run.ts";

const USAGE =
  "usage: host.ts probe --repo <abs path> <command>...\n" +
  "       host.ts run <workflow> --repo <abs path> [--args-file <file>] [--state <file>]\n";

export async function host(argv: string[]): Promise<number> {
  const [mode, ...rest] = argv;
  if (mode === "run") return main(rest);
  if (mode === "probe" && rest[0] === "--repo" && rest.length > 2) {
    console.log(JSON.stringify(await probeChild(rest[1], rest.slice(2))));
    return 0;
  }
  process.stderr.write(USAGE);
  return 2;
}

if (isMainModule(import.meta.url)) process.exit(await host(process.argv.slice(2)));
