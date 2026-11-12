#!/usr/bin/env node
/// <reference types="node" />
// Usage: sandbox_probe.ts
//
// Observes the sandbox of the session this command runs in. /implement does not infer it from
// settings files, because a launch flag or a managed setting changes the sandbox without showing
// up in any file /implement can read.
//
// stdout: JSON { sandboxed, local_binding, platform }
//   sandboxed      the sandbox runtime passes SANDBOX_RUNTIME to every command it wraps
//   local_binding  a listen on 127.0.0.1 succeeded
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
