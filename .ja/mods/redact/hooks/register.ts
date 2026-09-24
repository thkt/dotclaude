import type { On } from "claude-code";

import { maskedRead } from "./redact.ts";

export function register(on: On) {
  on("tool.call", { tool: "Read" }, async ($, e, next) => {
    const r = await next(e);
    if (e.tool !== "Read" || r.deny !== undefined || r.isError) return r;
    const masked = maskedRead(r.result);
    // r をそのまま返すと core 自身のメッセージ (ref) が使われ、そこには生の内容が残る。
    // hook 自身の { result } を返したときだけ、core が出力をモデル向けに組み直す。
    return masked === null ? r : { result: masked, context: r.context };
  });
}
