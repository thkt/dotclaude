---
description: Orchestrate specialized review agents for code quality assessment. Use when user mentions レビューして, コードレビュー, 品質チェック, code review, quality check.
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion
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

## Scope Tier

| Tier   | Files | Architecture                                                     |
| ------ | ----- | ---------------------------------------------------------------- |
| Small  | 1-3   | Leader reviews directly (no agents)                              |
| Medium | 4-15  | 3 general-purpose reviewers + Leader integrates                  |
| Large  | 16+   | Sub-reviewers (file-routed) + challenger + verifier + integrator |

Glob target → count files → select tier → confirm with user.

## Execution

Select tier-specific workflow below. All tiers start with Pre-flight (see below).

**Constraint: Save snapshot BEFORE displaying any results to user.**

### Small Tier (1-3 files)

Leader reads all target files and performs multi-domain review directly.
Output: findings YAML → save snapshot → display delta.

No agents spawned.

### Medium Tier (4-15 files)

| Step | Action                                                        |
| ---- | ------------------------------------------------------------- |
| 1    | Pre-flight static analysis                                    |
| 2    | Spawn 3 general-purpose reviewers via Task (background)       |
| 3    | Each reviewer covers assigned domains, reads all target files |
| 4    | Leader collects results, integrates (dedup, root causes)      |
| 5    | Save snapshot                                                 |
| 6    | Display delta + report                                        |

Medium skips challenger/verifier: with 4-15 files all reviewers read the same files, so cross-validation adds cost without proportional benefit. Leader performs integration directly. Large tier (16+) uses file-routed sub-reviewers where each sees a subset, making independent challenge/verification essential.

#### Reviewer Assignment

| Reviewer   | subagent_type   | Domains                                            |
| ---------- | --------------- | -------------------------------------------------- |
| foundation | general-purpose | code-quality, progressive-enhancement, root-cause  |
| safety     | general-purpose | security, silent-failure, type-safety, type-design |
| quality    | general-purpose | design-pattern, testability, documentation         |

#### Spawn Prompt Template

Include in each reviewer's prompt:

- Target file list (absolute paths)
- Assigned domains with "what to look for" guidance
- Finding schema (ID prefixes per domain)
- Output format (YAML)
- "Read ALL listed files. Do NOT skip files."

### Large Tier (16+ files)

| Step | Action                                                             |
| ---- | ------------------------------------------------------------------ |
| 1    | Pre-flight static analysis                                         |
| 2    | File routing: classify target files → assign to relevant reviewers |
| 3    | Spawn sub-reviewers via Task (background, max 10 parallel)         |
| 4    | Spawn challenger + verifier (wait for reviewers)                   |
| 5    | Spawn integrator (wait for challenger + verifier)                  |
| 6    | Leader receives final YAML from integrator                         |
| 7    | Save snapshot                                                      |
| 8    | Display delta + report                                             |

#### File Routing

Leader classifies each target file by path and assigns to relevant reviewers only:

| File Pattern           | Sub-reviewers (subagent_type)                                         |
| ---------------------- | --------------------------------------------------------------------- |
| `*.sh`                 | security-reviewer, silent-failure-reviewer, code-quality-reviewer     |
| `*.ts, *.tsx, *.js`    | security-reviewer, silent-failure-reviewer, type-safety-reviewer,     |
|                        | code-quality-reviewer, design-pattern-reviewer, testability-reviewer, |
|                        | performance-reviewer                                                  |
| `*.md` (agent defs)    | design-pattern-reviewer, testability-reviewer, document-reviewer      |
| `*.md` (commands/docs) | document-reviewer, testability-reviewer                               |
| `*.yaml, *.json`       | type-design-reviewer, document-reviewer                               |
| `*.css, *.html`        | accessibility-reviewer, progressive-enhancer, performance-reviewer    |
| `test.*`, `*.test.*`   | test-coverage-reviewer, testability-reviewer                          |
| Other                  | code-quality-reviewer, document-reviewer                              |

Classification by path: `agents/**/*.md` → agent defs, `commands/**/*.md` or `docs/**/*.md` → commands/docs, other `*.md` → commands/docs (default).

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

Since agents are standalone (not team), leader collects results via Task output:

| Handoff             | Method            |
| ------------------- | ----------------- |
| Reviewer → Leader   | Task completion   |
| Leader → Challenger | Task spawn prompt |
| Leader → Verifier   | Task spawn prompt |
| Challenger → Leader | Task completion   |
| Verifier → Leader   | Task completion   |
| Leader → Integrator | Task spawn prompt |
| Integrator → Leader | Task completion   |

### Error Handling

| Error             | Recovery                                                             |
| ----------------- | -------------------------------------------------------------------- |
| No files to audit | Return "No files to audit"                                           |
| Reviewer stall    | If not completed when all peers finish, proceed without it           |
| Malformed YAML    | Skip reviewer, log warning, proceed with valid reviewers             |
| Dependency stall  | Skip dependent reviewer (e.g., root-cause if CQ failed)              |
| Max parallel >10  | Batch in groups of 10 with sequential waits                          |
| Challenger stall  | If not completed when verifier finishes, proceed without             |
| Verifier stall    | If not completed when challenger finishes, proceed without           |
| Integrator stall  | If not completed after both inputs ready, Leader integrates manually |

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

### Step 2.5: Detect global analysis tools

| Tool         | Condition                                          | Command                                                                      |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| knip         | `package.json` exists AND `knip` in $PATH          | `knip --no-exit-code` (no config → `--config ~/.claude/templates/knip.json`) |
| react-doctor | `package.json` has `react` in dependencies/devDeps | `npx -y react-doctor@latest . --verbose`                                     |

These run alongside project scripts in Step 3 (parallel). Skip silently if tool not found.

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

| Check                     | Small | Medium | Large |
| ------------------------- | ----- | ------ | ----- |
| Tier logged?              | Yes   | Yes    | Yes   |
| Reviewers completed?      | —     | Yes    | Yes   |
| Challenger validated?     | —     | —      | Yes   |
| Verifier verified?        | —     | —      | Yes   |
| Integrator produced YAML? | —     | —      | Yes   |
| Snapshot saved?           | Yes   | Yes    | Yes   |
| Delta displayed?          | Yes   | Yes    | Yes   |
