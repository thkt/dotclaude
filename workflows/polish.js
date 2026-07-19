export const meta = {
  name: "polish",
  description:
    'Deterministic Codex review + cleanup. Codex findings always pass through a critic-audit challenge, and the triage (confirmed / disputed / downgraded / needs_context) is decided by the script, so findings are never aggregated as facts and the challenge cannot be skipped. Callable standalone or nested from build via workflow("polish").',
  whenToUse:
    "Headless external-lens review of a diff plus AI-slop removal. args is a scope string, or {scope, repo, mode, base}. When scope is omitted, the target is the uncommitted changes, else the diff of commits ahead of the base branch (default main) — the pushed branch diff. mode: full (default) runs review -> fix -> cleanup; review returns the challenged findings without fixing; cleanup runs only simplify + enhancer-code + test validation. For a deep internal-reviewer audit use the audit workflow.",
  phases: [{ title: "Review" }, { title: "Challenge" }, { title: "Fix" }, { title: "Cleanup" }],
};

// The triage table lives in the script because
// leaving verdict interpretation to an agent invites drift: "fixing disputed
// findings just in case" or silently dropping needs_context. The mode option
// exists for composition with build, which wants review (read-only) running in
// parallel with audit, and cleanup running later after the merged fix pass.

const parseArgs = () => {
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // a non-JSON string is scope shorthand
    }
    return { scope: args };
  }
  return args && typeof args === "object" ? args : {};
};
const opts = parseArgs();
const scope = typeof opts.scope === "string" ? opts.scope : "";
const repo = typeof opts.repo === "string" ? opts.repo : "";
const mode = opts.mode === "review" || opts.mode === "cleanup" ? opts.mode : "full";
const base = typeof opts.base === "string" ? opts.base : "main";

const anchor = (p) =>
  repo
    ? `Run every git, file, and build command from the repository at ${repo} (begin each shell command with \`cd ${repo} && \`).\n\n${p}`
    : p;
const scopeNote = (diffKind) =>
  scope
    ? `The target scope is ${scope}. Drop any fix touching files outside it.`
    : diffKind === "branch"
      ? `The target is git diff ${base}...HEAD (the pushed branch diff). Drop any fix touching files outside the diff.`
      : "The target is git diff HEAD (staged + unstaged). Drop any fix touching files outside the diff.";

const CODEX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["available", "has_changes", "diff_kind", "findings"],
  properties: {
    available: {
      type: "boolean",
      description: "whether the codex CLI was usable",
    },
    has_changes: {
      type: "boolean",
      description: "whether the diff has changes to polish",
    },
    diff_kind: {
      type: "string",
      enum: ["uncommitted", "branch", ""],
      description: "kind of target diff; branch means the diff of commits ahead of base",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "detail", "severity"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          file: { type: "string" },
          severity: { type: "string", enum: ["P1", "P2", "P3"] },
        },
      },
    },
    notes: { type: "string" },
  },
};

const VERDICTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdicts"],
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "verdict"],
        properties: {
          id: { type: "string" },
          verdict: {
            type: "string",
            enum: ["confirmed", "disputed", "downgraded", "needs_context"],
          },
          severity: { type: "string", enum: ["P1", "P2", "P3"] },
          why: { type: "string" },
        },
      },
    },
  },
};

const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fixed", "stashed", "tests_pass"],
  properties: {
    fixed: { type: "array", items: { type: "string" } },
    stashed: {
      type: "array",
      items: { type: "string" },
      description: "fixes rolled back via git stash because they broke tests",
    },
    tests_pass: { type: "boolean" },
    notes: { type: "string" },
  },
};

const CLEANUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["edits", "tests_pass", "stashed"],
  properties: {
    edits: {
      type: "array",
      items: { type: "string" },
      description: "edit summaries with file:line",
    },
    tests_pass: { type: "boolean" },
    stashed: {
      type: "boolean",
      description: "whether the cleanup edits were rolled back on test failure",
    },
    notes: { type: "string" },
  },
};

let codex = { available: false, has_changes: true, diff_kind: "", findings: [] };
let verdicts = [];
let survivors = [];
let needsContext = [];
let fix = null;

if (mode !== "cleanup") {
  // ---- Review: external Codex lens ----
  phase("Review");
  const detectNote = scope
    ? `First check with \`git status\` and \`git diff HEAD\` whether changes to polish exist. If not, return has_changes: false with an empty diff_kind. If they do, set diff_kind: uncommitted.`
    : `First determine the kind of target diff. If \`git status --porcelain\` prints anything, diff_kind: uncommitted. Otherwise, if \`git rev-list --count ${base}..HEAD\` is 1 or more, diff_kind: branch (the pushed branch diff). If neither applies, return has_changes: false with an empty diff_kind.`;
  codex = (await agent(
    anchor(
      `External Codex review stage. ${detectNote}\n` +
        `Then check \`which codex\`. If missing, return available: false with empty findings.\n` +
        `When diff_kind is branch, run \`codex review --base ${base}\` (in codex 0.144.6 the scope flags (--uncommitted / --base / --commit) are mutually exclusive with the PROMPT argument, so for a branch diff no PROMPT can be sent and the simplicity lens falls back to Codex's default lens).\n` +
        `Otherwise run \`codex review "Review for logic, architecture, data flow, and code simplicity (flag over-complexity and unnecessary indirection)"\`. Pass no scope flag when sending the PROMPT (Codex reads git status itself). Omitting the PROMPT drops the simplicity lens, so always pass it for uncommitted.\n` +
        `Structure the output into findings. Assign ids F1, F2, ..., and copy Codex's P1/P2/P3 as severity (judge from impact when absent). ` +
        (scope
          ? `The target scope is ${scope}. Drop any findings touching files outside it.`
          : `Drop any findings touching files outside the determined diff (git diff HEAD for uncommitted, git diff ${base}...HEAD for branch).`),
    ),
    {
      label: "codex",
      phase: "Review",
      agentType: "general-purpose",
      schema: CODEX_SCHEMA,
      model: "sonnet",
    },
  )) || { available: false, has_changes: true, diff_kind: "", findings: [] };
  if (!codex.has_changes) {
    return {
      mode,
      polished: false,
      why: "no changes in the diff, nothing to polish",
    };
  }
  log(
    codex.available
      ? `${codex.findings.length} Codex finding(s).`
      : "codex CLI missing; proceeding to cleanup with no findings.",
  );

  // ---- Challenge: critic-audit filters false positives ----
  if (codex.findings.length) {
    phase("Challenge");
    const challenged = await agent(
      anchor(
        `critic-audit. Adversarially challenge this full set of external Codex review findings and return a verdict per finding.\n` +
          `The verdict criteria are as follows. confirmed = real and the severity holds / disputed = false positive / downgraded = real but severity inflated (put the lowered severity in severity) / needs_context = undecidable from code alone, needs human context.\n` +
          `The findings are as follows.\n${JSON.stringify(codex.findings)}`,
      ),
      {
        agentType: "critic-audit",
        phase: "Challenge",
        label: "challenge",
        schema: VERDICTS_SCHEMA,
        model: "opus",
        effort: "xhigh",
      },
    );
    // If the challenge dies, advance with every finding treated as confirmed (fail-open).
    verdicts = challenged
      ? challenged.verdicts
      : codex.findings.map((f) => ({
          id: f.id,
          verdict: "confirmed",
          severity: f.severity,
        }));

    // The script triages deterministically: confirmed / downgraded become fix
    // candidates, disputed is dropped, needs_context surfaces to the caller.
    // Fix candidates are P1/P2 only (P3 is cleanup territory).
    const byId = new Map(codex.findings.map((f) => [f.id, f]));
    for (const v of verdicts) {
      const f = byId.get(v.id);
      if (!f) continue;
      if (v.verdict === "needs_context") {
        needsContext.push({ ...f, why: v.why || "" });
        continue;
      }
      if (v.verdict === "disputed") continue;
      const severity = v.verdict === "downgraded" && v.severity ? v.severity : f.severity;
      if (severity === "P1" || severity === "P2") survivors.push({ ...f, severity });
    }
    log(
      `triage: ${survivors.length} survived / ${needsContext.length} needs_context / ${codex.findings.length - survivors.length - needsContext.length} dropped`,
    );
  }

  if (mode === "review") {
    return {
      mode,
      codex_available: codex.available,
      diff_kind: codex.diff_kind,
      survivors,
      needs_context: needsContext,
    };
  }

  // ---- Fix: repair the surviving findings ----
  if (survivors.length) {
    phase("Fix");
    fix = await agent(
      anchor(
        `Fix the findings that survived the challenge, highest severity first. ${scopeNote(codex.diff_kind)}\n` +
          `After fixing, detect and run the project's test command; roll back any fix that breaks tests via git stash. Do not commit.\n` +
          `The findings are as follows.\n${JSON.stringify(survivors)}`,
      ),
      {
        label: "fix",
        phase: "Fix",
        agentType: "general-purpose",
        schema: FIX_SCHEMA,
        model: "opus",
        effort: "high",
      },
    );
  }
}

// ---- Cleanup: simplify -> enhancer-code -> test validation ----
// Neither hunts bugs, so both apply directly without a critic-audit challenge.
phase("Cleanup");
const cleanupTarget =
  codex.diff_kind === "branch"
    ? `git diff ${base}...HEAD (the pushed branch diff)`
    : "the current diff";
await agent(
  anchor(
    `Invoke the Skill tool with skill "simplify" for a cleanup-only pass (reuse, simplification, efficiency, altitude) on ${cleanupTarget}. If it rejects a no-arg invocation, pass the diff scope. Do not commit.`,
  ),
  {
    label: "simplify",
    phase: "Cleanup",
    agentType: "general-purpose",
    model: "sonnet",
  },
);
await agent(
  anchor(
    `Remove AI slop from ${cleanupTarget}, apply simplification rules, then audit tests. Your preservation rule (when in doubt, keep) takes priority over simplify's edits.`,
  ),
  {
    agentType: "enhancer-code",
    phase: "Cleanup",
    label: "enhancer",
    model: "sonnet",
  },
);
const cleanup = (await agent(
  anchor(
    `Detect and run the project's test command. On failure, roll back the cleanup edits (the changes just made by simplify / enhancer-code) via git stash and report stashed: true. List the applied edit summaries with file:line in edits. Do not commit.`,
  ),
  {
    label: "validate",
    phase: "Cleanup",
    agentType: "general-purpose",
    schema: CLEANUP_SCHEMA,
    model: "sonnet",
  },
)) || {
  edits: [],
  tests_pass: false,
  stashed: false,
  notes: "validate agent returned nothing",
};

return {
  mode,
  codex_available: codex.available,
  diff_kind: codex.diff_kind,
  findings: codex.findings.length,
  survivors: survivors.length,
  fixed: fix ? fix.fixed : [],
  stashed_fixes: fix ? fix.stashed : [],
  needs_context: needsContext,
  cleanup,
};
