---
description: Orchestrate specialized review agents for comprehensive code quality assessment
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

| Step | Action                                                   |
| ---- | -------------------------------------------------------- |
| 1    | Run project static analysis tools (see Pre-flight below) |
| 2    | Spawn review team (see Team Workflow below)              |
| 3    | Compound reviewers DM findings to `challenger`           |
| 4    | Challenger validates findings, DMs to `integrator`       |
| 5    | Integrator integrates → final YAML                       |
| 6    | Save snapshot (see Snapshot Naming below)                |
| 7    | Compare with previous snapshot, display delta            |
| 8    | Output report using template                             |

## Team Workflow

Spawn a coordinated team of 3 compound reviewers, 1 challenger, and 1 integrator.

### Team Structure

```text
/audit command (LEADER)
├── reviewer-foundation  (compound-reviewer-foundation)
├── reviewer-safety      (compound-reviewer-safety)
├── reviewer-quality     (compound-reviewer-quality)
├── challenger           (devils-advocate)
└── integrator           (progressive-integrator)
```

### Workflow

| Step | Actor      | Action                                                    |
| ---- | ---------- | --------------------------------------------------------- |
| 1    | Leader     | `TeamCreate("audit-{timestamp}")`                         |
| 2    | Leader     | TaskCreate x 5 (3 reviewers + challenger + integrator)    |
| 3    | Leader     | Spawn 5 teammates via Task with `team_name`               |
| 4    | Reviewers  | Run domain agents internally, DM findings to `challenger` |
| 5    | Challenger | Validate each batch, DM challenged results to `integrator`|
| 6    | Leader     | Wait for all reviewers to complete                        |
| 7    | Integrator | Produce final integrated YAML report                      |
| 8    | Leader     | SendMessage `shutdown_request` to all teammates           |

### Teammate Spawn

| Teammate            | subagent_type                | Role                                             |
| ------------------- | ---------------------------- | ------------------------------------------------ |
| reviewer-foundation | compound-reviewer-foundation | code-quality + progressive-enhancer + root-cause |
| reviewer-safety     | compound-reviewer-safety     | security + silent-failure + type-safety          |
| reviewer-quality    | compound-reviewer-quality    | design-pattern + testability + perf + a11y + doc |
| challenger          | devils-advocate              | Challenge findings, reduce false positives       |
| integrator          | progressive-integrator       | Pattern detection + prioritization + report      |

Agents: [agents/teams/](../agents/teams/), [agents/critics/](../agents/critics/)

### Error Handling

| Error                 | Recovery                                                        |
| --------------------- | --------------------------------------------------------------- |
| No files to audit     | Return "No files to audit" message, skip team spawn             |
| Team creation fails   | Log error, report partial results                               |
| Teammate spawn fails  | Continue with remaining teammates                               |
| Reviewer timeout      | 120s; Leader sends "proceed with partial results" to integrator |
| Teammate unresponsive | shutdown_request → proceed with available results               |
| DM delivery fails     | Retry once, then leader passes data directly                    |
| All teammates fail    | Log error, report partial results                               |

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

| Check                            | Required |
| -------------------------------- | -------- |
| Team spawned with 5 teammates?   | Yes      |
| All reviewer findings collected? | Yes      |
| Challenger validated findings?   | Yes      |
| Integrator produced final YAML?  | Yes      |
| Snapshot saved?                  | Yes      |
| Delta comparison displayed?      | Yes      |
