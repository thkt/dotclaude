import type { On } from "claude-code";

import { maskedRead } from "./redact.ts";

export function register(on: On) {
  on("tool.call", { tool: "Read" }, async ($, e, next) => {
    const r = await next(e);
    if (e.tool !== "Read" || r.deny !== undefined || r.isError) return r;
    const masked = maskedRead(r.result);
    return masked === null ? r : { result: masked, context: r.context };
  });
}
