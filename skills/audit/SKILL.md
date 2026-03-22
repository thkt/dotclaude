---
name: audit
description: Orchestrate specialized review agents for code quality assessment. Use when
  user mentions レビューして, コードレビュー, 品質チェック, code review, quality
  check. Do NOT use for quick PR screening (use /preview instead).
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

- Target scope: `$1` (optional)
- If `$1` is empty → select focus via AskUserQuestion, then review
  staged/modified files

### Audit Focus

| Question | Options                                    |
| -------- | ------------------------------------------ |
| Focus    | security / performance / readability / all |

## Execution

Start with Pre-flight (see below). Save snapshot before displaying any results
to user.

| Step | Action                                                             |
| ---- | ------------------------------------------------------------------ |
| 1    | Pre-flight (tests + hook findings)                                 |
| 2    | File routing: classify target files → assign to relevant reviewers |
| 3    | Spawn sub-reviewers via Task (background, max 10 parallel)         |
| 4    | Spawn challenger + verifier (wait for reviewers)                   |
| 5    | Spawn integrator (wait for challenger + verifier)                  |
| 6    | Leader receives final Markdown from integrator                     |
| 7    | Save snapshot                                                      |
| 8    | Display delta + report                                             |

#### File Routing

Leader classifies each target file by path and assigns to relevant reviewers
only:

| File Pattern         | Sub-reviewers (subagent_type)                                       |
| -------------------- | ------------------------------------------------------------------- |
| `*.sh`               | security-reviewer, silent-failure-reviewer, code-quality-reviewer,  |
|                      | duplication-reviewer, reuse-reviewer, efficiency-reviewer,          |
|                      | operational-readiness-reviewer                                      |
| `*.ts, *.tsx, *.js`  | security-reviewer, silent-failure-reviewer, type-safety-reviewer,   |
|                      | code-quality-reviewer, duplication-reviewer, reuse-reviewer,        |
|                      | efficiency-reviewer, design-pattern-reviewer, testability-reviewer, |
|                      | performance-reviewer, operational-readiness-reviewer                |
| `*.md` (agent defs)  | design-pattern-reviewer, testability-reviewer, document-reviewer    |
| `*.md` (skills/docs) | document-reviewer, testability-reviewer                             |
| `*.yaml, *.json`     | type-design-reviewer, document-reviewer                             |
| `*.css, *.html`      | accessibility-reviewer, progressive-enhancer, performance-reviewer, |
|                      | duplication-reviewer                                                |
| `test.*`, `*.test.*` | test-coverage-reviewer, testability-reviewer                        |
| Other                | code-quality-reviewer, duplication-reviewer, reuse-reviewer,        |
|                      | efficiency-reviewer, document-reviewer                              |

Classification by path: `agents/**/*.md` → agent defs, `skills/*/SKILL.md` or
`docs/**/*.md` → skills/docs, other `*.md` → skills/docs (default).

#### Sub-reviewer Spawn

Each sub-reviewer is spawned directly via Task:

- subagent_type: the reviewer name (e.g., `security-reviewer`)
- Prompt: assigned file list + focus + finding schema
- No team_name (standalone background agents)

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

| Error             | Recovery                                                 |
| ----------------- | -------------------------------------------------------- |
| No files to audit | Return "No files to audit"                               |
| Reviewer stall    | 120s timeout; proceed without                            |
| Malformed output  | Skip reviewer, log warning, proceed with valid reviewers |
| Dependency stall  | Skip dependent (e.g., root-cause if CQ failed)           |
| Max parallel >10  | Batch in groups of 10                                    |
| Challenger stall  | 120s timeout; proceed with verifier only                 |
| Verifier stall    | 120s timeout; proceed with challenger only               |
| Integrator stall  | 120s timeout; Leader integrates manually                 |

## Pre-flight: Tests + Hook Findings

Read [`references/pre-flight.md`](references/pre-flight.md) for the full
procedure: detect task runner → find test script → run tests → convert hook
output to `PF-{seq}` findings.

## Snapshot Naming

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).yaml"
```

Example output: `audit-2026-01-23-031812.yaml`

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
