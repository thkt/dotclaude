export const meta = {
  name: "adrift",
  description:
    "Deterministic workflow that scans for drift between ADR Decision Outcomes and the current code. Per ADR, it pipelines symbol extraction -> reference search -> semantic matching by manifest-routed reviewers, and writes a report with file:line + fix direction + priority to docs/audit/. Exhaustive per-ADR listing and the reviewer routing table are enforced by the script.",
  whenToUse:
    'When you want to check ADR-code consistency or surface decayed decisions. For repositories without ADRs, run census first. args is an ADR directory path string, an ADR id list string (e.g. "0061, 0073"), or {dir, repo, focus}. focus is an array or string of ids / keywords narrowing the target ADRs. When omitted, every ADR under docs/decisions/ is in scope.',
  phases: [{ title: "Detect" }, { title: "Scan" }, { title: "Report" }],
};

// Four design points.
// 1. The manifest -> reviewer routing table becomes a script constant. Letting the LLM choose
//    lets it skip reviewer routing; the workflow looks it up mechanically from the manifest verdict.
// 2. Per-ADR extract -> search -> review runs through pipeline() independently (the slowest ADR
//    does not block the rest). An extract stall is recorded as unverifiable so it never drops
//    out of the exhaustive Per-ADR listing (fail-close).
// 3. Finding dedup, priority merge, and Summary counts are computed by the script.
// 4. No external assets. External ADR references are classified by a raw agent search + a
//    script set difference, and the report structure is embedded in the Report prompt.
//
// H-priority findings cannot be confirmed for /issue filing (interactive) mid-workflow, so they
// are recorded in the report's Follow-up Issue Candidates and the return value for human triage.

const isIdList = (s) => {
  const tokens = s.split(/[\s,]+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => /^(adr-?)?\d+$/i.test(t));
};

const parseArgs = () => {
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // a non-JSON string is shorthand: an id list like "0061" or
      // "ADR-0061, 0073" means focus, anything else means dir
    }
    return isIdList(args) ? { focus: args } : { dir: args };
  }
  return args && typeof args === "object" ? args : {};
};
const opts = parseArgs();
const dir = typeof opts.dir === "string" ? opts.dir.trim() : "";
const repo = typeof opts.repo === "string" ? opts.repo : "";

// focus is a list of ids ("0061" / "ADR-0061") or keywords, accepted as array or string.
// Ids match numerically; non-numeric tokens substring-match against file name / title.
const focus = (Array.isArray(opts.focus) ? opts.focus : String(opts.focus || "").split(/[\s,]+/))
  .map((t) =>
    String(t)
      .trim()
      .replace(/^adr-?/i, ""),
  )
  .filter(Boolean);
const matchesFocus = (a) =>
  focus.some((t) =>
    /^\d+$/.test(t)
      ? parseInt(t, 10) === parseInt(a.id, 10)
      : `${a.file} ${a.title}`.toLowerCase().includes(t.toLowerCase()),
  );

const anchor = (p) =>
  repo
    ? `Run every git / file / search command from the ${repo} repository (start each shell command with \`cd ${repo} && \`).\n\n${p}`
    : p;

// Routing table that looks up reviewer subagents mechanically from the manifest verdict.
const REVIEWERS = {
  rust: ["reviewer-rust", "reviewer-design"],
  ts: ["reviewer-design"],
  tsx: ["reviewer-react-pattern"],
  other: ["reviewer-design"],
};

// Criteria embedded into reviewer prompts (kept as plain string consts because guardrails
// sqli-concat false-positives on keyword words inside interpolated template call arguments).
const DIRECTION_RULES =
  "code-fix when the ADR is the correct current contract and the code has drifted / " +
  "adr-update when the code is the correct current contract and the ADR is stale / " +
  "accept when the drift is trivial, already marked deprecated in a comment, or documented";
const PRIORITY_RULES =
  "H when it affects a public API or 2+ downstream consumers / " +
  "M when it affects an internal API with 1 downstream consumer / " +
  "L when it is comment / docstring only, or an invalid reference";
const PRIORITY_RANK = { H: 3, M: 2, L: 1 };

const DETECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["found", "adr_dir", "adrs", "manifest", "adr_refs"],
  properties: {
    found: { type: "boolean" },
    adr_dir: { type: "string" },
    adrs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "file", "title"],
        properties: {
          id: { type: "string" },
          file: { type: "string" },
          title: { type: "string" },
        },
      },
    },
    manifest: { type: "string", enum: ["rust", "ts", "tsx", "other"] },
    adr_refs: {
      type: "array",
      description:
        "Raw list of ADR-NNNN references found outside the ADR directory (the script classifies them)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "line", "id"],
        properties: {
          file: { type: "string" },
          line: { type: "number" },
          id: { type: "string", description: "NNNN (4 digits)" },
        },
      },
    },
    reason: { type: "string" },
  },
};

const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "verifiable", "outcome_text", "symbols", "candidates"],
  properties: {
    status: { type: "string", description: "Accepted / Superseded etc." },
    superseded_by: { type: "string" },
    verifiable: { type: "boolean", description: "false for prose-only ADRs" },
    outcome_text: {
      type: "string",
      description: "Decision Outcome section body",
    },
    symbols: { type: "array", items: { type: "string" } },
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["symbol", "file", "line"],
        properties: {
          symbol: { type: "string" },
          file: { type: "string" },
          line: { type: "number" },
        },
      },
    },
    notes: { type: "string" },
  },
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
        required: ["file", "line", "summary", "direction", "priority"],
        properties: {
          file: { type: "string" },
          line: { type: "number" },
          summary: { type: "string" },
          direction: {
            type: "string",
            enum: ["code-fix", "adr-update", "accept"],
          },
          priority: { type: "string", enum: ["H", "M", "L"] },
        },
      },
    },
  },
};

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["written", "report_path"],
  properties: {
    written: { type: "boolean" },
    report_path: { type: "string" },
  },
};

const mergeFindings = (lists) => {
  const map = new Map();
  for (const f of lists.flat()) {
    const k = `${f.file}:${f.line}`;
    const prev = map.get(k);
    if (!prev || PRIORITY_RANK[f.priority] > PRIORITY_RANK[prev.priority]) map.set(k, f);
  }
  return [...map.values()].sort(
    (a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      String(a.file).localeCompare(String(b.file)) ||
      a.line - b.line,
  );
};

// ---- Detect: find the ADR directory / manifest / ADR references ----
phase("Detect");
const dirInstr = dir
  ? `The ADR directory is "${dir}" (relative to the repository root). If it does not exist, return found: false and say why in reason.`
  : `Only docs/decisions/ is in scope as the ADR directory. If it does not exist, return found: false.`;
const detect = (await agent(
  anchor(
    `You handle the Detect stage of adrift.\n` +
      `1. ${dirInstr}\n` +
      `2. List the NNNN-*.md files in the directory and record id (NNNN), file (relative path), and title (heading) in adrs.\n` +
      `3. Decide the manifest verdict. rust if Cargo.toml exists. If package.json exists, tsx when *.tsx files exist, otherwise ts. Otherwise other.\n` +
      `4. Search the whole repository for ADR references with \`ugrep -rniw 'ADR-[0-9]{4}'\` and record the hits in adr_refs (file, line, id as 4-digit NNNN), excluding the ADR directory itself, fixtures, and node_modules / target / dist / build / vendor. Do not classify against local ADRs.\n` +
      `Do not analyze ADR bodies. This stage's job is detection and listing only.`,
  ),
  {
    agentType: "general-purpose",
    phase: "Detect",
    label: "detect",
    model: "sonnet",
    schema: DETECT_SCHEMA,
  },
)) || {
  found: false,
  adr_dir: "",
  adrs: [],
  manifest: "other",
  adr_refs: [],
  reason: "the detect agent returned no output",
};

if (!detect.found || !detect.adrs.length) {
  return {
    stopped: "no-adrs",
    why: detect.reason || "No ADRs found, run /census first",
  };
}
// External-reference classification is a script set difference (referenced ids − local ids).
// The Detect agent searches, this code classifies.
const localIds = new Set(detect.adrs.map((a) => parseInt(a.id, 10)));
const externalRefs = (() => {
  const byRef = new Map();
  for (const r of detect.adr_refs) {
    if (localIds.has(parseInt(r.id, 10))) continue;
    const ref = `ADR-${String(r.id).padStart(4, "0")}`;
    if (!byRef.has(ref)) byRef.set(ref, []);
    byRef.get(ref).push(`${r.file}:${r.line}`);
  }
  return [...byRef.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ref, locations]) => ({ ref, locations }));
})();
// With focus set, the script narrows deterministically. The Detect agent always lists
// everything (listing is cheap, and returning `available` on a zero match needs the full list).
const targets = focus.length ? detect.adrs.filter(matchesFocus) : detect.adrs;
if (!targets.length) {
  return {
    stopped: "no-matching-adrs",
    why: `no ADR matches focus [${focus.join(", ")}]`,
    available: detect.adrs.map((a) => `${a.id}: ${a.title}`),
  };
}
const reviewers = REVIEWERS[detect.manifest] || REVIEWERS.other;
log(
  `Detect: ${targets.length}/${detect.adrs.length} ADRs (${detect.adr_dir}${
    focus.length ? `, focus=${focus.join("+")}` : ""
  }), manifest=${detect.manifest} -> ${reviewers.join(" + ")}, external_refs=${externalRefs.length}`,
);

// ---- Scan: per ADR, run extract -> reviewer matching independently ----
const perAdr = await pipeline(
  targets,
  // stage 1: status / symbol extraction and reference search
  (a) =>
    agent(
      anchor(
        `You handle the extraction stage of adrift. Read ADR ${a.file} and do the following.\n` +
          `1. Parse status from the front matter or opening section. If a superseded-by link exists, copy the successor ADR id into superseded_by.\n` +
          `2. From the Decision Outcome section, extract code identifiers (function / type / module names, file paths) and bullet-level decisions, and copy the section body into outcome_text. For a prose-only ADR with no identifiers, set verifiable: false and write "prose-only" in notes.\n` +
          `3. Search each symbol with \`ugrep -rn\`, excluding the ADR files themselves and test fixtures, and record the hits in candidates (symbol, file, line).\n` +
          `Do not judge drift. This stage's job is extraction and search only.`,
      ),
      {
        agentType: "general-purpose",
        phase: "Scan",
        label: `extract:${a.id}`,
        model: "sonnet",
        schema: EXTRACT_SCHEMA,
      },
    ),
  // stage 2: semantic matching by routed reviewers
  async (ex, a) => {
    if (!ex) {
      // an extract stall stays in the Per-ADR listing as unverifiable (fail-close)
      return {
        adr: a,
        status: "unknown",
        verifiable: false,
        note: "extract agent stall",
        findings: [],
      };
    }
    if (!ex.verifiable || !ex.candidates.length) {
      return {
        adr: a,
        status: ex.status,
        superseded_by: ex.superseded_by || "",
        verifiable: ex.verifiable,
        note: ex.verifiable
          ? "0 reference candidates (symbols no longer present in the code)"
          : ex.notes || "prose-only",
        // a verifiable ADR with zero symbol hits is itself a drift signal
        findings: ex.verifiable
          ? ex.symbols.map((s) => ({
              file: a.file,
              line: 0,
              summary: `Symbol "${s}" from the Decision Outcome is not found in the code`,
              direction: "adr-update",
              priority: "M",
            }))
          : [],
      };
    }
    const reviewed = await parallel(
      reviewers.map(
        (rv) => () =>
          agent(
            anchor(
              `As ${rv}, judge semantic drift between the Decision Outcome of ADR ${a.id} (${a.title}) and the current code. Look at the semantic gap between the decision and the implementation, not surface issues clippy or grep would catch.\n` +
                `The Decision Outcome is as follows.\n${ex.outcome_text}\n\n` +
                `The reference candidates (ugrep hits) are as follows.\n${JSON.stringify(ex.candidates)}\n\n` +
                `Pin each drift to file:line and assign direction and priority by these criteria.\n` +
                `The direction criteria are ${DIRECTION_RULES}.\n` +
                `The priority criteria are ${PRIORITY_RULES}.\n` +
                `If there is no drift, return findings: []. Do not edit the ADR body or fix the code.`,
            ),
            {
              agentType: rv,
              phase: "Scan",
              label: `${rv}:${a.id}`,
              model: "sonnet",
              schema: FINDINGS_SCHEMA,
            },
          ),
      ),
    );
    const alive = reviewed.filter(Boolean);
    return {
      adr: a,
      status: ex.status,
      superseded_by: ex.superseded_by || "",
      verifiable: true,
      note: alive.length ? "" : "all reviewers stalled (unmatched)",
      findings: mergeFindings(alive.map((r) => r.findings)),
    };
  },
);

const scanned = perAdr.filter(Boolean);
const allFindings = scanned.flatMap((r) => r.findings.map((f) => ({ ...f, adr: r.adr.id })));
const counts = { H: 0, M: 0, L: 0 };
for (const f of allFindings) counts[f.priority] += 1;
const unverifiable = scanned.filter((r) => !r.verifiable);
log(
  `Scan: findings=${allFindings.length} (H=${counts.H}, M=${counts.M}, L=${counts.L}), unverifiable=${unverifiable.length}/${scanned.length}`,
);

// ---- Report: report output (the structure lives in the prompt, no template) ----
phase("Report");
const focusNote = focus.length
  ? `This run is narrowed by focus [${focus.join(", ")}] to ${scanned.length}/${detect.adrs.length} ADRs. State this in one line right after the Summary.\n\n`
  : "";
const report = (await agent(
  anchor(
    `You handle the Report stage of adrift. Write a report with the following structure from the findings JSON below.\n` +
      `The steps are, after \`mkdir -p docs/audit\`, write to docs/audit/\${STAMP}-adr-drift.md with \`STAMP=$(date -u +%Y-%m-%d-%H%M%S)\`.\n` +
      `The structure is as follows. The title is "# ADR Drift Scan: {STAMP}". Sections in order: "## Summary" (a Metric | Value table with rows ADRs scanned / Drift findings / H priority / M priority / L priority / Unverifiable ADRs), "## Per-ADR Findings", "## External ADR Dependencies" (a File:Line | External ADR ref | Recommended action table; the action is "Promote to local ADR or supersede locally"), "## Follow-up Issue Candidates" (a checklist of \`- [ ] ADR {id} drift at {file}:{line}: {summary}\`).\n` +
      `In Per-ADR Findings, bundle no-drift ADRs into one "ADRs {ids}: no drift." line, and give a "### ADR {id}: {title}" subsection (Status / Result lines + a File:Line | Description | Direction | Priority table; for unverifiable, state the reason in Result and omit the table) only to drifted / unverifiable ADRs.\n` +
      `The completeness requirements are the following 4. (1) List every ADR in Per-ADR Findings without omission. (2) Record file:line / direction / priority for each drift. (3) Reflect Superseded in the Status of superseded ADRs. (4) Omit the External ADR Dependencies heading entirely when external_refs is empty, and the Follow-up Issue Candidates heading entirely when there are zero H-priority findings.\n\n` +
      focusNote +
      `Use these Summary counts as-is. ADRs scanned=${scanned.length}, findings=${allFindings.length}, H=${counts.H}, M=${counts.M}, L=${counts.L}, unverifiable=${unverifiable.length}\n\n` +
      `The per-ADR results are as follows.\n${JSON.stringify(
        scanned.map((r) => ({
          id: r.adr.id,
          title: r.adr.title,
          status: r.status,
          superseded_by: r.superseded_by || "",
          verifiable: r.verifiable,
          note: r.note,
          findings: r.findings,
        })),
      )}\n\n` +
      `The external ADR references (external_refs) are as follows.\n${JSON.stringify(externalRefs)}`,
  ),
  {
    agentType: "general-purpose",
    phase: "Report",
    label: "report",
    model: "opus",
    schema: REPORT_SCHEMA,
  },
)) || { written: false, report_path: "" };

log(
  report.written
    ? `Report: ${report.report_path}`
    : "Report: write failed (use the findings in the return value as the primary record)",
);

return {
  report_path: report.report_path,
  report_written: report.written,
  focus,
  adrs_scanned: scanned.length,
  adrs_total: detect.adrs.length,
  findings: allFindings,
  priorities: counts,
  unverifiable: unverifiable.map((r) => ({ id: r.adr.id, note: r.note })),
  external_refs: externalRefs,
  followup_candidates: allFindings.filter((f) => f.priority === "H"),
};
