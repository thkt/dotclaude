#!/usr/bin/env node
/// <reference types="node" />
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
