---
description: Orchestrate specialized review agents for code quality assessment. Use when user mentions レビューして, コードレビュー, 品質チェック, code review, quality check.
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion, TeamCreate, SendMessage
model: opus
argument-hint: "[target files or scope]"
---

# /audit - Code Audit Orchestrator

Orchestrate specialized review agents with confidence-based filtering.

## Input

- Target scope: `$1` (optional)
- If `$1` is empty → select focus via AskUserQuestion, then review staged/modified files

### Audit Focus

| Question | Options                                    |
| -------- | ------------------------------------------ |
| Focus    | security / performance / readability / all |

## Execution

| Step | Action                                                        |
| ---- | ------------------------------------------------------------- |
| 1    | Run project static analysis tools (see Pre-flight below)      |
| 2    | Spawn review team (see Team Workflow below)                   |
| 3    | Reviewers run agents, Council sharing round, DM to validators |
| 4a   | Challenger validates findings, DMs to `integrator`            |
| 4b   | Verifier verifies findings, DMs to `integrator`               |
| 5    | Integrator reconciles + synthesizes root causes → final YAML  |
| 6    | Save snapshot (see Snapshot Naming below)                     |
| 7    | Compare with previous snapshot, display delta                 |
| 8    | Output report using template                                  |

## Team Workflow

Spawn a coordinated team of 3 compound reviewers, 1 challenger, 1 verifier, and 1 integrator.

### Team Structure

```text
/audit command (LEADER)
├── reviewer-foundation  (compound-reviewer-foundation)
├── reviewer-safety      (compound-reviewer-safety)
├── reviewer-quality     (compound-reviewer-quality)
├── challenger           (devils-advocate-audit)
├── verifier             (evidence-verifier)
└── integrator           (progressive-integrator)
```

### Council Protocol: Reviewer Council

Compound reviewers share cross-domain findings with peers before reporting to challenger/verifier.

#### Domain Priority (conflict resolution)

When findings overlap or conflict, higher-priority domain prevails:

| Priority | Domain     | Rationale                        |
| -------- | ---------- | -------------------------------- |
| 1        | Safety     | Security vulnerabilities = fatal |
| 2        | Foundation | Code quality enables everything  |
| 3        | Quality    | Design patterns = aspirational   |

#### Communication Priorities (what to share)

| Priority | Trigger                            | Action                               |
| -------- | ---------------------------------- | ------------------------------------ |
| P1       | Critical/high at specific location | DM file:line + summary to both peers |
| P2       | Same issue in 3+ files             | DM pattern description to both peers |
| Skip     | Domain-isolated low/medium finding | Don't share — own findings only      |

#### Sharing Format

```text
[COUNCIL] {domain} findings for peer review:

P1 Hotspots:
- {file}:{line} — {summary} ({severity})

P2 Patterns:
- {description} ({count} instances in {scope})
```

### Spawn Context

Teammates don't inherit leader's conversation history. Include in each spawn prompt:

| Context            | Source                                 |
| ------------------ | -------------------------------------- |
| Target file list   | git diff / $1 scope                    |
| Audit focus        | security / performance / all           |
| Pre-flight results | lint/typecheck output (if non-zero)    |
| Council peers      | Other compound reviewer teammate names |

### Workflow

| Step | Actor      | Action                                                             |
| ---- | ---------- | ------------------------------------------------------------------ |
| 1    | Leader     | `TeamCreate("audit-{timestamp}")`                                  |
| 2    | Leader     | TaskCreate x 6 (3 reviewers + challenger + verifier + integrator)  |
| 3    | Leader     | Spawn 6 teammates via Task with `team_name`, passing spawn context |
| 4    | Reviewers  | Run domain agents internally, normalize findings                   |
| 4b   | Reviewers  | Council sharing round (see Council Protocol above)                 |
| 4c   | Reviewers  | DM enriched findings to `challenger` AND `verifier`                |
| 5    | Challenger | Validate each batch, DM challenged results to `integrator`         |
| 5b   | Verifier   | Verify each batch, DM verification results to `integrator`         |
| 6    | Leader     | Wait for integrator to produce final YAML                          |
| 7    | Integrator | Synthesize cross-domain root causes, produce final YAML            |
| 8    | Leader     | SendMessage `shutdown_request` to all teammates                    |

### DM Handoff Contracts

| Handoff                 | Schema Source                             | Key Fields                            |
| ----------------------- | ----------------------------------------- | ------------------------------------- |
| Reviewer → Challenger   | `agents/teams/compound-reviewer-*.md`     | `domain`, `findings[]`, `summary`     |
| Reviewer → Verifier     | (same as above)                           | (same as above)                       |
| Challenger → Integrator | `agents/critics/devils-advocate-audit.md` | `challenges[]`, `summary`             |
| Verifier → Integrator   | `agents/critics/evidence-verifier.md`     | `verifications[]`, `summary`          |
| Integrator → Leader     | `agents/teams/progressive-integrator.md`  | Full snapshot YAML (excluding `meta`) |

### Error Handling

| Error                 | Recovery                                                         | Degraded Output                             |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| No files to audit     | Return "No files to audit" message, skip team spawn              | No report generated                         |
| Team creation fails   | Log error, report partial results                                | Report with available findings only         |
| Teammate spawn fails  | Continue with remaining teammates                                | Missing domain(s) noted in pipeline_health  |
| Reviewer timeout      | 120s; Leader sends "proceed with partial results" to integrator  | Integrator works with received domains only |
| Challenger timeout    | 120s; Leader notifies integrator to proceed with verifier only   | Rule 5 (verifier-only mode) applied         |
| Verifier timeout      | 120s; Leader notifies integrator to proceed with challenger only | Original challenger verdicts used as final  |
| Teammate unresponsive | shutdown_request → proceed with available results                | Missing domain(s) noted in pipeline_health  |
| DM delivery fails     | Retry once, then leader relays YAML via Task output              | Same schema, delivered through Task output  |
| All teammates fail    | Log error, report partial results                                | Empty report with error note                |

## Pre-flight: Static Analysis

Auto-detect and run project lint/check tools before agents start.

### Step 1: Detect task runner from project root

| File             | Runner                  |
| ---------------- | ----------------------- |
| `package.json`   | npm / yarn / pnpm / bun |
| `composer.json`  | composer                |
| `Makefile`       | make                    |
| `Taskfile.yml`   | task                    |
| `Cargo.toml`     | cargo                   |
| `pyproject.toml` | poetry / uv / ruff      |
| `Gemfile`        | bundle exec             |

### Step 2: Find lint/check scripts in detected runner

Common names: `lint`, `typecheck`, `type-check`, `check`, `analyse`, `analyze`, `static`, `phpstan`, `clippy`

Fallback (best-effort): If no runner found, check for config files (e.g. `tsconfig.json` → `npx tsc --noEmit`, `ruff.toml` → `ruff check`).

### Step 3: Run discovered scripts

| Rule             | Behavior                                      |
| ---------------- | --------------------------------------------- |
| No tools found   | Skip pre-flight, proceed to agents            |
| Non-zero exit    | Capture output as context, do NOT block audit |
| Multiple scripts | Run independent scripts in parallel           |
| Timeout          | 60s per script; kill and proceed on timeout   |

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

| Check                                | Required |
| ------------------------------------ | -------- |
| Team spawned with 6 teammates?       | Yes      |
| All reviewer findings collected?     | Yes      |
| Challenger validated findings?       | Yes      |
| Verifier produced verification YAML? | Yes      |
| Integrator produced final YAML?      | Yes      |
| Snapshot saved?                      | Yes      |
| Delta comparison displayed?          | Yes      |
