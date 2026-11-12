#!/usr/bin/env node
/// <reference types="node" />
// Usage: sandbox_probe.ts
//
// このコマンドが走るセッションの sandbox を観測する。/implement は設定ファイルから推測しない。
// 起動時の flag や管理設定は、/implement が読めるどのファイルにも現れずに sandbox を変えるため。
//
// stdout: JSON { sandboxed, local_binding, platform }
//   sandboxed      sandbox の実行基盤は、包んだコマンドすべてに SANDBOX_RUNTIME を渡す
//   local_binding  127.0.0.1 での listen が成功した
//   platform       process.platform
// exit: 0
import { createServer } from "node:net";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

export const canBind = (host: string): Promise<boolean> =>
  new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(0, host, () => server.close(() => resolve(true)));
  });

export const probe = async (env: NodeJS.ProcessEnv = process.env) => ({
  sandboxed: Boolean(env.SANDBOX_RUNTIME),
  local_binding: await canBind("127.0.0.1"),
  platform: process.platform,
});

if (isMainModule(import.meta.url)) console.log(JSON.stringify(await probe()));
