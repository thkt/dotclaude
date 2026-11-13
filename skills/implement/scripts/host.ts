#!/usr/bin/env node
/// <reference types="node" />
// Usage: host.ts probe --repo <abs path> <command>...
//        host.ts run <workflow> --repo <abs path> [--args-file <file>] [--state <file>]
//
// /implement launches the implement workflow on the host (workflows/_lib/claude-run.ts), which runs
// each relay's commands itself and starts a claude -p child session only for the calls that think
// (DR-0127). This is the command the skill runs for both steps of that launch.
//
// probe  Asks one child session to run the commands under the user's permission rules, before a
//        run spends minutes implementing in a session that cannot run a test.
//        stdout: JSON { ran, denied, why }. exit: 0
// run    Runs the workflow. stdout: its return value as JSON. The last line on stderr,
//        `claude-run: {...}`, names the state file to resume with and the file holding the result.
//        exit: 0 when the script returned, a stop included. 1 when it threw. 2 for a call it cannot read.
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
