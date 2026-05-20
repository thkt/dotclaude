---
name: research
description: Probe project and technical questions. Findings are positions to be challenged with explicit sources, not conclusions. Phase 5 advisor pass argues against the synthesis before it lands. Do NOT use for design planning or SOW/Spec generation (use /think instead).
when_to_use: 調査して, 調べて, リサーチ, investigate, 分析して, issueやろう, issue見て, 横並びチェック, 類似パターン検出, refactor 横展開
allowed-tools: Bash(tree:*) Bash(git log:*) Bash(git diff:*) Bash(wc:*) Bash(yomu:*) Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
context: fork
argument-hint: "[research subject or question]"
---

# /research

Investigate codebase with source-based findings, without implementation. Findings are positions to be challenged. Phase 5 advisor pass argues against the synthesis before it lands.

## Input

- Research subject: `$ARGUMENTS` (required free-text topic or question)
- If `$ARGUMENTS` is empty, prompt via AskUserQuestion.

## Execution

| Phase | Action                               | Detail                                                                                                                                                                       |
| ----- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Outcome Anchor                       | Read `.claude/OUTCOME.md`; if absent, stub generation (see rules/core/OUTCOME.md). Confirm investigation scope aligns with outcome state                                     |
| 1     | Prior research scan                  | bfs same-subject files in `.claude/workspace/research/`. Inherit Findings/Constraints                                                                                        |
| 2     | Intent + Domain clarification        | Ask via AskUserQuestion (skip if obvious from `$ARGUMENTS`)                                                                                                                  |
| 3     | Domain-scoped parallel investigation | yomu search + Task(Explore) + targeted Read/ugrep, scoped by Domain. Capture command + raw output to scratch. Cross-method verify when claim drives PR scope or crosses repo |
| 4     | Strong Inference (Bug only)          | ≥3 hypotheses, discriminating tests, eliminate                                                                                                                               |
| 5     | Advisor pre-synthesis check          | Invoke `advisor()` with no parameters. Skip per conditions in Phase 5 section                                                                                                |
| 6     | Synthesis                            | Merge prior baseline, source pass for findings. Disconfirmation only if Phase 4 was skipped                                                                                  |

### Phase 0: Outcome Anchor

Read `.claude/OUTCOME.md`. If absent, generate stub via rules/core/OUTCOME.md flow. Confirm the investigation scope aligns with the outcome state. If the investigation steps into Non-goals, explicitly confirm with user before proceeding.

### Phase 1: Prior Research Scan

Derive subject slug from `$ARGUMENTS` (lowercase, hyphenated). Run `bfs .claude/workspace/research -name '*<slug>*.md'`. For each match, the table below shows the carry-forward mapping.

| Extract                 | Carry forward as                          |
| ----------------------- | ----------------------------------------- |
| Key Findings table      | Phase 6 baseline (re-verify or supersede) |
| Constraints table       | Phase 3 input (do not re-discover)        |
| Disconfirmation results | Phase 6 reference                         |

If no match, skip and note "No prior research found for `<slug>`".

### Phase 2: Intent + Domain Clarification

Skip if `$ARGUMENTS` clearly indicates both. Otherwise ask via AskUserQuestion.

| Question        | Options                                              |
| --------------- | ---------------------------------------------------- |
| Research intent | Feature planning / Bug investigation / Understanding |
| Domain          | Data model / API / Infrastructure / General          |

Domain drives Phase 3 scoping. Domain=General applies no scoping.

### Phase 3: Domain-Scoped Parallel Investigation

Run in parallel.

| Tool                                               | Purpose                             | Domain Scoping                                                     |
| -------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `yomu search "<subject + domain keywords>"` (Bash) | Semantic concept search             | Append Domain-aligned terms (e.g., API → "endpoint route handler") |
| `Task(subagent_type: Explore)`                     | File / symbol / reference discovery | Pass Domain glob roots in the prompt                               |
| Read / ugrep / bfs                                 | Targeted reads on identified files  | Use Domain glob roots as starting point                            |

Use the following Domain glob roots.

| Domain         | Suggested roots                                                 |
| -------------- | --------------------------------------------------------------- |
| Data model     | `schema/`, `models/`, `db/`, `drizzle/`, `prisma/`, `*.sql`     |
| API            | `routes/`, `handlers/`, `controllers/`, `api/`, `server/`       |
| Infrastructure | `terraform/`, `infra/`, `ci/`, `.github/`, `deploy/`, `docker/` |
| General        | (no scoping; let Explore find)                                  |

For Feature planning intent, additionally invoke `Task(subagent_type: explorer-feature)` to trace execution paths and map architecture for the relevant feature area.

State sources directly for all findings as they accumulate: file:line for facts, "inferred from X" for inferences, "unknown, requires X" for unverified claims.

### Audit trail capture

As Phase 3 searches run, append each command verbatim and its raw output to a scratch buffer in this conversation. Phase 6 Disconfirmation quotes from this scratch directly. Reconstruct nothing. The actual command and actual output is the audit trail.

### Cross-method verification

When a finding states "no caller" / "X is the only Y" / "X is the exhaustive list of Y" / "not used in [repo set]" and that claim drives downstream PR scope or crosses repo boundary, verify with at least 2 of: yomu search, ugrep / bfs, Task(Explore). If results disagree, flag the discrepancy and identify the tool error before recording. Single-tool zero result is suspect, not authoritative.

### Phase 4: Strong Inference (Bug investigation only)

Apply Debug Investigation Protocol from `rules/core/OPERATION.md`.

| Step | Action                                                            |
| ---- | ----------------------------------------------------------------- |
| 1    | Observation                                                       |
| 2    | Pattern analysis (find working similar code, diff against broken) |
| 3    | Generate ≥3 hypotheses                                            |
| 4    | Discriminating test per hypothesis                                |
| 5    | Elimination, then conclusion                                      |

Skip when intent is Feature planning or Understanding.

### Phase 5: Advisor Pre-Synthesis Check

Invoke `advisor()` with no parameters. Advisor sees full conversation history including Phase 2 answers, Phase 3 findings, and the audit trail scratch.

Skip when all conditions hold.

- Phase 1 hit prior research and current run inherits only
- Intent = Understanding AND Domain = General
- No claim crosses repo boundary or drives PR scope

If advisor flags missed area or weak inference, return to Phase 3 for targeted scoping. Record skip reason in output if applicable.

### Phase 6: Synthesis

| Step                 | Action                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Merge prior baseline | If Phase 1 found prior research, integrate inherited Findings/Constraints into Key Findings, marking re-verified or superseded                                                                                                 |
| Source pass          | Each finding states its basis: file:line / command output for facts, "inferred from X (source)" for inferences, "unknown, requires X" for gaps                                                                                 |
| Disconfirmation      | If Phase 4 was skipped, quote the command and raw output from the Phase 3 scratch verbatim (no reconstruction). Treat 0 hits as "tool may be misused" before "absence". If Phase 4 ran, write "Covered by Phase 4 elimination" |
| Coverage check       | All Phase 2 questions answered, or noted as "unknown, requires X" with investigation method                                                                                                                                    |

## Error Handling

| Error                         | Action                                              |
| ----------------------------- | --------------------------------------------------- |
| Explore returns empty         | Re-run with broader keywords, note in findings      |
| yomu search returns empty     | Suggest user run `yomu rebuild`, fall back to ugrep |
| Intent unclear after Phase 2  | Stop, name the ambiguity, ask user                  |
| Domain glob roots all missing | Fall back to Domain=General scoping                 |

## Output

Session ID: ${CLAUDE_SESSION_ID}

File: `.claude/workspace/research/YYYY-MM-DD-<slug>.md`

Template: ${CLAUDE_SKILL_DIR}/templates/research.md

## Verification

| Check                                                                                  | Required     |
| -------------------------------------------------------------------------------------- | ------------ |
| OUTCOME.md present (Phase 0)?                                                          | Yes          |
| `Prior research` field filled (slug or `none found`)?                                  | Yes          |
| All findings have explicit sources or "unknown, requires X" notes?                     | Yes          |
| Phase 3 audit trail scratch captured (command + raw output verbatim)?                  | Yes          |
| Cross-method verification performed for "no caller" / "exhaustive enumeration" claims? | Yes (or N/A) |
| Phase 5 advisor invoked or skip reason recorded?                                       | Yes          |
| Disconfirmation recorded (if Phase 4 skipped)?                                         | Yes          |
| Output saved to `workspace/research/`?                                                 | Yes          |
| Next Steps section in template included?                                               | Yes          |
