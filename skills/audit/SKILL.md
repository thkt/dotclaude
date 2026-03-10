---
name: audit
description:
  Orchestrate specialized review agents for code quality assessment. Use when
  user mentions レビューして, コードレビュー, 品質チェック, code review, quality
  check. Do NOT use for quick PR screening (use /preview instead).
aliases: [review]
allowed-tools:
  Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*),
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

## Scope Tier

| Tier   | Files | Architecture                                                     |
| ------ | ----- | ---------------------------------------------------------------- |
| Small  | 1-3   | Leader reviews directly (no agents)                              |
| Medium | 4-15  | 3 general-purpose reviewers + Leader integrates                  |
| Large  | 16+   | Sub-reviewers (file-routed) + challenger + verifier + integrator |

Glob target → count files → select tier → confirm with user.

## Execution

Select tier-specific workflow below. All tiers start with Pre-flight (see
below).

**Constraint: Save snapshot BEFORE displaying any results to user.**

### Small Tier (1-3 files)

Leader reads all target files and performs multi-domain review directly. Output:
findings YAML → save snapshot → display delta.

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

Medium skips challenger/verifier: all reviewers read the same files, so Leader
integrates directly. Large tier uses file-routed subsets, making independent
challenge/verification essential.

#### Reviewer Assignment

| Reviewer   | subagent_type   | Domains                                                           |
| ---------- | --------------- | ----------------------------------------------------------------- |
| foundation | general-purpose | code-quality, progressive-enhancement, root-cause                 |
| safety     | general-purpose | security, silent-failure, type-safety, type-design                |
| quality    | general-purpose | design-pattern, testability, documentation, operational-readiness |

#### Spawn Prompt Template

Include in each reviewer's prompt:

- Target file list (absolute paths)
- Assigned domains with "what to look for" guidance
- Finding schema (ID prefixes per domain)
- Output format (YAML)
- Output format includes `files_read` section (list of files actually read)

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

Leader classifies each target file by path and assigns to relevant reviewers
only:

| File Pattern         | Sub-reviewers (subagent_type)                                         |
| -------------------- | --------------------------------------------------------------------- |
| `*.sh`               | security-reviewer, silent-failure-reviewer, code-quality-reviewer,    |
|                      | operational-readiness-reviewer                                        |
| `*.ts, *.tsx, *.js`  | security-reviewer, silent-failure-reviewer, type-safety-reviewer,     |
|                      | code-quality-reviewer, design-pattern-reviewer, testability-reviewer, |
|                      | performance-reviewer, operational-readiness-reviewer                  |
| `*.md` (agent defs)  | design-pattern-reviewer, testability-reviewer, document-reviewer      |
| `*.md` (skills/docs) | document-reviewer, testability-reviewer                               |
| `*.yaml, *.json`     | type-design-reviewer, document-reviewer                               |
| `*.css, *.html`      | accessibility-reviewer, progressive-enhancer, performance-reviewer    |
| `test.*`, `*.test.*` | test-coverage-reviewer, testability-reviewer                          |
| Other                | code-quality-reviewer, document-reviewer                              |

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
| Malformed YAML    | Skip reviewer, log warning, proceed with valid reviewers |
| Dependency stall  | Skip dependent (e.g., root-cause if CQ failed)           |
| Max parallel >10  | Batch in groups of 10                                    |
| Challenger stall  | 120s timeout; proceed with verifier only                 |
| Verifier stall    | 120s timeout; proceed with challenger only               |
| Integrator stall  | 120s timeout; Leader integrates manually                 |

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

Common names: `lint`, `typecheck`, `type-check`, `check`, `analyse`, `analyze`,
`static`, `phpstan`, `clippy`

Fallback (best-effort): If no runner found, check for config files and verify
tool availability via `command -v`:

| Config File                       | Tool Check                     | Command                       |
| --------------------------------- | ------------------------------ | ----------------------------- |
| `tsconfig.json`                   | `command -v npx`               | `npx tsc --noEmit`            |
| `ruff.toml` / `ruff` in pyproject | `command -v ruff`              | `ruff check`                  |
| `.markdownlint.yaml` / `.json`    | `command -v markdownlint-cli2` | `markdownlint-cli2 "**/*.md"` |
| `biome.json` / `biome.jsonc`      | `command -v biome`             | `biome check`                 |
| `.eslintrc.*` / `eslint.config.*` | `command -v eslint`            | `eslint .`                    |

### Step 3: Run discovered scripts + tests

| Rule             | Behavior                                      |
| ---------------- | --------------------------------------------- |
| No tools found   | Skip pre-flight, proceed to agents            |
| Non-zero exit    | Capture output as context, do NOT block audit |
| Multiple scripts | Run independent scripts in parallel           |
| Timeout          | 60s per script; kill and proceed on timeout   |

Run in parallel: lint scripts, type-check, and test suite (with coverage).

Record results in snapshot `pre_flight`:

| Field    | Source                                      |
| -------- | ------------------------------------------- |
| build    | build script exit code → pass/fail/skipped  |
| types    | tsc/tsgo exit code → pass/fail/skipped      |
| lint     | lint script exit code → pass/fail/skipped   |
| tests    | test output → total/passed/failed counts    |
| coverage | coverage report → c0 (line) / c1 (branch) % |

If test runner or coverage tool is unavailable, record as `skipped`.

### Step 4: Convert hook output to findings

If a PreToolUse(Skill) hook injects `additionalContext` (e.g., `claude-reviews`
per ADR-0013), parse each tool section and convert to `PF-{seq}` findings using
the finding-schema.yaml base fields.

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| `finding_id` | `PF-{seq}` (sequential across all tools) |
| `agent`      | `pre-flight`                             |

Category naming convention:

| Tool         | Category pattern                                                           | Default severity                                        |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| knip         | `unused-file`, `unused-export`, `unused-dependency`, `unlisted-dependency` | `unlisted` → high, `unused-file` → medium, others → low |
| oxlint       | `lint/{rule-name}`                                                         | `error` → high, `warning` → medium                      |
| tsgo         | `type-error/TS{code}`                                                      | high                                                    |
| react-doctor | `react/{issue-type}`                                                       | medium                                                  |
| (unknown)    | `preflight/{tool-name}`                                                    | low                                                     |

Apply the consolidation rule from finding-schema.yaml (same pattern → single
finding).

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
