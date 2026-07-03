export const meta = {
  name: "challenge",
  description:
    'Deterministic GO / NO-GO verdict on a proposal. Premise verification -> two parallel critic-design attacks -> verdict reconciliation always fire as script stages, so the attack cannot be skipped at the main loop\'s discretion. Callable standalone or nested from build via workflow("challenge").',
  whenToUse:
    "Headless verification of a proposal. For interactive sparring use the /challenge skill; this workflow records undecided choices in the assumptions field and advances. However, when 1+ undecided choices are irreversible or they exceed 7, the script downgrades to NO-GO and hands back to the human. args is a proposal description string, or {task, repo}.",
  phases: [{ title: "Premise" }, { title: "Attack" }, { title: "Verdict" }],
};

const task = typeof args === "string" ? args : (args && (args.task || args.proposal)) || "";
if (!task) {
  return { stopped: "no-task", why: "Pass the challenge target as args (string or {task})." };
}

const repo = typeof args === "object" && args && typeof args.repo === "string" ? args.repo : "";
// cd compound commands do not match critic-design's Bash(git:*)-style tool restrictions, so pin the repository via git -C and path arguments.
const anchor = (p) =>
  repo
    ? `Run every git, file, and build command against the repository at ${repo} (use \`git -C ${repo}\` for git; pass paths under ${repo} as arguments for search and file operations. Do not use \`cd\`).\n\n${p}`
    : p;

// Same granularity as critic-design's output definition (agents/critics/critic-design.md).
const CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "weaknesses"],
  properties: {
    verdict: {
      type: "string",
      enum: ["confirmed", "weakened", "needs_revision"],
    },
    weaknesses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["viewpoint", "severity", "finding", "evidence", "disconfirming_probe"],
        properties: {
          viewpoint: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          finding: { type: "string" },
          evidence: { type: "string", description: "file:line or search result" },
          disconfirming_probe: {
            type: "string",
            description: "claim stands / weakened / skipped (budget)",
          },
        },
      },
    },
  },
};

const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "why", "decisions", "assumptions", "weaknesses", "actions"],
  properties: {
    verdict: { type: "string", enum: ["GO", "NO-GO"] },
    why: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    tradeoffs: { type: "array", items: { type: "string" } },
    assumptions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "irreversible", "basis"],
        properties: {
          text: { type: "string" },
          irreversible: {
            type: "boolean",
            description:
              "true when reverting involves discarding completed work, external publication, or data migration",
          },
          basis: { type: "string", description: "one-line basis for the irreversible call" },
        },
      },
      description: "undecided choices advanced on best-guess; the user's veto targets",
    },
    weaknesses: {
      type: "array",
      items: { type: "string" },
      description: "real weaknesses that do not overturn GO; issue candidates for the caller",
    },
    actions: {
      type: "array",
      items: { type: "string" },
      description: "top 3 concrete keep / remove / revise actions",
    },
  },
};

// ---- Premise: fact verification and fact / preference sorting ----
phase("Premise");
const premise = await agent(
  anchor(`You are the premise-verification stage of an autonomous challenge. Target: "${task}"\n`) +
    `Read .claude/OUTCOME.md if present; its done state / non-goals / constraints are the outcome axis. ` +
    `List the open questions in the target and sort each into fact (evidence settles it to one answer) or preference (needs a choice). ` +
    `Verify the facts against the codebase and git history here. Do not treat a preference as fact.\n` +
    `Report as your final text: a one-line approach summary, the architectural decisions that crystallised, the trade-offs, and the undecided choices you would otherwise ask the user (these become logged assumptions). ` +
    `Annotate each undecided choice with how easily it can be reverted (whether overturning it after advancing on best-guess involves discarding completed work, external publication, or data migration).`,
  { agentType: "general-purpose", label: "premise", phase: "Premise" },
);

// ---- Attack: two critic-design in parallel (internal / outcome) ----
phase("Attack");
const critiques = await parallel([
  () =>
    agent(
      anchor(
        `Attack this premise along its own logic and surface hidden weaknesses and failure patterns. Premise:\n${premise}`,
      ),
      {
        agentType: "critic-design",
        phase: "Attack",
        label: "attack:internal",
        schema: CRITIQUE_SCHEMA,
      },
    ),
  () =>
    agent(
      anchor(
        `Read .claude/OUTCOME.md and verify whether this premise reaches the outcome. Check outcome fit, deviation from non-goals, and constraint violations. Premise:\n${premise}`,
      ),
      {
        agentType: "critic-design",
        phase: "Attack",
        label: "attack:outcome",
        schema: CRITIQUE_SCHEMA,
      },
    ),
]);
const attacks = critiques.filter(Boolean);

// ---- Verdict: reconcile into GO / NO-GO ----
phase("Verdict");
const verdict = await agent(
  `Reconcile the premise and the ${attacks.length} attack(s) by critic-design into a single GO / NO-GO verdict for autonomous execution.\n` +
    `Premise:\n${premise}\n\nAttacks:\n${JSON.stringify(attacks)}\n\n` +
    `Rule NO-GO only when fact evidence overturns the core (targets a state that already holds, or contradicts a verified fact). ` +
    `Otherwise GO, proceeding on the surviving part. List undecided choices as assumptions, ` +
    `tagging each with irreversible and basis. The irreversibility call feeds the script gate, so lean toward true when in doubt. ` +
    `Keep real weaknesses that do not overturn GO in weaknesses (the caller decides whether to file them as issues). ` +
    `Put the top 3 concrete keep / remove / revise actions in actions.`,
  { agentType: "general-purpose", label: "verdict", phase: "Verdict", schema: VERDICT_SCHEMA },
);

// ---- Gate: script-enforced residual gate ----
// The LLM's self-report is not the gate. The script can downgrade GO to NO-GO, never upgrade.
// NO-GO on a deficient task is the desired behavior; do not loosen the threshold to raise the completion rate.
const GATE_MAX_ASSUMPTIONS = 7;
const assumptions = verdict.assumptions || [];
const irreversibles = assumptions.filter((a) => a && a.irreversible);
let gate = null;
if (verdict.verdict === "GO" && irreversibles.length > 0) {
  gate = {
    rule: "irreversible-assumption",
    detail: irreversibles.map((a) => a.text),
    why:
      `${irreversibles.length} undecided choice(s) are irreversible. ` +
      `Advancing on best-guess cannot be recovered even if the PR is later rejected. ` +
      `Settle them interactively (/challenge skill) or pin them in the task spec, then rerun.`,
  };
} else if (verdict.verdict === "GO" && assumptions.length > GATE_MAX_ASSUMPTIONS) {
  gate = {
    rule: "underspecified",
    detail: assumptions.map((a) => a.text),
    why:
      `${assumptions.length} undecided choices exceed the cap of ${GATE_MAX_ASSUMPTIONS}; the task is not concrete enough for autonomous execution. ` +
      `Make the task spec concrete, then rerun.`,
  };
}
if (gate) {
  gate.llm_verdict = verdict.verdict;
  verdict.verdict = "NO-GO";
  verdict.why = `${gate.why} (LLM verdict was GO; script gate ${gate.rule} downgraded it)`;
}

log(
  verdict.verdict === "NO-GO"
    ? `NO-GO. ${verdict.why}`
    : `GO. ${assumptions.length} undecided choice(s) (0 irreversible) advanced on best-guess, ${verdict.weaknesses.length} weakness(es) recorded.`,
);

return { ...verdict, gate };
