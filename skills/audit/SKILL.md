---
name: audit
description: "Orchestrate specialized review agents for code quality assessment. Use when: レビューして, コードレビュー, 品質チェック, code review, quality check. Do NOT use for quick PR screening (use /preview instead)."
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*),
  Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task,
  AskUserQuestion
model: opus
argument-hint: "[target files or scope]"
user-invocable: true
---

# /audit - Code Audit Orchestrator

Orchestrate specialized review agents with confidence-based filtering. The
finding schema requires `file:line` on every finding — entries without evidence
are structurally invalid.

## Rationalization Counters

| Excuse                        | Counter                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| "This is a false positive"    | Verify with evidence-verifier before dismissing. Intuition ≠ evidence |
| "This pattern is intentional" | No `// intentional:` marker = not intentional                         |
| "Low severity, skip it"       | Low severity × high frequency = high risk. Count occurrences          |
| "The code works fine"         | Working ≠ correct. Audit reviews quality, not functionality           |
| "This is third-party code"    | If it's in your repo, it's your responsibility                        |

## Input

- Target scope: `$1` (optional). SHA/branch range (`x..y`) → `git diff --name-only $1` → file list
- If `$1` is empty → select focus via AskUserQuestion, then review
  staged/modified files
- `--runs=N` (optional, 1-3, default 1). N > 1 triggers multi-run aggregation
  to counter stochastic findings drift — see Multi-run Policy below

### Audit Focus

| Question | Options                                    |
| -------- | ------------------------------------------ |
| Focus    | security / performance / readability / all |

### Multi-run Policy

Reviewer findings are stochastic: ~50% of findings from the same reviewer on
the same target differ between runs (observed 2026-04-20 diagnostic). When
high-confidence coverage matters, pass `--runs=2` or `--runs=3`.

| N   | Use case                              | Cost                |
| --- | ------------------------------------- | ------------------- |
| 1   | Quick check (default)                 | baseline            |
| 2   | Standard audit, FN risk acceptable    | ~2x reviewer runs   |
| 3   | Pre-release, FN risk unacceptable     | ~3x reviewer runs   |

With N > 1, Leader runs Wave 1 (reviewer fan-out) N times in sequence, then
aggregates findings by `(file:line, category, reviewer)` as deduplication key.
Each aggregated finding carries `runs_observed: [1, 3]` (which runs produced
it) for transparency.

## Execution

Start with Pre-flight (see below). Save snapshot before displaying any results
to user.

| Step | Action                                                                        |
| ---- | ----------------------------------------------------------------------------- |
| 1    | Pre-flight (tests + hook findings)                                            |
| 2    | File routing: classify target files → assign to relevant reviewers            |
| 3    | Spawn sub-reviewers via Task as parallel calls in one turn (max 10 per batch) |
| 4    | Spawn challenger + verifier (wait for reviewers)                              |
| 5    | Spawn integrator (wait for challenger + verifier)                             |
| 6    | Leader receives final Markdown from integrator                                |
| 7    | Save snapshot                                                                 |
| 8    | Display delta + report                                                        |

#### File Routing

Leader classifies each target file by path and assigns to relevant reviewers only:

| File Pattern         | Sub-reviewers (subagent_type)                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.sh`               | security-reviewer, silent-failure-reviewer, code-quality-reviewer, duplication-reviewer, reuse-reviewer, efficiency-reviewer, operational-readiness-reviewer, chaos-engineer                                                                                           |
| `*.ts, *.tsx, *.js`  | security-reviewer, silent-failure-reviewer, type-safety-reviewer, code-quality-reviewer, duplication-reviewer, reuse-reviewer, efficiency-reviewer, design-pattern-reviewer, testability-reviewer, performance-reviewer, operational-readiness-reviewer, chaos-engineer |
| `*.md` (agent defs)  | prompt-reviewer, document-reviewer                                                                                                                                                                                                                                     |
| `*.md` (skills/docs) | prompt-reviewer, document-reviewer                                                                                                                                                                                                                                     |
| `*.md` (rules)       | prompt-reviewer, document-reviewer                                                                                                                                                                                                                                     |
| `*.yaml, *.json`     | type-design-reviewer, document-reviewer                                                                                                                                                                                                                                |
| `*.css, *.html`      | accessibility-reviewer, progressive-enhancer, performance-reviewer, duplication-reviewer                                                                                                                                                                               |
| `test.*`, `*.test.*` | test-coverage-reviewer, testability-reviewer                                                                                                                                                                                                                           |
| Other                | code-quality-reviewer, duplication-reviewer, reuse-reviewer, efficiency-reviewer, document-reviewer                                                                                                                                                                    |

Classification by path: `agents/**/*.md` → agent defs, `skills/*/SKILL.md` or
`docs/**/*.md` → skills/docs, `rules/**/*.md` → rules, other `*.md` →
skills/docs (default).

root-cause-reviewer is not in this table — it runs sequentially after
code-quality-reviewer completes (see Sequential Dependencies). Leader spawns it
with the same file list + CQ findings as input.

#### Sub-reviewer Spawn

Each sub-reviewer is spawned directly via Task:

- subagent_type: the reviewer name (e.g., `security-reviewer`)
- model: `sonnet` (override; avoids opus watchdog timeouts observed in diagnostic)
- Prompt: assigned file list + focus + finding schema + reliability constraints
- No team_name (standalone background agents)

Reliability constraints (include verbatim in every reviewer prompt):

- "Do NOT call the advisor tool. Work autonomously from your own analysis."
- "Complete within 8 minutes. If uncertain about a finding, include it with confidence < 0.85 rather than skip."

Rationale: opus model + advisor call + Rust deep analysis exceeded the 600s
stream watchdog in 3/7 reviewers during the 2026-04-20 diagnostic on tally
`HEAD~2..HEAD`. Adding the constraint and overriding to sonnet reduced stall
to 0/7 across two reruns.

Fan-out is the point of this step. Spawn all applicable sub-reviewers as
parallel Task calls within a single response — one Task call per reviewer.
Sequential spawning defeats the parallelism and wastes turns.

#### Pipeline Roles

| Role       | subagent_type          | Purpose                             |
| ---------- | ---------------------- | ----------------------------------- |
| challenger | devils-advocate-audit  | Challenge findings (reduce FP)      |
| verifier   | evidence-verifier      | Verify findings (positive evidence) |
| integrator | progressive-integrator | Reconcile into root causes          |

#### Sequential Dependencies

| Reviewer   | Depends On            | Reason                     |
| ---------- | --------------------- | -------------------------- |
| root-cause | code-quality          | Needs CQ findings as input |
| challenger | All reviewers         | Needs all findings         |
| verifier   | All reviewers         | Needs all findings         |
| integrator | challenger + verifier | Needs both perspectives    |

#### Handoff (Standalone)

Agents are standalone. Leader collects via Task completion; spawns via Task
prompt.

### Error Handling

Any skipped reviewer must be recorded to `pipeline_health.domains_skipped` with
the reason.

| Error             | Recovery                                       | Skip Reason                    |
| ----------------- | ---------------------------------------------- | ------------------------------ |
| No files to audit | Return "No files to audit"                     | —                              |
| Reviewer stall    | 120s timeout; proceed without                  | `timeout`                      |
| Malformed output  | Skip reviewer; proceed with valid reviewers    | `malformed_output`             |
| Dependency stall  | Skip dependent (e.g., root-cause if CQ failed) | `dependency_stall: {upstream}` |
| Max parallel >10  | Batch in groups of 10                          | —                              |
| Challenger stall  | 120s timeout; proceed with verifier only       | —                              |
| Verifier stall    | 120s timeout; proceed with challenger only     | —                              |
| Integrator stall  | 120s timeout; Leader integrates manually       | —                              |

## Pre-flight: Tests + Hook Findings

Read [`references/pre-flight.md`](references/pre-flight.md) for the full
procedure: detect task runner → find test script → run tests → convert hook
output to `PF-{seq}` findings.

## Snapshot

Session ID: ${CLAUDE_SESSION_ID}

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).yaml"
```

## Templates

| Template                                                              | Purpose                  |
| --------------------------------------------------------------------- | ------------------------ |
| [@../templates/audit/output.md](../templates/audit/output.md)         | Output format with delta |
| [@../templates/audit/snapshot.yaml](../templates/audit/snapshot.yaml) | Snapshot schema          |

## Verification

| Check                         | Required |
| ----------------------------- | -------- |
| Reviewers completed?          | Yes      |
| Challenger validated?         | Yes      |
| Verifier verified?            | Yes      |
| Integrator produced Markdown? | Yes      |
| Snapshot saved?               | Yes      |
| Delta displayed?              | Yes      |
