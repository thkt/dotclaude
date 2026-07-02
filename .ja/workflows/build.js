export const meta = {
  name: "build",
  description:
    "Autonomous end-to-end build. challenge / branch / research / think / code / audit / polish / ship run headless as deterministic script stages, so every machinery fan-out fires instead of being inlined. Review at the draft PR.",
  whenToUse:
    "Fire-and-forget implementation. You walk away and come back to a draft PR, where you review the logged assumptions and the audit result. Reach for this when the task is specified enough to advance residual choices on best-guess; when it needs live steering mid-flight, drive the phases interactively instead.",
  phases: [
    { title: "Challenge" },
    { title: "Branch" },
    { title: "Research" },
    { title: "Think" },
    { title: "Code" },
    { title: "Audit" },
    { title: "Polish" },
    { title: "Ship" },
  ],
};

// Autonomous build owns each phase's fan-out at the script level, because a
// spawned agent cannot spawn its own sub-agents (nested spawn is blocked). The
// interactive /build skill relies on that nesting (challenge -> critic-design,
// audit -> reviewer swarm); here the script flattens it to one level, except
// audit, which delegates to workflow("audit") so it keeps /audit's full routing
// table (nesting a workflow is one level deep, which is allowed). Fidelity cuts
// are deliberate and logged, not silent: code runs a single implementer rather
// than /code's RGRC machinery, and interactive gates are replaced by best-guess
// assumptions surfaced at the draft PR.

const task = typeof args === "string" ? args : (args && args.task) || "";
if (!task) {
  return { stopped: "no-task", why: "Pass the implementation task as args (string or {task})." };
}

// Optional repo target. When set, the build runs against a repository other than
// the session cwd. Every filesystem / git / build step must be anchored there;
// relying on "subagents inherit the session cwd" is model-discretion and would
// misfire when the build is launched from elsewhere. anchor() prepends an
// absolute cd so the starting cwd is irrelevant rather than assumed. guard is a
// deterministic backstop for the hard-to-reverse steps (branch, commit, push,
// PR): confirm the repo root before mutating, since the run completes headless
// with no chance to intervene mid-flight.
const repo = typeof args === "object" && args && typeof args.repo === "string" ? args.repo : "";
const anchor = (p) =>
  repo
    ? `Run every git, file, and build command from the repository at ${repo} (begin each shell command with \`cd ${repo} && \`, which persists for that command's own follow-ups).\n\n${p}`
    : p;
const guard = repo
  ? ` Before this step's first commit, push, or branch mutation, run \`cd ${repo} && git rev-parse --show-toplevel\` and confirm it prints ${repo}; if it prints anything else, abort without mutating git and report the mismatch.`
  : "";

const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "why", "decisions", "assumptions"],
  properties: {
    verdict: { type: "string", enum: ["GO", "NO-GO"] },
    why: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    tradeoffs: { type: "array", items: { type: "string" } },
    assumptions: {
      type: "array",
      items: { type: "string" },
      description: "residual preferences advanced on best-guess; user veto targets at the PR",
    },
  },
};

const CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "weaknesses"],
  properties: {
    verdict: { type: "string" },
    weaknesses: { type: "array", items: { type: "string" } },
  },
};

const PLANNING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dir", "summary"],
  properties: {
    dir: {
      type: "string",
      description: "planning dir, e.g. .claude/workspace/planning/YYYY-MM-DD-slug",
    },
    summary: { type: "string" },
  },
};

const SHIP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["committed", "pr_url"],
  properties: {
    committed: { type: "boolean" },
    pr_url: { type: "string" },
    notes: { type: "string" },
  },
};

// ---- Challenge: premise -> two critic-design attacks -> GO/NO-GO ----
phase("Challenge");
const premise = await agent(
  anchor(`You are the premise-analysis stage of an autonomous build. Task: "${task}".\n`) +
    `Read .claude/OUTCOME.md if present for the outcome axis. List the open questions in the task, sort each into fact (evidence settles it) or preference (needs a choice). Verify the facts against the codebase. Report a one-line approach summary, the architectural decisions that crystallised, the trade-offs, and the residual preferences you would otherwise ask the user (these become logged assumptions).\n` +
    `Return that package as your final text.`,
  { label: "premise", phase: "Challenge" },
);
const critiques = await parallel([
  () =>
    agent(
      anchor(
        `critic-design, internal attack. Attack this build premise on its own terms (hidden weaknesses, failure modes). Premise:\n${premise}`,
      ),
      { agentType: "critic-design", phase: "Challenge", schema: CRITIQUE_SCHEMA },
    ),
  () =>
    agent(
      anchor(
        `critic-design, outcome attack. Read .claude/OUTCOME.md and attack whether this premise reaches the outcome (outcome fit, non-goal breach, constraint breach). Premise:\n${premise}`,
      ),
      { agentType: "critic-design", phase: "Challenge", schema: CRITIQUE_SCHEMA },
    ),
]);
const verdict = await agent(
  `Reconcile the premise and the two critic-design attacks into a single GO/NO-GO verdict for an autonomous build.\n` +
    `Premise:\n${premise}\n\nInternal attack:\n${JSON.stringify(critiques[0])}\n\nOutcome attack:\n${JSON.stringify(critiques[1])}\n\n` +
    `Rule NO-GO only when fact evidence overturns the core (targets a state that already holds, or a verified fact contradicts it). Otherwise GO, proceeding on the surviving part. List residual preferences as assumptions.`,
  { label: "verdict", phase: "Challenge", schema: VERDICT_SCHEMA },
);
if (verdict.verdict === "NO-GO") {
  return { stopped: "NO-GO", why: verdict.why, decisions: verdict.decisions };
}
log(`GO. ${verdict.assumptions.length} residual(s) advanced on best-guess (veto at the PR).`);

// ---- Branch ----
phase("Branch");
const branch = await agent(
  anchor(
    `Check out a new git working branch for: "${task}". Choose a conventional branch name (type then short slug) from the task and run git checkout -b with that name. If already off the default branch, keep the current branch. Report the branch name as your final text.${guard}`,
  ),
  { label: "checkout", phase: "Branch", agentType: "general-purpose" },
);

// ---- Research (light; skips cleanly when there are no unknowns) ----
phase("Research");
const research = await parallel([
  () =>
    agent(
      anchor(
        `Explore the codebase for prior art, patterns, and constraints relevant to: "${task}". Report file:line anchors. medium breadth.`,
      ),
      { agentType: "Explore", phase: "Research", label: "explore:patterns" },
    ),
  () =>
    agent(
      anchor(
        `Explore the codebase for integration points, existing helpers to reuse, and edge cases relevant to: "${task}". Report file:line anchors. medium breadth.`,
      ),
      { agentType: "Explore", phase: "Research", label: "explore:integration" },
    ),
]);
const researchDigest = research.filter(Boolean).join("\n\n");

// ---- Think: SOW/Spec -> critic-design ----
phase("Think");
const planning = await agent(
  anchor(`Generate a SOW and Spec for an autonomous build of: "${task}".\n`) +
    `Inputs. Challenge decisions: ${JSON.stringify(verdict.decisions)}. Trade-offs: ${JSON.stringify(verdict.tradeoffs || [])}. Assumptions (log these in the SOW Why): ${JSON.stringify(verdict.assumptions)}.\n` +
    `Research:\n${researchDigest}\n\n` +
    `Run \`date -u +%Y-%m-%d\` for the slug. Write .claude/workspace/planning/<date>-<slug>/sow.md (AC-N ids) and spec.md (FR-001 / T-001 / NFR-001 ids). Return the dir and a one-line summary.`,
  { label: "plan", phase: "Think", agentType: "general-purpose", schema: PLANNING_SCHEMA },
);
await agent(
  anchor(
    `critic-design. Attack the SOW and Spec at ${planning.dir} for hidden weaknesses, unstated assumptions, and outcome drift. Report a verdict table and actionable items.`,
  ),
  { agentType: "critic-design", phase: "Think", label: "critic:spec" },
);
// ---- Code: single implementer (fidelity cut vs /code RGRC machinery) ----
phase("Code");
log("Code phase runs a single implementer agent, not /code's full RGRC machinery.");
await agent(
  anchor(
    `Implement the SOW and Spec at ${planning.dir}. Test-first (TDD): write failing tests from the T-NNN scenarios, implement to green, refactor. Run the project's lint / type-check / test gates and keep going until every AC is met and tests pass. Do not commit.`,
  ),
  { label: "implement", phase: "Code", agentType: "general-purpose" },
);

// ---- Audit: delegate to the deterministic audit workflow (full routing) ----
// workflow("audit") owns the fan-out: it ports /audit's glob routing table to
// JS and fires every routed reviewer -> critic-audit -> critic-evidence ->
// team-integration. Nesting a workflow is one level deep, which is allowed, so
// build keeps /audit fidelity here instead of the old 6-reviewer cut. No scope
// is passed, so audit routes the uncommitted diff (code has not committed yet),
// which is the whole implementation.
phase("Audit");
const audit = (await workflow("audit", { repo })) || { findings: [] };
log(
  `Audit fired ${(audit.assignments || []).length} reviewer group(s), ${(audit.skipped || []).length} skipped.`,
);
const blocking = (audit.findings || []).filter(
  (f) => f.severity === "critical" || f.severity === "high",
);
if (blocking.length) {
  log(`Fixing ${blocking.length} critical/high finding(s).`);
  await agent(
    anchor(
      `Fix these critical/high audit findings, then confirm tests still pass:\n${JSON.stringify(blocking)}`,
    ),
    { agentType: "general-purpose", phase: "Audit", label: "fix" },
  );
}

// ---- Polish: external Codex + enhancer-code cleanup ----
phase("Polish");
await agent(
  anchor(
    `Run external Codex review on the uncommitted diff if the \`codex\` CLI is installed (a non-Claude lens against self-enhancement bias), apply its safe fixes, then run enhancer-code style cleanup (simplify, clarify). If codex is not installed, do cleanup only. If any fix breaks tests, revert that fix. Do not commit.`,
  ),
  { label: "polish", phase: "Polish", agentType: "general-purpose" },
);

// ---- Ship: commit + draft PR (outward-facing, so draft = reversible) ----
phase("Ship");
const shipPrompt = anchor(
  `Commit all changes (planning artifacts + implementation) in one Conventional Commits commit. ` +
    `Then push the branch and open a draft pull request using the gh CLI in draft mode. ` +
    `The PR body must list the logged assumptions so the user can veto: ${JSON.stringify(verdict.assumptions)}. ` +
    `Report committed status and the PR url.${guard}`,
);
const ship = await agent(shipPrompt, {
  label: "ship",
  phase: "Ship",
  agentType: "general-purpose",
  schema: SHIP_SCHEMA,
});

return {
  verdict: verdict.verdict,
  branch,
  planning: planning.dir,
  audit_findings: (audit.findings || []).length,
  assumptions: verdict.assumptions,
  pr_url: ship.pr_url,
  committed: ship.committed,
};
