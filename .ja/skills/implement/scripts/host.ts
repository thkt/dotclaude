#!/usr/bin/env node
/// <reference types="node" />
// Usage: host.ts probe --repo <abs path> <command>...
//        host.ts run <workflow> --repo <abs path> [--args-file <file>] [--state <file>]
//
// /implement は implement workflow を host (workflows/_lib/claude-run.ts) で起動する。host は中継のコマンドを
// 自分で実行し、考える必要のある呼び出しにだけ claude -p の子 session を始める (DR-0127)。これは、その起動の
// 2 つの手順で skill が実行するコマンドである。
//
// probe  子 session 1 つに、利用者の permission の規則の下でコマンドを実行させる。テストを実行できない session が
//        何分も実装してしまう前に確かめる。
//        stdout: JSON { ran, denied, why }。exit: 0
// run    workflow を実行する。stdout: 戻り値の JSON。stderr の最後の行 `claude-run: {...}` が、再開に使う state
//        ファイルと、結果を持つファイルを名乗る。
//        exit: script が値を返したら 0 (停止を含む)。script が throw したら 1。読めない呼び出しは 2。
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
