#!/usr/bin/env node
// PostToolUse recorder. One subcommand per observed tool, wired from settings.json via thin .sh
// wrappers. Reads the hook payload on stdin and appends the matching evidence record to the
// audit store. Best-effort: a payload that does not match the expected shape is a silent no-op
// (the gate, not the recorder, is the fail-closed decision point).
import { readStdin } from "../../scripts/issue-gate/lib/normalize-title.mjs";
import {
  readRecords,
  append,
  consumptionFor,
  normalizeTitle,
  extractTitle,
} from "./lib/store.mjs";

const now = () => new Date().toISOString();

const raw = await readStdin(process.stdin);
let p;
try {
  p = JSON.parse(raw);
} catch {
  process.exit(0);
}
const kind = process.argv[2];
const sessionId = p?.session_id ?? null;

// PostToolUse Agent: record a completed critic / explorer subagent so the gate can confirm the
// adversarial challenge and research spawns ran for this title. The verbatim title lives in the
// spawn prompt (a convention the challenge / research / think skills enforce).
if (kind === "subagent") {
  const type = p?.tool_input?.subagent_type ?? "";
  if (!/critic|explorer/.test(type)) process.exit(0);
  const resp = p?.tool_response ?? {};
  const text = Array.isArray(resp.content)
    ? resp.content.map((c) => c?.text ?? "").join("")
    : "";
  append({
    kind: "subagent",
    ts: now(),
    session_id: sessionId,
    subagent_type: type,
    prompt: p?.tool_input?.prompt ?? "",
    status: resp.status ?? "",
    result_len: text.length,
  });
  process.exit(0);
}

// PostToolUse Bash: three observations from one matcher.
if (kind === "bash") {
  const cmd = p?.tool_input?.command ?? "";
  const stdout = p?.tool_response?.stdout ?? "";

  // (a) a verdict-gate run -> capture its GO / NO-GO verdict for the title.
  // (b) a plan-gate run    -> capture its ready flag for the title.
  if (/verdict-gate\.mjs/.test(cmd) || /plan-gate\.mjs/.test(cmd)) {
    let out;
    try {
      out = JSON.parse(stdout.trim().split("\n").pop() || "{}");
    } catch {
      process.exit(0);
    }
    if (/verdict-gate\.mjs/.test(cmd) && (out.verdict === "GO" || out.verdict === "NO-GO")) {
      append({
        kind: "verdict",
        ts: now(),
        session_id: sessionId,
        normalized_title: out.normalized_title ?? "",
        verdict: out.verdict,
        downgraded: out.downgraded === true,
      });
    } else if (/plan-gate\.mjs/.test(cmd) && typeof out.ready === "boolean") {
      append({
        kind: "plan",
        ts: now(),
        session_id: sessionId,
        normalized_title: out.normalized_title ?? "",
        ready: out.ready,
      });
    }
    process.exit(0);
  }

  // (c) a successful gh issue create -> consume the bundle / skip it drew on (single-use).
  // Skip the agent_id path: that create was exempted and already recorded at gate time.
  if (/gh\s+issue\s+create/.test(cmd) && !p.agent_id) {
    const succeeded = /github\.com\/[^\s]+\/issues\/\d+/.test(stdout);
    if (!succeeded) process.exit(0);
    const ctx = { sessionId, agentId: null, normalizedTitle: normalizeTitle(extractTitle(cmd)) };
    const via = consumptionFor(readRecords(), ctx);
    if (via) {
      append({
        kind: "consumed",
        ts: now(),
        session_id: sessionId,
        via,
        normalized_title: via === "bundle" ? ctx.normalizedTitle : null,
      });
    }
  }
  process.exit(0);
}

// PostToolUse AskUserQuestion: record a human gate-exemption only when the fixed skip header is
// present. The chosen kind (docs / chore / minor-bug) is the answer to that question.
if (kind === "skip") {
  const questions = p?.tool_input?.questions ?? [];
  const skipQ = questions.find((q) => q?.header === "判定スキップ");
  if (!skipQ) process.exit(0);
  const answers = p?.tool_response?.answers ?? {};
  const skipKind = answers[skipQ.question] ?? "";
  append({ kind: "skip", ts: now(), session_id: sessionId, skip_kind: skipKind });
  process.exit(0);
}

process.exit(0);
