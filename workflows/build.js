export const meta = {
  name: "build",
  description:
    "Autonomous end-to-end build. Taking an issue with a Plan section refined via /issue as input, Load (verbatim fetch -> deterministic id collection -> extract -> validate + id cross-check) / Revalidate / Branch / Code / Audit / Polish / Backlog / Ship run headlessly as deterministic script stages. Review happens on a draft PR.",
  whenToUse:
    'Fire-and-forget implementation. Finish the refine-with-a-human stage in /issue, then pass that issue number ("123" / "#123") / URL / {issue, repo} as args. Step away and come back to a draft PR with recorded assumptions, audit results, and out-of-scope backlog candidates listed for you to file via /issue. If in-flight steering is needed, drive the phases interactively.',
  phases: [
    { title: "Load" },
    { title: "Revalidate" },
    { title: "Branch" },
    { title: "Code" },
    { title: "Audit" },
    { title: "Polish" },
    { title: "Backlog" },
    { title: "Ship" },
  ],
};

// Assuming the upstream /issue finished premise verification and human refinement,
// build does not reinvent the plan. The issue body's ## Plan section is the single
// planning source; extraction is left to the LLM but verification belongs to the
// script: the Plan heading check and U/T id collection are deterministic regexes,
// structural validation is validate(), and silent drops in extraction are rejected
// by exact id-set comparison. Code moving between issue filing and build launch is
// caught fail-closed by Revalidate (exists/matches checks on preconditions). Stages
// whose fan-out lives inside them are delegated to nested workflows (code / audit /
// polish; one level of nesting is allowed).

phase("Load");

const input = typeof args === "object" && args ? args : {};
const issueRef = String(typeof args === "string" ? args : input.issue || "").trim();
// Deterministically pull the issue number from the tail of "123" / "#123" / an issue URL.
const issueNumber = (issueRef.match(/(\d+)\D*$/) || [])[1] || "";
if (!issueRef || !issueNumber) {
  return {
    stopped: "no-issue",
    why: 'Pass the issue as args ("123" / "#123" / URL / {issue, repo}).',
  };
}

// When repo is set, pin every step to that repository regardless of the session cwd.
// Relying on "subagents inherit the session cwd" is model discretion and breaks when
// launched from elsewhere. anchor() prepends an absolute cd so the starting cwd is
// irrelevant. guard is a deterministic backstop for the hard-to-reverse steps
// (branch / commit / push / PR): with no chance to intervene during a headless run,
// it makes the agent confirm the repo root before mutating git.
const repo = typeof input.repo === "string" ? input.repo : "";
const anchor = (p) =>
  repo
    ? `Run every git, file, and build command from the repository at ${repo} (begin each shell command with \`cd ${repo} && \`).\n\n${p}`
    : p;
const guard = repo
  ? ` Before the first commit / push / branch change in this step, run \`cd ${repo} && git rev-parse --show-toplevel\` and confirm the output is ${repo}. If it differs, abort without mutating git and report the mismatch.`
  : "";

const FETCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["found", "body"],
  properties: {
    found: { type: "boolean" },
    body: {
      type: "string",
      description: "The issue body verbatim. No summarizing or reformatting",
    },
  },
};

// Schema of the structured plan (units + preconditions + backlog_candidates) carried in the issue's Plan section.
// Extraction structures the plan written in the issue; it is not re-planning.
const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "dir",
    "outcome",
    "decisions",
    "assumptions",
    "units",
    "test_command",
    "preconditions",
    "backlog_candidates",
  ],
  properties: {
    dir: {
      type: "string",
      description: "Planning dir, e.g. .claude/workspace/planning/YYYY-MM-DD-slug",
    },
    outcome: {
      type: "string",
      description:
        "One-line description of the done state (implementation-independent, observable)",
    },
    decisions: { type: "array", items: { type: "string" } },
    assumptions: {
      type: "array",
      items: { type: "string" },
      description: "Best-guess residuals recorded in the issue. The user's veto targets on the PR",
    },
    non_goals: { type: "array", items: { type: "string" } },
    constraints: { type: "array", items: { type: "string" } },
    units: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "goal", "files", "contract", "tests", "depends_on"],
        properties: {
          id: {
            type: "string",
            description: "U-001 format. Use the ids from the issue body as-is",
          },
          goal: {
            type: "string",
            description: "One-line description of the behavior this unit delivers",
          },
          files: {
            type: "array",
            items: { type: "string" },
            description: "File paths to create or modify",
          },
          contract: {
            type: "string",
            description: "Public interface: a sketch of signatures / CLI flags / schemas",
          },
          tests: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "name", "given", "when", "then"],
              properties: {
                id: {
                  type: "string",
                  description: "T-001 format (unique across the plan)",
                },
                name: {
                  type: "string",
                  description: "Statement of the spec being verified. Becomes the test name",
                },
                given: { type: "string" },
                when: { type: "string" },
                // JSON Schema property definition, not a thenable (BDD given/when/then)
                // oxlint-disable-next-line unicorn/no-thenable
                then: { type: "string" },
              },
            },
          },
          depends_on: {
            type: "array",
            items: { type: "string" },
            description: "Ids of prerequisite units. Empty array if none",
          },
        },
      },
    },
    test_command: {
      type: "string",
      description: "Test command, e.g. cargo test / bun test",
    },
    preconditions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path"],
        properties: {
          path: {
            type: "string",
            description: "Existing file the plan presupposes",
          },
          pattern: {
            type: "string",
            description: "Symbol / string expected to exist in that file",
          },
        },
      },
      description: "Existing code the issue's plan presupposes. Empty array if none",
    },
    backlog_candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string" },
        },
      },
      description: "Out-of-scope candidates written in the issue. Empty array if none",
    },
  },
};

const REVALIDATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "pattern", "exists", "matches"],
        properties: {
          path: { type: "string" },
          pattern: { type: "string" },
          exists: { type: "boolean" },
          matches: { type: "boolean" },
        },
      },
    },
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

// Re-validation of the structured plan + non-empty content checks. Deterministically rejects
// structural defects (duplicate ids / dangling or cyclic depends_on / missing tests)
// and empty content (test_command / contract / name / given / when / then).
//
// DRY debt: this is a hand-maintained copy of validate_plan in hooks/veto/veto.py
// (the canonical plan-gate, locked by plan-gate.bats T-011). The workflow runtime wraps
// this file as an AsyncFunction body, so build.js cannot import the canonical (and it is
// Python). The copy is kept in lockstep by hooks/veto/tests/contract_build_port.py, which
// extracts the body between the two CONTRACT-TEST markers below, runs it via node, and
// asserts it returns identical errors on every shared fixture. Editing this block without
// updating the canonical (or vice versa) fails that test. Do not rename or remove the markers.
// CONTRACT-TEST-BEGIN validate
const validate = (plan) => {
  const errors = [];
  // Non-object entries get a position-based placeholder id so they surface as
  // "<id> has no ..." errors (collapsing them to one shared id would emit a
  // spurious "duplicate unit ids").
  const units = (Array.isArray(plan.units) ? plan.units : []).map((u, i) =>
    u && typeof u === "object" && !Array.isArray(u) ? u : { id: `units[${i}]` },
  );
  if (!units.length) errors.push("units is empty. Define at least one implementation unit");
  if (!String(plan.test_command || "").trim()) errors.push("test_command is empty");

  const ids = new Set(units.map((u) => u.id));
  if (ids.size !== units.length) errors.push("duplicate unit ids");

  const testIds = new Set();
  for (const [i, u] of units.entries()) {
    const tests = (Array.isArray(u.tests) ? u.tests : []).map((t, j) =>
      t && typeof t === "object" && !Array.isArray(t) ? t : { id: `units[${i}].tests[${j}]` },
    );
    const files = Array.isArray(u.files) ? u.files : [];
    const dependsOn = Array.isArray(u.depends_on) ? u.depends_on : [];
    if (!tests.length) errors.push(`${u.id} has no test scenario`);
    if (!files.length) errors.push(`${u.id} has no target files`);
    if (!String(u.goal || "").trim()) errors.push(`${u.id} has an empty goal`);
    if (!String(u.contract || "").trim()) errors.push(`${u.id} has an empty contract`);
    for (const t of tests) {
      if (testIds.has(t.id)) errors.push(`duplicate test id ${t.id}`);
      testIds.add(t.id);
      for (const field of ["name", "given", "when", "then"]) {
        if (!String(t[field] || "").trim()) errors.push(`${t.id} has an empty ${field}`);
      }
    }
    for (const d of dependsOn) {
      if (!ids.has(d)) errors.push(`${u.id}'s depends_on ${d} points to a nonexistent unit`);
    }
  }

  // Cycle detection (DFS)
  const state = new Map();
  const visit = (id, path) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      errors.push(`depends_on cycle: ${[...path, id].join(" -> ")}`);
      return;
    }
    state.set(id, "visiting");
    const u = units.find((x) => x.id === id);
    for (const d of u && Array.isArray(u.depends_on) ? u.depends_on : []) visit(d, [...path, id]);
    state.set(id, "done");
  };
  for (const u of units) visit(u.id, []);

  return errors;
};
// CONTRACT-TEST-END validate

// ---- Load: verbatim fetch -> Plan heading check -> deterministic id collection -> extract -> validate + cross-check ----
const fetched = await agent(
  anchor(
    `Fetch the body of GitHub issue ${issueRef} with a fixed command; do not summarize or reformat. ` +
      `Run exactly \`gh issue view ${issueRef} --json body --jq .body\` and return its stdout verbatim as body ` +
      `(the --jq extraction is verbatim by construction; do not edit it). If the command exits non-zero (issue not found / fetch failed), return found: false.`,
  ),
  {
    label: "fetch",
    phase: "Load",
    agentType: "general-purpose",
    schema: FETCH_SCHEMA,
    model: "haiku",
  },
);
if (!fetched || !fetched.found || !String(fetched.body || "").trim()) {
  return {
    stopped: "no-issue-body",
    why: `Could not fetch the body of issue ${issueRef}. Check the issue number and repo.`,
  };
}
const body = fetched.body;

// The Plan heading check and id collection run deterministically in the script,
// before the extract agent.
const planHeading = body.match(/^##\s+Plan\b.*$/m);
if (!planHeading) {
  return {
    stopped: "no-plan",
    why: "The issue body has no ## Plan section. Refine the plan via /issue before launching build.",
  };
}
const afterHeading = body.slice(planHeading.index + planHeading[0].length);
const nextSection = afterHeading.search(/^##[^#]/m);
const planSection = nextSection === -1 ? afterHeading : afterHeading.slice(0, nextSection);
const idSet = (re) => new Set([...planSection.matchAll(re)].map((m) => m[0]));
const bodyUnitIds = idSet(/\bU-\d{3}\b/g);
const bodyTestIds = idSet(/\bT-\d{3}\b/g);

const plan = await agent(
  anchor(
    `Extract a structured plan from the ## Plan section of the following GitHub issue body. Do not re-plan, summarize, or fill in gaps; structure exactly what is written. ` +
      `Preserve every unit id (U-NNN) and test id (T-NNN) from the body (omissions are rejected by a downstream deterministic cross-check). ` +
      `preconditions is the list of {path, pattern} of existing code the plan presupposes; backlog_candidates are out-of-scope candidates written in the issue. Empty arrays if absent from the body.\n\n---\n${body}`,
  ),
  {
    label: "extract",
    phase: "Load",
    agentType: "general-purpose",
    schema: EXTRACT_SCHEMA,
    model: "sonnet",
  },
);
if (!plan) {
  return {
    stopped: "extraction-failed",
    why: "The extract agent returned no plan.",
  };
}

const blockers = validate(plan);
if (blockers.length) {
  return {
    stopped: "invalid-plan",
    blockers,
    why: "The extracted plan fails structural validation.",
  };
}

// Reject silent drops / fabrications in extraction via exact id-set comparison.
const planUnitIds = new Set(plan.units.map((u) => u.id));
const planTestIds = new Set(plan.units.flatMap((u) => u.tests.map((t) => t.id)));
const setDiff = (a, b) => [...a].filter((x) => !b.has(x));
const mismatch = {
  units_missing: setDiff(bodyUnitIds, planUnitIds),
  units_extra: setDiff(planUnitIds, bodyUnitIds),
  tests_missing: setDiff(bodyTestIds, planTestIds),
  tests_extra: setDiff(planTestIds, bodyTestIds),
};
if (Object.values(mismatch).some((l) => l.length)) {
  return {
    stopped: "extraction-mismatch",
    detail: mismatch,
    why: "The U/T id sets in the issue body and the extraction do not match.",
  };
}
log(
  `Plan extracted: ${plan.units.length} unit(s), ${planTestIds.size} test scenario(s), id cross-check pass.`,
);

// ---- Revalidate: re-verify preconditions against the current codebase (deterministic script gate) ----
// Catches, fail-closed, the possibility that the presupposed code moved between issue
// filing and build launch. The exists/matches verdict is produced by the deterministic
// verifier workflows/build/revalidate.py, not by LLM judgment: the check (test -f + literal
// grep) needs no reasoning, only shell access the workflow runtime lacks, so the agent is a
// pure launcher that pipes the preconditions in and echoes the verifier's stdout back. The
// drift decision then stays in the script's filter below.
// Runs in parallel with Branch (checkout): the two are mutually independent (both
// depend only on plan). Trade-off: if Revalidate stops on drift, the checked-out
// branch is left behind (creation only, no commits, so reclaiming it is trivial).
// The stopped returns include branch to surface it.
phase("Revalidate");
const preconditions = plan.preconditions || [];
const [reval, branch] = await parallel([
  () =>
    preconditions.length
      ? agent(
          anchor(
            `Re-verify the plan's preconditions with the deterministic verifier; do not judge exists/matches yourself. ` +
              `The steps are, (1) write this exact JSON to a temp file; (2) from the repository root run ` +
              `\`python3 "$HOME/.claude/workflows/build/revalidate.py" < <tempfile>\`; ` +
              `(3) return the verifier's stdout "results" array verbatim (all ${preconditions.length} entries, unchanged; do not add, drop, or edit any). ` +
              `The verifier prints {"results":[{path,pattern,exists,matches}]}.\n` +
              `The preconditions JSON is as follows.\n${JSON.stringify(preconditions)}`,
          ),
          {
            label: "revalidate",
            phase: "Revalidate",
            agentType: "general-purpose",
            schema: REVALIDATE_SCHEMA,
            model: "haiku",
          },
        )
      : Promise.resolve(null),
  () =>
    agent(
      anchor(
        `Check out a new git working branch for issue #${issueNumber} "${plan.outcome}". Pick a conventional branch name (type + short slug) and run git checkout -b with it. If already on a non-default branch, keep the current branch. Report the branch name as your final text.${guard}`,
      ),
      {
        label: "checkout",
        phase: "Branch",
        agentType: "general-purpose",
        model: "haiku",
      },
    ),
]);
if (preconditions.length) {
  if (!reval || !Array.isArray(reval.results)) {
    return {
      stopped: "revalidate-failed",
      detail: reval,
      branch,
      why: "The revalidate agent returned no results array.",
    };
  }
  // Bind each precondition to its result by (path, pattern) rather than trusting a
  // bare count: a launcher that reorders, drops-and-duplicates, or substitutes an
  // entry keeps the length identical, so a count check alone would mask a real drift.
  // A precondition with no matching exists&&matches result (missing or failed) is drift.
  const keyOf = (o) => JSON.stringify([o.path, o.pattern || ""]);
  const resultByKey = new Map(reval.results.map((r) => [keyOf(r), r]));
  const drift = [];
  for (const pc of preconditions) {
    const r = resultByKey.get(keyOf(pc));
    if (!r) drift.push({ ...pc, exists: false, matches: false, missing: true });
    else if (!r.exists || !r.matches) drift.push(r);
  }
  if (drift.length) {
    return {
      stopped: "plan-drift",
      drift,
      branch,
      why: "Code the issue's plan presupposes is absent from the current codebase. Update the issue and relaunch.",
    };
  }
  log(`Revalidate: all ${preconditions.length} precondition(s) pass.`);
}

// The checkout agent already ran in parallel with Revalidate above; emit the phase
// marker here, after the drift gate, so the observable trace stays
// Load → Revalidate → Branch → Code (and plan-drift stops never reach Branch).
phase("Branch");

// ---- Code: delegated to workflow("code") (per-unit Red -> Green + independent verify) ----
// preconditions / backlog_candidates are consumed on the build side, so code receives
// only the PLAN_SCHEMA equivalent.
phase("Code");
const stripPreconditions = (p) =>
  Object.fromEntries(
    Object.entries(p).filter(([k]) => k !== "preconditions" && k !== "backlog_candidates"),
  );
const code =
  (await workflow("code", {
    plan: stripPreconditions(plan),
    repo,
    model: "sonnet",
  })) || null;
if (!code || code.stopped) {
  return { stopped: "code-failed", detail: code, planning: plan.dir };
}
if (!code.tests_pass || !code.gates_pass)
  log(
    `code's independent verify failed (tests=${code.tests_pass} gates=${code.gates_pass}). Advancing to audit; it surfaces on the PR.`,
  );

// ---- Audit ∥ Polish review ∥ Conformance -> fix -> re-audit loop (at most 3 audit runs) ----
// The audit fan-out is owned by workflow("audit") (/audit's glob routing table +
// reviewer -> challenge -> verify -> integrate). No scope is passed, so it routes
// the uncommitted diff, i.e. the whole implementation. The code phase already got
// tests green, so preflight is skipped. Polish's review mode is read-only, so the
// external Codex lens runs on the same diff alongside the audit.
// reviewer-conformance checks the Spec axis independently: does the implementation
// match the issue's Plan? Its findings are a separate axis from the quality findings,
// so the consumer must NOT merge or rerank them into toFix / residualBlocking; they
// surface in a dedicated PR section instead (reviewer-conformance's Posture).
const CONFORMANCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["spec_found", "findings"],
  properties: {
    spec_found: {
      type: "boolean",
      description: "true when a spec to conform against (the issue's Plan) was found and reviewed",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "spec_line", "location", "detail"],
        properties: {
          category: {
            type: "string",
            enum: ["missing", "scope_creep", "wrong"],
            description: "missing/partial, scope creep, or implemented-but-wrong",
          },
          spec_line: {
            type: "string",
            description: "the quoted spec / issue line the finding is about",
          },
          location: {
            type: "string",
            description: "file:line in the diff, or the scope-creep location",
          },
          detail: { type: "string" },
        },
      },
    },
  },
};
phase("Audit");
const [audit0, review, conformance] = await parallel([
  () => workflow("audit", { repo, skipPreflight: true }),
  () => workflow("polish", { repo, mode: "review" }),
  () =>
    agent(
      anchor(
        `Conformance review against the originating issue. The spec is GitHub issue #${issueNumber}: ` +
          `read it with \`gh issue view ${issueNumber}\`. The implementation to review is the UNCOMMITTED ` +
          `working-tree diff (this build has not committed yet), so use \`git diff HEAD\` plus the untracked ` +
          `files (new test/impl files) shown by \`git status --porcelain\`. ` +
          `Do NOT use main...HEAD (HEAD is still the branch point). Report the 3 categories ` +
          `(missing/partial, scope creep, implemented-but-wrong) with the spec line quoted. ` +
          `If no spec is available, return spec_found=false with an empty findings array.`,
      ),
      {
        label: "conformance",
        phase: "Audit",
        agentType: "reviewer-conformance",
        schema: CONFORMANCE_SCHEMA,
      },
    ),
]);
const conf = conformance || { spec_found: false, findings: [] };
log(
  conf.spec_found
    ? `conformance: ${conf.findings.length} spec deviation(s) (independent axis, surfaced in a separate PR section).`
    : "conformance: no spec to conform against found, skipped.",
);
let audit = audit0 || { findings: [] };
log(
  `Audit fired ${(audit.assignments || []).length} reviewer group(s); polish lens ${review && review.codex_available ? "active" : "inactive"}.`,
);
const criticalHigh = (a) =>
  (a.findings || []).filter((f) => f.severity === "critical" || f.severity === "high");
const polishSurvivors = ((review && review.survivors) || []).map((f) => ({
  severity: f.severity === "P1" ? "high" : "medium",
  summary: `${f.title}: ${f.detail}`,
  file: f.file || "",
}));
// Loop fix -> re-audit until 0 critical/high. The old version fixed once with no
// re-audit, i.e. the fixes were never verified. Only the final round's fixes stay
// unverified (the re-audit budget is spent) and surface on the PR.
let toFix = [...criticalHigh(audit), ...polishSurvivors];
let reaudited = true;
for (let round = 1; round <= 3 && toFix.length; round++) {
  log(`Fix round ${round}: fixing ${toFix.length} finding(s).`);
  await agent(
    anchor(
      `Fix these review findings and confirm tests pass. The findings are as follows.\n${JSON.stringify(toFix)}`,
    ),
    {
      agentType: "general-purpose",
      phase: "Audit",
      label: `fix:${round}`,
      model: "sonnet",
    },
  );
  if (round === 3) {
    reaudited = false;
    log("Fix round cap reached. The final round's fixes are not re-audited and surface on the PR.");
    break;
  }
  audit = (await workflow("audit", { repo, skipPreflight: true })) || {
    findings: [],
  };
  toFix = criticalHigh(audit);
}
// When re-audited, criticalHigh(audit) is the (empty, by loop exit) verified set.
// When the round cap was hit (reaudited === false), toFix holds the final round's
// critical/high findings that were fixed but never re-audited. Surface them so the
// PR enumerates the possibly-unresolved blockers instead of only a generic warning.
const residualBlocking = reaudited ? criticalHigh(audit) : toFix;

// ---- Polish: cleanup only (simplify -> enhancer-code -> test validation) ----
// The review lens was consumed in the Audit phase, so only the mutators run here.
phase("Polish");
const cleanup = await workflow("polish", { repo, mode: "cleanup" });

// ---- Backlog: collect out-of-scope discoveries as candidates for the user ----
// Candidate sources are the out-of-scope candidates written in the issue body
// (source: issue) plus discoveries during the build (code / audit / polish). The
// build deliberately does not file these itself: auto-posting from a headless run
// mass-produces under-refined, duplicate-prone issues and erodes trust in the
// automation. Issue creation is instead deferred to the final output. The
// candidates are surfaced in the PR body and the return value, and the user files
// the ones worth filing via /issue, which carries the premise-check /
// challenge refinement build expects from an issue.
phase("Backlog");
// code.anomalies are NOT folded in here: they are Red-unconfirmed build-integrity
// signals, rendered once under the PR's dedicated "Anomalies" section (via
// shipPayload.code_anomalies). Folding them here too listed every anomaly twice.
const backlogCandidates = [
  ...(plan.backlog_candidates || []).map((c) => ({ ...c, source: "issue" })),
  ...(audit.findings || [])
    .filter((f) => f.severity === "medium" || f.severity === "low")
    .map((f) => ({
      source: "audit",
      summary: f.summary,
      file: f.file,
      severity: f.severity,
    })),
  ...((review && review.needs_context) || []).map((f) => ({
    source: "polish",
    summary: `${f.title}: ${f.why || f.detail}`,
  })),
];
if (backlogCandidates.length) {
  log(
    `Backlog: ${backlogCandidates.length} out-of-scope candidate(s) surfaced for the user to file via /issue.`,
  );
}

// ---- Ship: commit + draft PR (outward-facing, so draft = reversible) ----
// The PR is read by human reviewers, so its body pairs two parts with different
// owners. The lead Summary (what this PR does, why, and where to look) is genuinely
// generative and is the reviewer's entry point, so the agent writes it (like the
// commit message). Below it sits a fail-closed relay of structured facts the script
// already holds (assumptions / backlog candidates / unresolved findings /
// not-re-audited warning / verify result); only that tail is delegated to the
// deterministic renderer workflows/build/pr-body.py, so a fact section is never
// silently dropped or softened. The agent appends the rendered tail rather than
// retyping it, and chains the append with `gh pr create` via `&&` so that if the
// renderer fails (malformed / missing-field payload → exit 1, no output) the PR is
// not created at all, rather than shipping one missing the fail-closed tail. The
// pass/fail gating of the verify log lives only in pr-body.py (it reads
// verify_output solely on failure), so the payload passes it through unconditionally.
phase("Ship");
const shipPayload = {
  issue: issueNumber,
  assumptions: plan.assumptions || [],
  backlog_candidates: backlogCandidates,
  residual_blocking: residualBlocking,
  reaudited,
  code_anomalies: code.anomalies || [],
  tests_pass: code.tests_pass,
  gates_pass: code.gates_pass,
  verify_output: code.verify_output || "",
  conformance: conf.spec_found ? conf.findings : [],
};
const ship = await agent(
  anchor(
    `Turn all changes (planning artifacts + implementation) into a single Conventional Commits commit; you write the commit message (summarize the diff). ` +
      `Push the branch, then open a draft pull request. Its body is a human-facing Summary you write, followed by deterministic fact sections rendered from data (do not hand-write the fact sections). The steps are as follows.\n` +
      `(1) write a terse "## Summary" to a body file for the human reviewer, in markdown bullets rather than prose paragraphs. Cover what this PR implements (the outcome is ${JSON.stringify(plan.outcome)}), the approach in a line, and where to focus review. At most ~5 bullets; no filler, no invented facts.\n` +
      `(2) write this exact JSON to a temp file.\n${JSON.stringify(shipPayload)}\n` +
      `(3) append the fact tail and open the PR as ONE \`&&\` chain, so a renderer failure aborts before the PR is created; from the repository root run ` +
      `\`python3 "$HOME/.claude/workflows/build/pr-body.py" < <tempfile> >> <bodyfile> && gh pr create --draft --title "<your commit subject>" --body-file <bodyfile>\`.\n` +
      `pr-body.py exits non-zero (writing nothing) if the payload is malformed or missing a required field; if the chain fails, do NOT create the PR by other means. Report committed with an empty pr_url and the error instead, so the missing fact tail surfaces rather than shipping a PR without it.\n` +
      `Report the committed state and the PR url.${guard}`,
  ),
  {
    label: "ship",
    phase: "Ship",
    agentType: "general-purpose",
    schema: SHIP_SCHEMA,
    model: "sonnet",
  },
);

return {
  issue: issueNumber,
  branch,
  planning: plan.dir,
  units_completed: code.completed.length,
  code_anomalies: (code.anomalies || []).length,
  code_verified: code.tests_pass && code.gates_pass,
  audit_findings: (audit.findings || []).length,
  residual_blocking: residualBlocking.length,
  conformance_findings: (conf.findings || []).length,
  polish_cleanup: cleanup && cleanup.cleanup ? cleanup.cleanup.tests_pass : null,
  backlog_candidates: backlogCandidates,
  assumptions: plan.assumptions,
  pr_url: ship.pr_url,
  committed: ship.committed,
};
