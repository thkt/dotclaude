---
name: research
description: Perform project research and technical investigation without implementation. Do NOT use for design planning or SOW/Spec generation (use /think instead).
when_to_use: 調査して, 調べて, リサーチ, investigate, 分析して, issueやろう, issue見て, 横並びチェック, 類似パターン検出, refactor 横展開
allowed-tools: Bash(tree:*) Bash(git log:*) Bash(git diff:*) Bash(wc:*) Bash(yomu:*) Read Glob Grep LS Task AskUserQuestion
model: opus
context: fork
argument-hint: "[research subject or question]"
---

# /research

Investigate codebase with source-based findings, without implementation.

## Input

- Research subject: `$ARGUMENTS` (required free-text topic or question)
- If `$ARGUMENTS` is empty, prompt via AskUserQuestion.

## Execution

| Phase | Action                               | Detail                                                                                      |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| 0     | Prior research scan                  | Glob same-subject files in `.claude/workspace/research/`. Inherit Findings/Constraints      |
| 1     | Intent + Domain clarification        | Ask via AskUserQuestion (skip if obvious from `$ARGUMENTS`)                                 |
| 2     | Domain-scoped parallel investigation | yomu search + Task(Explore) + targeted Read/Grep, scoped by Domain                          |
| 3     | Strong Inference (Bug only)          | ≥3 hypotheses, discriminating tests, eliminate                                              |
| 4     | Synthesis                            | Merge prior baseline, source pass for findings. Disconfirmation only if Phase 3 was skipped |

### Phase 0: Prior Research Scan

Derive subject slug from `$ARGUMENTS` (lowercase, hyphenated). Run `Glob '.claude/workspace/research/*<slug>*.md'`. For each match:

| Extract                 | Carry forward as                          |
| ----------------------- | ----------------------------------------- |
| Key Findings table      | Phase 4 baseline (re-verify or supersede) |
| Constraints table       | Phase 2 input (do not re-discover)        |
| Disconfirmation results | Phase 4 reference                         |

If no match, skip and note "No prior research found for `<slug>`".

### Phase 1: Intent + Domain Clarification

Skip if `$ARGUMENTS` clearly indicates both. Otherwise ask via AskUserQuestion.

| Question        | Options                                              |
| --------------- | ---------------------------------------------------- |
| Research intent | Feature planning / Bug investigation / Understanding |
| Domain          | Data model / API / Infrastructure / General          |

Domain drives Phase 2 scoping. Domain=General applies no scoping.

### Phase 2: Domain-Scoped Parallel Investigation

Run in parallel:

| Tool                                               | Purpose                             | Domain Scoping                                                     |
| -------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `yomu search "<subject + domain keywords>"` (Bash) | Semantic concept search             | Append Domain-aligned terms (e.g., API → "endpoint route handler") |
| `Task(subagent_type: Explore)`                     | File / symbol / reference discovery | Pass Domain glob roots in the prompt                               |
| Read / Grep / Glob                                 | Targeted reads on identified files  | Use Domain glob roots as starting point                            |

Domain glob roots:

| Domain         | Suggested roots                                                 |
| -------------- | --------------------------------------------------------------- |
| Data model     | `schema/`, `models/`, `db/`, `drizzle/`, `prisma/`, `*.sql`     |
| API            | `routes/`, `handlers/`, `controllers/`, `api/`, `server/`       |
| Infrastructure | `terraform/`, `infra/`, `ci/`, `.github/`, `deploy/`, `docker/` |
| General        | (no scoping; let Explore find)                                  |

For Feature planning intent, additionally invoke `Task(subagent_type: explorer-feature)` to trace execution paths and map architecture for the relevant feature area.

State sources directly for all findings as they accumulate: file:line for facts, "inferred from X" for inferences, "unknown, requires X" for unverified claims.

### Phase 3: Strong Inference (Bug investigation only)

Apply Debug Investigation Protocol from `rules/core/OPERATION.md`.

| Step | Action                                                            |
| ---- | ----------------------------------------------------------------- |
| 1    | Observation                                                       |
| 2    | Pattern analysis (find working similar code, diff against broken) |
| 3    | Generate ≥3 hypotheses                                            |
| 4    | Discriminating test per hypothesis                                |
| 5    | Elimination, then conclusion                                      |

Skip when intent is Feature planning or Understanding.

### Phase 4: Synthesis

| Step                 | Action                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge prior baseline | If Phase 0 found prior research, integrate inherited Findings/Constraints into Key Findings, marking re-verified or superseded                                                  |
| Source pass          | Each finding states its basis: file:line / command output for facts, "inferred from X (source)" for inferences, "unknown, requires X" for gaps                                  |
| Disconfirmation      | If Phase 3 was skipped, search for one piece of evidence contradicting the leading hypothesis. Record found / not found. If Phase 3 ran, write "Covered by Phase 3 elimination" |
| Coverage check       | All Phase 1 questions answered, or noted as "unknown, requires X" with investigation method                                                                                     |

## Error Handling

| Error                         | Action                                             |
| ----------------------------- | -------------------------------------------------- |
| Explore returns empty         | Re-run with broader keywords, note in findings     |
| yomu search returns empty     | Suggest user run `yomu rebuild`, fall back to Grep |
| Intent unclear after Phase 1  | Stop, name the ambiguity, ask user                 |
| Domain glob roots all missing | Fall back to Domain=General scoping                |

## Output

Session ID: ${CLAUDE_SESSION_ID}

File: `.claude/workspace/research/YYYY-MM-DD-<slug>.md`

Template: ${CLAUDE_SKILL_DIR}/templates/research.md

## Verification

| Check                                                              | Required |
| ------------------------------------------------------------------ | -------- |
| `Prior research` field filled (slug or `none found`)?              | Yes      |
| All findings have explicit sources or "unknown, requires X" notes? | Yes      |
| Disconfirmation recorded (if Phase 3 skipped)?                     | Yes      |
| Output saved to `workspace/research/`?                             | Yes      |
| Next Steps section in template included?                           | Yes      |
