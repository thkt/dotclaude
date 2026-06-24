---
name: research
description: Probe project and technical questions. Findings are positions to be challenged with explicit sources, not conclusions. Phase 5 advisor pass argues against the synthesis before it lands. Do NOT use for design planning or SOW/Spec generation (use /think instead).
when_to_use: 調査して, 調べて, リサーチ, investigate, 分析して, issueやろう, issue見て, 横並びチェック, 類似パターン検出, refactor 横展開
allowed-tools: Bash(tree:*) Bash(git log:*) Bash(git diff:*) Bash(git show:*) Bash(wc:*) Bash(scout:*) Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
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

| Phase | Action                               | Detail                                                                                                                                                                                                                                     |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Outcome Anchor                       | Read `.claude/OUTCOME.md`; if absent, generate the stub via /outcome. Confirm investigation scope aligns with outcome state                                                                                                                |
| 1     | Prior research scan                  | bfs same-subject files in `.claude/workspace/research/`. Inherit Findings/Constraints                                                                                                                                                      |
| 2     | Intent + Domain clarification        | Ask via AskUserQuestion (skip if obvious from `$ARGUMENTS`)                                                                                                                                                                                |
| 3     | Domain-scoped parallel investigation | Task(Explore) + targeted Read/ugrep/bfs, scoped by Domain. Capture command + raw output to scratch. Cross-method verify when claim drives PR scope or crosses repo. Close with primary-source verification of load-bearing external claims |
| 4     | Strong Inference (Bug only)          | ≥3 hypotheses, discriminating tests, eliminate. After root cause confirmed, same-origin artifact sweep                                                                                                                                     |
| 5     | Advisor pre-synthesis check          | Invoke `advisor()` with no parameters. Skip per conditions in Phase 5 section                                                                                                                                                              |
| 6     | Synthesis                            | Merge prior baseline, source pass for findings. Disconfirmation only if Phase 4 was skipped                                                                                                                                                |

### Phase 0: Outcome Anchor

Read `.claude/OUTCOME.md`. If absent, generate the stub via /outcome. Confirm the investigation scope aligns with the outcome state. If the investigation steps into Non-goals, explicitly confirm with user before proceeding.

### Phase 1: Prior Research Scan

Derive subject slug from `$ARGUMENTS` (lowercase, hyphenated). Run `bfs .claude/workspace/research -name '*<slug>*.md'`. If no match, skip and note "No prior research found for `<slug>`". For each match, the table below shows the carry-forward mapping.

| Extract                 | Carry forward as                          |
| ----------------------- | ----------------------------------------- |
| Key Findings table      | Phase 6 baseline (re-verify or supersede) |
| Constraints table       | Phase 3 input (do not re-discover)        |
| Disconfirmation results | Phase 6 reference                         |

### Phase 2: Intent + Domain Clarification

Skip if `$ARGUMENTS` clearly indicates both. Otherwise ask via AskUserQuestion. Domain drives Phase 3 scoping. Domain=General applies no scoping.

| Question        | Options                                              |
| --------------- | ---------------------------------------------------- |
| Research intent | Feature planning / Bug investigation / Understanding |
| Domain          | Data model / API / Infrastructure / General          |

### Phase 3: Domain-Scoped Parallel Investigation

Run in parallel. For Feature planning intent, additionally invoke `Task(subagent_type: explorer-feature)` to trace execution paths and map architecture for the relevant feature area. State sources directly for all findings as they accumulate: file:line for facts, "inferred from X" for inferences, "unknown, requires X" for unverified claims.

| Tool                           | Purpose                             | Domain Scoping                                                     |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| `Task(subagent_type: Explore)` | File / symbol / reference discovery | Pass Domain glob roots in the prompt                               |
| `ugrep` / `bfs` (Bash)         | Pattern / identifier search         | Append Domain-aligned terms (e.g., API → "endpoint route handler") |
| Read                           | Targeted reads on identified files  | Use Domain glob roots as starting point                            |

Use the following Domain glob roots.

| Domain         | Suggested roots                                                 |
| -------------- | --------------------------------------------------------------- |
| Data model     | `schema/`, `models/`, `db/`, `drizzle/`, `prisma/`, `*.sql`     |
| API            | `routes/`, `handlers/`, `controllers/`, `api/`, `server/`       |
| Infrastructure | `terraform/`, `infra/`, `ci/`, `.github/`, `deploy/`, `docker/` |
| General        | (no scoping; let Explore find)                                  |

### Audit trail capture

As Phase 3 searches run, append each command verbatim and its raw output to a scratch buffer in this conversation. Phase 6 Disconfirmation quotes from this scratch directly. Reconstruct nothing. The actual command and actual output is the audit trail.

### Cross-method verification

When a finding states "no caller" / "X is the only Y" / "X is the exhaustive list of Y" / "not used in [repo set]" and that claim drives downstream PR scope or crosses repo boundary, verify with at least 2 of: ugrep / bfs, Task(Explore), targeted Read. If results disagree, flag the discrepancy and identify the tool error before recording. Single-tool zero result is suspect, not authoritative.

### Primary-source verification (Phase 3 close)

At the end of Phase 3, extract findings whose Source references behavior of an external system this session did not execute (hook firing timing, action/parser required schema, library API behavior, cited-paper claims) and that is load-bearing: the conclusion, a Next Action, or the Disconfirmation depends on the claim being true. The trigger is structural. Apply to every finding matching both conditions, no self-judged exemptions.

Verify each extracted claim against its primary source in one batch: `scout fetch <official docs URL>` for web docs, `scout repo-read` / `scout repo-overview` for GitHub-hosted sources. Record verbatim quotes to the audit trail scratch. Verifying library API behavior applies `~/.claude/rules/development/SOURCING.md` (framework-behavior authority) at verify-time, the same knowledge /code applies at write-time.

If a primary source is unreachable (paywall, no docs exist, fetch failure), keep the finding but mark it `unverified external claim`. An unverified claim must not serve as Disconfirmation evidence or as the premise of a Next Action.

### Phase 4: Strong Inference (Bug investigation only)

Apply Debug Investigation Protocol from `~/.claude/rules/core/OPERATION.md`.

| Step | Action                                                            |
| ---- | ----------------------------------------------------------------- |
| 1    | Observation                                                       |
| 2    | Pattern analysis (find working similar code, diff against broken) |
| 3    | Generate ≥3 hypotheses                                            |
| 4    | Discriminating test per hypothesis                                |
| 5    | Elimination, then conclusion                                      |
| 6    | Same-origin artifact sweep (below)                                |

Skip when intent is Feature planning or Understanding.

### Same-origin artifact sweep (after root cause confirmed)

A root cause rarely corrupts exactly one file. Sweep the artifacts that share its origin for sibling defects. They may be of a different kind than the root cause (a sibling can violate its consumer's schema while the root cause was a placeholder corruption).

| Step | Action                                                                                                                                                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Locate the commit that introduced the root-cause file (`git log --follow --diff-filter=A`), then enumerate every file in that commit (`git show --stat`)                                                                                                 |
| 2    | If the commit message or file header carries a generation marker ("auto-generated from X", template/deploy notes), add all files originating from X to the sweep                                                                                         |
| 3    | For each sibling, identify its consumer (the action / parser / loader that reads it), fetch the consumer's required spec inline (same scout procedure as Primary-source verification), and check the sibling against it                                  |
| 4    | When siblings cross-reference each other's values (a config's keys / block-list vs a form's options), diff the value sets and flag self-defeating alignments (a block-list containing every selectable value, a reference to a value no sibling defines) |
| 5    | Record per sibling: pass / same-kind defect / different-kind defect, with evidence                                                                                                                                                                       |

### Phase 5: Advisor Pre-Synthesis Check

Invoke `advisor()` with no parameters. Advisor sees full conversation history including Phase 2 answers, Phase 3 findings, and the audit trail scratch.

Skip when all conditions hold.

- Phase 1 hit prior research and current run inherits only
- Intent = Understanding and Domain = General
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

| Error                                       | Action                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Explore returns empty                       | Re-run with broader keywords, note in findings                                                             |
| Intent unclear after Phase 2                | Stop, name the ambiguity, ask user                                                                         |
| Domain glob roots all missing               | Fall back to Domain=General scoping                                                                        |
| scout unavailable (missing / network fails) | Mark affected findings `unverified (tool unavailable)` in Coverage Notes. Never skip verification silently |

## Output

| Item       | Value                                             |
| ---------- | ------------------------------------------------- |
| Session ID | ${CLAUDE_SESSION_ID}                              |
| File       | `.claude/workspace/research/YYYY-MM-DD-<slug>.md` |
| Template   | ${CLAUDE_SKILL_DIR}/templates/research.md         |

## Verification

| Check                                                                                  | Required     |
| -------------------------------------------------------------------------------------- | ------------ |
| OUTCOME.md present (Phase 0)?                                                          | Yes          |
| `Prior research` field filled (slug or `none found`)?                                  | Yes          |
| All findings have explicit sources or "unknown, requires X" notes?                     | Yes          |
| Phase 3 audit trail scratch captured (command + raw output verbatim)?                  | Yes          |
| Cross-method verification performed for "no caller" / "exhaustive enumeration" claims? | Yes (or N/A) |
| Load-bearing external claims verified against primary sources (or marked unverified)?  | Yes (or N/A) |
| Same-origin artifact sweep performed (Bug intent with root cause confirmed)?           | Yes (or N/A) |
| Phase 5 advisor invoked or skip reason recorded?                                       | Yes          |
| Disconfirmation recorded (if Phase 4 skipped)?                                         | Yes          |
| Output saved to `workspace/research/`?                                                 | Yes          |
| Next Steps section in template included?                                               | Yes          |
