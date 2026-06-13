---
name: audit
description: Orchestrate reviewer agents under adversarial challenge (critic-audit + critic-evidence). Findings are positions to be argued, not facts to be aggregated. Do NOT use for quick PR screening (use /preview instead).
when_to_use: レビューして, コードレビュー, 品質チェック, code review, quality check, review
allowed-tools: Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git show:*) Bash(date:*) Bash(mkdir:*) Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[target files or scope]"
---

# /audit - Code Audit Orchestrator

Orchestrate reviewer agents, then run findings through critic-audit (challenge) and critic-evidence (verify) before integration. The pipeline is reviewer → challenge → verify → integrate, not reviewer → aggregate. Each finding is a position to be argued, not a fact. The finding schema requires `file:line` on every finding. Entries without evidence are structurally invalid.

## Rationalization Counters

| Excuse                        | Counter                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| "This is a false positive"    | Verify with critic-evidence before dismissing. Intuition is not evidence |
| "This pattern is intentional" | No `// intentional:` marker = not intentional                            |
| "Low severity, skip it"       | Low severity × high frequency = high risk. Count occurrences             |
| "The code works fine"         | Working is not correct. Audit reviews quality, not functionality         |
| "This is third-party code"    | If it's in your repo, it's your responsibility                           |

## Input

- `$ARGUMENTS` holds the full argument string. Leader MUST split on whitespace before use. The first positional token is the scope, remaining `--key=value` tokens are options. Never pass `$ARGUMENTS` verbatim to `git diff`.
- Scope: SHA/branch range (`x..y`) or file path → `git diff --name-only <scope>` → file list
- If scope is empty → select focus via AskUserQuestion, then review staged/modified files
- If scope is provided → focus defaults to `all` (no AskUserQuestion prompt)
- `--runs=N` (optional, 1-3, default 1). N > 1 triggers multi-run aggregation to counter stochastic findings drift. See Multi-run Policy below
- `--focus=<value>` (optional). Override the default `all` when scope is provided. Accepts: `security` / `performance` / `quality` / `a11y` / `all`
- `--no-limit` (optional). Skip the file count limit check (see File Count Policy). Use when running audit in CI or for branch-wide reviews where intent is explicit

### Audit Focus

| Question | Options                                       |
| -------- | --------------------------------------------- |
| Focus    | security / performance / quality / a11y / all |

#### Focus to Reviewer Mapping

After File Routing assigns reviewers by file pattern, Leader filters the result by focus. Only reviewers in the focus set actually run. `reviewer-causation` follows the Wave 1 set (see Sequential Dependencies); it runs when `quality` or `all` includes the upstream reviewers it depends on.

Filter rule. Final reviewer set per file = (File Routing reviewers for that pattern) ∩ (Focus reviewers). When the intersection is empty for a given file, that file is skipped for the focus.

| focus       | Reviewers included                                                                                                                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| security    | reviewer-security, reviewer-silence                                                                                                                                                                                                                                                                       |
| performance | reviewer-performance, reviewer-efficiency, reviewer-progressive                                                                                                                                                                                                                                           |
| quality     | reviewer-readability, reviewer-design, reviewer-react-pattern, reviewer-strictness, reviewer-rust, reviewer-encapsulation, reviewer-causation, reviewer-resilience, reviewer-duplication, reviewer-reuse, reviewer-testability, reviewer-operations, reviewer-document, reviewer-prompt, reviewer-silence |
| a11y        | reviewer-accessibility, reviewer-progressive                                                                                                                                                                                                                                                              |
| all         | No filter. All reviewers per File Routing run                                                                                                                                                                                                                                                             |

### Multi-run Policy

Reviewer findings drift across runs on the same target. When well-supported coverage matters, pass `--runs=2` or `--runs=3`. With N > 1, Leader runs Wave 1 (reviewer fan-out) N times in sequence, then aggregates findings per the procedure below.

| N   | Use case                           | Cost              |
| --- | ---------------------------------- | ----------------- |
| 1   | Quick check (default)              | baseline          |
| 2   | Standard audit, FN risk acceptable | ~2x reviewer runs |
| 3   | Pre-release, FN risk unacceptable  | ~3x reviewer runs |

#### Aggregation

1. Normalize each finding before merge.
   - `file`: repo-relative path from project root (e.g., `src/config.rs`, not `config.rs`)
   - `line`: `M` or `M-N` → `(start, end)` tuple
   - `category`: lowercase, take prefix before `/` (e.g., `structure/waste` → `structure`)
2. Merge key: `(file, category, reviewer)` with line-range overlap tolerance ±3
3. `runs_observed`: integer array of run indices (1-based) that produced the finding; union on merge
4. On message divergence, keep the longest; preserve both in `messages: [...]` if verification is needed

Without normalization, strict key matching leaves most findings unmerged because reviewers vary path format, line boundary, and category label across runs. Tolerance on all three is required. The ±3 tuning rationale (empirical ~3% → ~33% merge rate) is in ${CLAUDE_SKILL_DIR}/references/aggregation-tuning.md.

### File Count Policy

Audit cost grows with the number of target files. Leader applies a soft limit and batches per-reviewer file lists.

| Mode                       | Action                                                             |
| -------------------------- | ------------------------------------------------------------------ |
| scope empty, files ≤ 30    | Proceed                                                            |
| scope empty, files > 30    | AskUserQuestion with three options. See Narrow Scope Options below |
| scope provided, files > 30 | Warn user with file count, then proceed (intent honored)           |
| `--no-limit` set           | Skip limit check, proceed                                          |

#### Narrow Scope Options

When user picks "Narrow scope" in the AskUserQuestion, offer.

| Option         | Resolved scope |
| -------------- | -------------- |
| Last commit    | `HEAD~1..HEAD` |
| Last 5 commits | `HEAD~5..HEAD` |
| Cancel         | Abort audit    |

#### Spawn Batching

When the assigned file list per reviewer exceeds 10 files, Leader splits into batches of 10 and spawns one Task call per batch for that reviewer. The integrator aggregates findings across batches by `(file, category, reviewer)` (same key as Multi-run Aggregation).

## Execution

Start with Pre-flight (see below). Save snapshot before displaying any results to user.

| Step | Action                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | Pre-flight (tests + hook findings)                                                               |
| 2    | File routing: classify target files → assign to relevant reviewers                               |
| 3    | Spawn sub-reviewers via Task as parallel calls in one turn (max 10 per batch)                    |
| 4    | Spawn challenger + verifier (wait for reviewers)                                                 |
| 5    | Spawn integrator (wait for challenger + verifier)                                                |
| 6    | Integrator emits snapshot data; Leader fills session/branch/pre_flight/raw_findings/delta fields |
| 7    | Save snapshot to history                                                                         |
| 8    | Render Markdown from snapshot via ${CLAUDE_SKILL_DIR}/templates/output.md and display            |

#### File Routing

Leader classifies each target file by path and assigns to relevant reviewers only. reviewer-causation is not in this table. It runs sequentially after all Wave 1 reviewers complete (see Sequential Dependencies). Leader spawns it with the same file list + all Wave 1 findings as input.

| File Pattern         | Sub-reviewers (subagent_type)                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `*.sh`               | reviewer-security, reviewer-silence, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-operations, reviewer-resilience                                                                                                                                                         |
| `*.ts, *.js`         | reviewer-security, reviewer-silence, reviewer-strictness, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-design, reviewer-react-pattern, reviewer-testability, reviewer-performance, reviewer-operations, reviewer-resilience                                               |
| `*.tsx, *.jsx`       | reviewer-security, reviewer-silence, reviewer-strictness, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-design, reviewer-react-pattern, reviewer-testability, reviewer-performance, reviewer-operations, reviewer-resilience, reviewer-accessibility, reviewer-progressive |
| `*.rs`               | reviewer-security, reviewer-silence, reviewer-rust, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-design, reviewer-testability, reviewer-performance, reviewer-operations, reviewer-resilience                                                                             |
| `*.py`               | reviewer-security, reviewer-silence, reviewer-strictness, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-design, reviewer-testability, reviewer-performance, reviewer-operations, reviewer-resilience                                                                       |
| `*.md`               | reviewer-prompt, reviewer-document                                                                                                                                                                                                                                                               |
| `*.yaml, *.json`     | reviewer-encapsulation, reviewer-document                                                                                                                                                                                                                                                        |
| `*.css, *.html`      | reviewer-accessibility, reviewer-progressive, reviewer-performance, reviewer-duplication                                                                                                                                                                                                         |
| `test.*`, `*.test.*` | reviewer-coverage, reviewer-testability                                                                                                                                                                                                                                                          |
| Other                | reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-document                                                                                                                                                                                                                     |

#### Sub-reviewer Spawn

Each sub-reviewer is spawned directly via Task.

- subagent_type: the reviewer name (e.g., `reviewer-security`)
- model: `sonnet` (override; avoids opus watchdog timeouts observed in diagnostic)
- Prompt: assigned file list + focus + finding schema + reliability constraints
- No team_name (standalone background agents)

Reliability constraints (include verbatim in every reviewer prompt).

- "Do NOT call the advisor tool. Work autonomously from your own analysis."
- "Complete within 8 minutes. If uncertain about a finding, include it rather than skip. The challenger will prune false positives."

Opus + advisor + deep analysis exceeds the stream watchdog, so the sonnet override and no-advisor constraint eliminate reviewer stalls.

Fan-out is the point of this step. Spawn all applicable sub-reviewers as parallel Task calls within a single response. One Task call per reviewer. Sequential spawning defeats the parallelism and wastes turns.

#### Pipeline Roles

| Role       | subagent_type    | Purpose                             |
| ---------- | ---------------- | ----------------------------------- |
| challenger | critic-audit     | Challenge findings (reduce FP)      |
| verifier   | critic-evidence  | Verify findings (positive evidence) |
| integrator | team-integration | Reconcile into root causes          |

#### Sequential Dependencies

| Reviewer   | Depends On                 | Reason                                                           |
| ---------- | -------------------------- | ---------------------------------------------------------------- |
| root-cause | Wave 1 reviewers + PF      | Needs all findings (Wave 1 + static) for 5 Whys                  |
| challenger | Wave 1 reviewers only      | PF skipped (mechanically confirmed by deterministic tool)        |
| verifier   | Wave 1 reviewers only      | PF skipped (tool output is itself the evidence)                  |
| integrator | challenger + verifier + PF | Combines reconciled Wave 1 with PF; adds Wave 1 cross-references |

#### Handoff (Standalone)

Agents are standalone. Leader collects via Task completion; spawns via Task prompt.

### Error Handling

Any skipped reviewer must be recorded to `pipeline_health.domains_skipped` with the reason.

| Error                | Recovery                                                                           | Skip Reason                    |
| -------------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| No files to audit    | Return "No files to audit"                                                         | -                              |
| Reviewer stall       | 120s timeout; proceed without                                                      | `timeout`                      |
| Malformed output     | Skip reviewer; proceed with valid reviewers                                        | `malformed_output`             |
| Dependency stall     | Skip dependent (e.g., root-cause if Wave 1 failed)                                 | `dependency_stall: {upstream}` |
| Max parallel >10     | Batch in groups of 10                                                              | -                              |
| Pipeline-agent stall | 120s timeout; proceed with remaining agents; Leader integrates if integrator fails | -                              |

## Pre-flight: Tests + Hook Findings

Read ${CLAUDE_SKILL_DIR}/references/pre-flight.md for the full procedure. Detect task runner → find test script → run tests → convert hook output to `PF-{seq}` findings.

## Snapshot

Session ID: ${CLAUDE_SESSION_ID}

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).json"
```

`raw_findings`: before spawning challenger/verifier, Leader extracts `{reviewer, id, file, message}` per finding from each Wave 1 Task result. Keep `message` to one line. Purpose: dismissed findings keep their content here, enabling post-hoc overlap / convergence measurement (schema: ${CLAUDE_SKILL_DIR}/references/snapshot-schema.md).

## Templates

| Template                                          | Purpose                  |
| ------------------------------------------------- | ------------------------ |
| ${CLAUDE_SKILL_DIR}/templates/output.md           | Output format with delta |
| ${CLAUDE_SKILL_DIR}/templates/snapshot.json       | Snapshot example         |
| ${CLAUDE_SKILL_DIR}/references/snapshot-schema.md | Snapshot schema          |
