#!/usr/bin/env node
// PreToolUse gate on `gh issue create`. Reads the hook payload on stdin, extracts the issue
// title, and allows the create only when the audit store holds a complete evidence bundle for
// that title (challenge GO + plan ready + research explorer + 2 adversarial critics), or an
// unconsumed human skip record, or the call is subagent-originated (agent_id exemption).
// Any other case denies. Fail-closed: a parse failure or a missing title denies.
import { readStdin } from "../../scripts/issue-gate/lib/normalize-title.mjs";
import { readRecords, evaluate, append, normalizeTitle, extractTitle } from "./lib/store.mjs";

// Emit a PreToolUse deny and record it, then exit 0 (the deny travels in the JSON, not the code).
const deny = (payload, title, reason) => {
  append({
    kind: "deny",
    ts: new Date().toISOString(),
    session_id: payload?.session_id ?? null,
    normalized_title: title,
    reason,
  });
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `issue-gate: ${reason}`,
      },
    })}\n`,
  );
  process.exit(0);
};

const raw = await readStdin(process.stdin);

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  // Malformed hook payload: cannot verify anything, deny.
  deny(null, "", "hook payload is not valid JSON (fail-closed)");
}

const command = payload?.tool_input?.command ?? "";
const rawTitle = extractTitle(command);
const nt = normalizeTitle(rawTitle);

if (!nt) deny(payload, "", "gh issue create without an extractable --title; cannot bind evidence");

const ctx = {
  sessionId: payload.session_id ?? null,
  agentId: payload.agent_id ?? null,
  agentType: payload.agent_type ?? null,
  normalizedTitle: nt,
};

const result = evaluate(readRecords(), ctx);

if (result.decision === "deny") {
  deny(payload, nt, `no evidence bundle for this issue title (${result.reasons.join(", ")})`);
}

// Allow. On the agent_id path leave a visible, recorded trace of the exemption.
if (result.via === "agent_id") {
  append({
    kind: "exemption",
    ts: new Date().toISOString(),
    session_id: ctx.sessionId,
    normalized_title: nt,
    agent_id: ctx.agentId,
    agent_type: ctx.agentType,
  });
  process.stdout.write(`${JSON.stringify({ systemMessage: result.systemMessage })}\n`);
}
// bundle / skip: silent allow. Consumption is recorded PostToolUse by record-bash on success.
process.exit(0);
