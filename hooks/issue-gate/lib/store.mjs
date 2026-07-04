// Shared audit-store access + gate evaluation for the issue-gate hooks.
// The recorders append evidence records here; gate-check.mjs reads them back and
// evaluate() decides whether a `gh issue create` may proceed. Title binding reuses the
// canonical normalizeTitle so this gate and the skill-invoked verdict-gate / plan-gate can
// never drift on what "the same title" means.
import { appendFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { normalizeTitle } from "../../../scripts/issue-gate/lib/normalize-title.mjs";

// Re-export so the gate and the recorder bind titles through the one canonical normalizer.
export { normalizeTitle };

// Extract the --title value from a `gh issue create` command string. Handles --title "x",
// --title 'x', --title=x, and the -t short form. Returns "" when absent. Shared so gate-check
// and record consume the identical title the same way.
export const extractTitle = (cmd) => {
  const s = String(cmd ?? "");
  const patterns = [
    /--title[=\s]+"((?:[^"\\]|\\.)*)"/,
    /--title[=\s]+'([^']*)'/,
    /-t[=\s]+"((?:[^"\\]|\\.)*)"/,
    /-t[=\s]+'([^']*)'/,
    /--title[=\s]+(\S+)/,
    /-t[=\s]+(\S+)/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1].replace(/\\(["\\])/g, "$1");
  }
  return "";
};

// Store location. ISSUE_GATE_HOME overrides the directory so tests can point at a temp dir.
export const storeDir = () =>
  process.env.ISSUE_GATE_HOME || join(homedir(), ".claude", "state", "issue-gate");
export const auditPath = () => join(storeDir(), "audit.jsonl");

// Append one record as a JSONL line, creating the store dir on first write.
export const append = (record) => {
  mkdirSync(storeDir(), { recursive: true });
  appendFileSync(auditPath(), `${JSON.stringify(record)}\n`, "utf8");
};

// Read all records. A malformed line is skipped rather than throwing, so a partially written
// or hand-corrupted log cannot crash the gate (the gate fails closed on absence of evidence,
// not on a parse error mid-file).
export const readRecords = () => {
  const p = auditPath();
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

// Decide whether a gh issue create may proceed.
// ctx: { sessionId, agentId, normalizedTitle }
// Returns { decision: "allow" | "deny", via, reasons, systemMessage? }.
export const evaluate = (records, ctx) => {
  const { sessionId, agentId, normalizedTitle: nt } = ctx;

  // agent_id exemption: the create originated inside a subagent (present iff subagent-driven,
  // e.g. the headless /build flow). Documented residual bypass; allowed only because the caller
  // makes it visible (systemMessage) and leaves an exemption record in the audit log.
  if (agentId) {
    return {
      decision: "allow",
      via: "agent_id",
      reasons: [],
      systemMessage: `issue-gate: subagent-originated gh issue create exempted (agent_id=${agentId}); recorded to the audit log.`,
    };
  }

  const sess = records.filter((r) => r.session_id === sessionId);

  // Single-use accounting.
  const consumedBundle = sess.filter(
    (r) => r.kind === "consumed" && r.via === "bundle" && r.normalized_title === nt,
  ).length;
  const skipCount = sess.filter((r) => r.kind === "skip").length;
  const consumedSkip = sess.filter((r) => r.kind === "consumed" && r.via === "skip").length;

  // Full evidence bundle for this title (the non-skip challenge -> research -> think pipeline).
  const titleSubagents = sess.filter(
    (r) =>
      r.kind === "subagent" &&
      r.status === "completed" &&
      (r.result_len || 0) > 0 &&
      normalizeTitle(r.prompt || "").includes(nt),
  );
  const critics = titleSubagents.filter((r) => (r.subagent_type || "").includes("critic")).length;
  const explorers = titleSubagents.filter((r) =>
    (r.subagent_type || "").includes("explorer"),
  ).length;
  const verdictGo = sess.some(
    (r) => r.kind === "verdict" && r.normalized_title === nt && r.verdict === "GO",
  );
  const planReady = sess.some(
    (r) => r.kind === "plan" && r.normalized_title === nt && r.ready === true,
  );

  const bundleComplete = critics >= 2 && explorers >= 1 && verdictGo && planReady;
  if (bundleComplete && consumedBundle === 0) return { decision: "allow", via: "bundle", reasons: [] };

  // Deliberate human gate-exemption for docs / chore / minor-bug (recorded via the fixed-header
  // AskUserQuestion). Session-scoped and single-use: N skips allow N creates.
  if (skipCount - consumedSkip > 0) return { decision: "allow", via: "skip", reasons: [] };

  const reasons = [];
  if (bundleComplete && consumedBundle > 0) reasons.push("bundle-already-consumed");
  else {
    if (!verdictGo) reasons.push("no-challenge-GO");
    if (!planReady) reasons.push("no-plan-ready");
    if (explorers < 1) reasons.push("no-research-explorer");
    if (critics < 2) reasons.push("insufficient-adversarial-challenge");
  }
  return { decision: "deny", via: null, reasons };
};

// What record-bash should consume after a successful create, mirroring evaluate()'s allow path.
// Never consumes on the agent_id path (that write happens at gate time).
export const consumptionFor = (records, ctx) => {
  const r = evaluate(records, ctx);
  if (r.decision !== "allow" || r.via === "agent_id") return null;
  return r.via; // "bundle" | "skip"
};
