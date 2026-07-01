export const meta = {
  name: "audit",
  description:
    'Deterministic audit fan-out. File routing (glob table) runs in the script, so reviewer selection cannot drift; git I/O and each reviewer / critic run as agents. Pipeline is reviewer -> challenge -> verify -> integrate, not reviewer -> aggregate. Callable standalone or nested from build via workflow("audit").',
  whenToUse:
    "Run when a diff needs the full adversarial reviewer set fired every time, not left to the main loop's discretion. The interactive /audit skill stays the launcher (focus / scope prompts); this workflow owns the fan-out.",
  phases: [
    { title: "Pre-flight" },
    { title: "Route" },
    { title: "Review" },
    { title: "Challenge" },
    { title: "Verify" },
    { title: "Integrate" },
    { title: "Snapshot" },
  ],
};

// Why routing lives in the script, not an agent: /audit assigns reviewers by a
// pure glob table (extension -> reviewer list). An agent re-deriving that table
// would reintroduce the exact drift this workflow exists to remove. So the table
// is ported to JS and applied deterministically; agents only do what needs a
// tool (git diff / log) or a judgement (the reviews themselves). Reviewers run
// on sonnet, mirroring /audit's hard-won lesson: opus + deep analysis stalls the
// stream watchdog. Pilot cut, logged not silent: reviewer-causation (5 Whys over
// all findings) and multi-run aggregation are deferred until the seam is proven.

// args may arrive as an object (preferred) or, if a caller stringifies it, as a
// JSON-encoded string. Normalize once so scope does not swallow the whole blob
// and focus / repo / skipPreflight stay readable regardless of how it was passed:
// a string that parses to an object is that object; any other string is the
// scope shorthand.
const opts = (() => {
  if (typeof args === "object" && args) return args;
  if (typeof args !== "string") return {};
  const s = args.trim();
  if (s.startsWith("{")) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // malformed JSON: fall through and treat the raw string as scope
    }
  }
  return { scope: args };
})();

const scope = typeof opts.scope === "string" ? opts.scope : "";
const focus = typeof opts.focus === "string" ? opts.focus : "all";
const repo = typeof opts.repo === "string" ? opts.repo : "";
// noLimit skips the >30-file guard; skipPreflight lets a caller (build, whose
// Code phase already drove tests to green) suppress the redundant test run.
const noLimit = opts.noLimit === true;
const skipPreflight = opts.skipPreflight === true;
const anchor = (p) =>
  repo
    ? `Run every git command from the repository at ${repo} (begin each shell command with \`cd ${repo} && \`).\n\n${p}`
    : p;

// Snapshot persistence is a disk side-effect, not part of the return contract.
// The script cannot touch the filesystem or call Date.now() (both throw / are
// blocked in the sandbox), so a bash agent stamps the timestamp with `date -u`,
// reads $CLAUDE_SESSION_ID and the branch, computes the delta against the most
// recent prior snapshot, and writes the file. Its result is not consumed.
const writeSnapshot = async ({ preFlight, rawFindings, findings, skipped }) => {
  phase("Snapshot");
  const payload = JSON.stringify({
    scope: scope || "HEAD",
    focus,
    pre_flight: preFlight,
    raw_findings: rawFindings,
    findings,
    skipped,
  });
  await agent(
    anchor(
      `You are the snapshot stage of an audit. Write a JSON record of this run to ` +
        `"$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).json" (mkdir -p the directory first). ` +
        `Start from this payload and add three fields you resolve via shell: "session" from $CLAUDE_SESSION_ID, ` +
        `"branch" from \`git rev-parse --abbrev-ref HEAD\`, and "generated_at" from \`date -u +%Y-%m-%dT%H:%M:%SZ\`. ` +
        `Also add "delta": compare this run's raw_findings to the most recent existing audit-*.json in that directory ` +
        `(match on file + message) and record { resolved, new, carried } as counts; if no prior snapshot exists, use zeros and note "first run". ` +
        `Do not review code or change any finding. Payload:\n${payload}`,
    ),
    {
      agentType: "general-purpose",
      phase: "Snapshot",
      label: "snapshot",
      model: "sonnet",
    },
  );
};

// /audit routing table, ported then language-split. strictness targets typed
// files (ts / tsx); react-pattern targets JSX files (jsx / tsx). Plain js / ts
// get neither, so a pure-js audit no longer fires those two on empty. Heuristic,
// not a guarantee: React written without JSX loses react-pattern. Keys are
// matched against each file by the classify() rules below; a file takes the
// first matching row.
const ROUTING = {
  "*.sh": [
    "security",
    "silence",
    "duplication",
    "reuse",
    "efficiency",
    "operations",
    "resilience",
  ],
  "*.js": [
    "security",
    "silence",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "testability",
    "performance",
    "operations",
    "resilience",
  ],
  "*.ts": [
    "security",
    "silence",
    "strictness",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "testability",
    "performance",
    "operations",
    "resilience",
  ],
  "*.jsx": [
    "security",
    "silence",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "react-pattern",
    "testability",
    "performance",
    "operations",
    "resilience",
    "accessibility",
    "progressive",
  ],
  "*.tsx": [
    "security",
    "silence",
    "strictness",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "react-pattern",
    "testability",
    "performance",
    "operations",
    "resilience",
    "accessibility",
    "progressive",
  ],
  "*.rs": [
    "security",
    "silence",
    "rust",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "testability",
    "performance",
    "operations",
    "resilience",
  ],
  "*.py": [
    "security",
    "silence",
    "strictness",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "testability",
    "performance",
    "operations",
    "resilience",
  ],
  "*.md": ["prompt", "document"],
  "*.yaml,*.json": ["encapsulation", "document"],
  "*.css,*.html": [
    "accessibility",
    "progressive",
    "performance",
    "duplication",
  ],
  test: ["coverage", "testability"],
  default: ["duplication", "reuse", "efficiency", "document"],
};

// /audit focus filter. Final per-file set = routed reviewers intersect focus set.
const FOCUS = {
  security: ["security", "silence"],
  performance: ["performance", "efficiency", "progressive"],
  quality: [
    "readability",
    "design",
    "react-pattern",
    "strictness",
    "rust",
    "encapsulation",
    "causation",
    "resilience",
    "duplication",
    "reuse",
    "testability",
    "operations",
    "document",
    "prompt",
    "silence",
  ],
  a11y: ["accessibility", "progressive"],
  all: null,
};

const ext = (p) => {
  const base = p.slice(p.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot).toLowerCase() : "";
};
const classify = (p) => {
  if (/(^|\/|\.)test\./.test(p)) return ROUTING.test;
  const e = ext(p);
  if (e === ".sh") return ROUTING["*.sh"];
  if (e === ".js") return ROUTING["*.js"];
  if (e === ".ts") return ROUTING["*.ts"];
  if (e === ".jsx") return ROUTING["*.jsx"];
  if (e === ".tsx") return ROUTING["*.tsx"];
  if (e === ".rs") return ROUTING["*.rs"];
  if (e === ".py") return ROUTING["*.py"];
  if (e === ".md") return ROUTING["*.md"];
  if (e === ".yaml" || e === ".yml" || e === ".json")
    return ROUTING["*.yaml,*.json"];
  if (e === ".css" || e === ".html") return ROUTING["*.css,*.html"];
  return ROUTING.default;
};

const FINDINGS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "line", "severity", "summary"],
        properties: {
          file: { type: "string" },
          line: { type: "string" },
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          summary: { type: "string" },
        },
      },
    },
  },
};

const ROUTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["files"],
  properties: {
    files: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "churn"],
        properties: {
          path: { type: "string", description: "repo-relative path" },
          churn: {
            type: "integer",
            description: "count of fix commits touching this file",
          },
        },
      },
    },
  },
};

const PREFLIGHT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ran"],
  properties: {
    ran: {
      type: "boolean",
      description: "true if a test command was found and executed",
    },
    runner: { type: "string", description: "detected task runner, or empty" },
    command: { type: "string", description: "test command run, or empty" },
    tests_passed: { type: "integer" },
    tests_failed: { type: "integer" },
    exit_code: { type: "integer" },
    note: {
      type: "string",
      description: "one line: skip reason, timeout, or summary",
    },
  },
};

// ---- Pre-flight ∥ Route: two independent stages, one barrier ----
// Pre-flight runs the test suite (test I/O); Route lists changed files + churn
// (git I/O). They share no data, so running them concurrently costs only
// max(preflight, route) instead of the serial sum. Bare phase() races under
// parallel(), so each thunk names its own group via opts.phase.
const scopeInstr = scope
  ? `Scope is "${scope}". Run \`git diff --name-only ${scope}\` for the file list.`
  : `No scope given. List staged + modified files: union of \`git diff --name-only HEAD\` and \`git diff --name-only --staged\`.`;
const [preFlightRaw, route] = await parallel([
  // Pre-flight: tests-only by design. Static analysis is the gates hook's job
  // (running linters here would duplicate it and invent behavior the /audit
  // skill forbids). A test failure is recorded as context but does NOT block and
  // does NOT become a finding. Skipped when a caller already drove tests to
  // green (build's Code phase), so the nested run does not re-run the suite.
  async () => {
    if (skipPreflight) return { ran: false, note: "skipped by caller" };
    const pf = (await agent(
      anchor(
        `You are the pre-flight stage of an audit. Detect the project's task runner (package.json -> npm/yarn/pnpm/bun, Cargo.toml -> cargo, pyproject.toml -> poetry/uv, Makefile -> make, Taskfile.yml -> task), find its test script (try test, test:unit, test:ci, spec in order; fall back to \`command -v\` for vitest/jest/pytest/cargo test), and run it once with a 60-second timeout. Record pass/fail counts and the exit code. A non-zero exit or a timeout is recorded, not blocked; do not fix anything and do not review code. If no runner or test script is found, return ran=false with the reason in note.`,
      ),
      {
        agentType: "general-purpose",
        phase: "Pre-flight",
        label: "pre-flight",
        model: "sonnet",
        schema: PREFLIGHT_SCHEMA,
      },
    )) || { ran: false, note: "pre-flight agent returned no output" };
    log(
      pf.ran
        ? `Pre-flight: ${pf.command} -> ${pf.tests_passed || 0} passed, ${pf.tests_failed || 0} failed (exit ${pf.exit_code}).`
        : `Pre-flight skipped: ${pf.note}`,
    );
    return pf;
  },
  // Route: list changed files + churn, then map to reviewers in JS below.
  () =>
    agent(
      anchor(
        `You are the routing stage of an audit. ${scopeInstr}\n` +
          `For each file, count how many past fix commits touched it: \`git log --grep=fix --oneline -- <file>\` and read the line count as churn (0 is fine, keep the file). Return every file with its churn. Do not review anything; this stage only lists files.`,
      ),
      { label: "route", phase: "Route", schema: ROUTE_SCHEMA },
    ),
]);
const preFlight = preFlightRaw || {
  ran: false,
  note: "pre-flight stage failed",
};

const files = ((route && route.files) || []).filter((f) => f.path);
if (!files.length) {
  return {
    findings: [],
    skipped: [],
    why: "No files to audit for the given scope.",
  };
}

// Deterministic routing: reviewer -> assigned files, then focus filter.
const focusSet = FOCUS[focus] === undefined ? null : FOCUS[focus];
const assign = {};
for (const f of files) {
  for (const r of classify(f.path)) {
    if (focusSet && !focusSet.includes(r)) continue;
    (assign[r] = assign[r] || []).push(f.path);
  }
}
const assignments = Object.entries(assign).map(([reviewer, fs]) => ({
  reviewer,
  files: fs,
}));

// File-count policy. The interactive /audit prompts to narrow scope past 30
// files; headless has no prompt, so warn loudly and continue (the deterministic
// half of the policy is the batch-split below, which bounds per-agent load).
// --no-limit / an explicit scope suppress the warning.
if (files.length > 30 && !scope && !noLimit) {
  log(
    `File-count policy: ${files.length} files exceed the soft limit of 30 and no scope was given. Continuing headless (no narrow-scope prompt); pass a scope or noLimit to silence this.`,
  );
}

// Batch-split: cap each agent at 10 files so a reviewer with a wide assignment
// fans out into several bounded units instead of one overloaded call. Units
// carry their reviewer label so skips and raw_findings stay attributable after
// the parallel results are flattened.
const BATCH = 10;
const units = [];
for (const a of assignments) {
  if (a.files.length <= BATCH) {
    units.push({ reviewer: a.reviewer, files: a.files, label: a.reviewer });
  } else {
    for (let i = 0; i < a.files.length; i += BATCH) {
      units.push({
        reviewer: a.reviewer,
        files: a.files.slice(i, i + BATCH),
        label: `${a.reviewer}#${i / BATCH + 1}`,
      });
    }
  }
}
const churnMap = files
  .slice()
  .sort((a, b) => b.churn - a.churn)
  .map((f) => `${f.path}: ${f.churn}`)
  .join("\n");
log(
  `Routed ${files.length} file(s) to ${assignments.length} reviewer(s) in ${units.length} unit(s) [focus=${focus}]: ${assignments
    .map((a) => a.reviewer)
    .join(", ")}`,
);

// ---- Review: every routed reviewer fires, in parallel, on sonnet ----
phase("Review");
const RELIABILITY =
  "Do NOT call the advisor tool; work autonomously from your own analysis. Complete within 8 minutes; if uncertain about a finding, include it rather than skip (the challenger prunes false positives). When the scope spans several files, follow the high-churn paths and do not spend the whole budget on the first file.";
const raw = await parallel(
  units.map(
    (u) => () =>
      agent(
        anchor(
          `reviewer-${u.reviewer}. Review these files from the diff: ${u.files.join(", ")}. ` +
            `Base the review on \`git diff ${scope || "HEAD"}\` for those paths. Every finding needs file:line. Return findings with severity.\n` +
            `Churn (fix-commit counts, high = fragile):\n${churnMap}\n\n${RELIABILITY}`,
        ),
        {
          agentType: `reviewer-${u.reviewer}`,
          phase: "Review",
          label: u.label,
          model: "sonnet",
          schema: FINDINGS_SCHEMA,
        },
      ),
  ),
);
const findings = raw.filter(Boolean).flatMap((r) => r.findings || []);
// raw_findings keeps per-reviewer attribution for the snapshot, captured before
// the flatten above drops which unit produced what.
const rawFindings = [];
units.forEach((u, i) => {
  const res = raw[i];
  if (res && res.findings) {
    for (const f of res.findings) {
      rawFindings.push({
        id: `R-${rawFindings.length + 1}`,
        reviewer: u.reviewer,
        file: f.file,
        line: f.line,
        severity: f.severity,
        message: f.summary,
      });
    }
  }
});
// Skip accounting is per-unit, not per-reviewer. A reviewer split into several
// units can have one unit stall while its siblings return; keying the skip on
// the reviewer would set "produced" from any surviving unit and hide the files
// the stalled unit never reviewed. Record each failed unit with its files so the
// unreviewed gap stays visible in the snapshot.
const skipped = units
  .filter((_, i) => !raw[i])
  .map((u) => ({
    reviewer: u.reviewer,
    label: u.label,
    files: u.files,
    reason: "no output / stall",
  }));

if (!findings.length) {
  await writeSnapshot({ preFlight, rawFindings, findings: [], skipped });
  return { findings: [], assignments, skipped };
}

// ---- Challenge ∥ Verify -> Integrate (reviewer -> aggregate is forbidden) ----
// Challenge and Verify are independent passes over the SAME findings, keyed by
// file:line, so they run concurrently. Serial today, verify only saw survivors;
// running on the full set makes verify's cost scale with the prune rate, which
// is acceptable while that rate stays low. Integrate reconciles with a fixed
// rule that reproduces serial membership exactly (see its prompt), so this is a
// latency win with zero quality delta. Bare phase() races under parallel(); each
// thunk names its group via opts.phase.
const findingsJson = JSON.stringify(findings);
const [challenged, verified] = await parallel([
  () =>
    agent(
      anchor(
        `critic-audit. Challenge these findings to prune false positives. Each finding is a position to be argued, not a fact. Reference each finding by its file:line. Findings:\n${findingsJson}`,
      ),
      { agentType: "critic-audit", phase: "Challenge", label: "challenge" },
    ),
  () =>
    agent(
      anchor(
        `critic-evidence. Verify these findings by tracing concrete execution paths (positive evidence, not intuition). For each finding, reference it by file:line and supply the execution-path evidence plus a severity. Findings:\n${findingsJson}`,
      ),
      { agentType: "critic-evidence", phase: "Verify", label: "verify" },
    ),
]);

phase("Integrate");
const integrated = await agent(
  anchor(
    `team-integration. Reconcile two independent passes over the same findings, matched by file:line, into cross-domain root causes and a severity-ordered list.\n` +
      `Membership rule: the challenge pass decides which findings survive. A finding the challenge pass pruned as a false positive stays pruned even if the verification pass found evidence for it. The verification pass only supplies execution-path evidence and severity for the survivors; it never revives a pruned finding.\n` +
      `Challenge pass (membership / false-positive pruning):\n${challenged}\n\n` +
      `Verification pass (execution-path evidence + severity):\n${verified}`,
  ),
  {
    agentType: "team-integration",
    phase: "Integrate",
    label: "integrate",
    schema: FINDINGS_SCHEMA,
  },
);

const finalFindings = (integrated && integrated.findings) || findings;
await writeSnapshot({
  preFlight,
  rawFindings,
  findings: finalFindings,
  skipped,
});
return { findings: finalFindings, assignments, skipped };
