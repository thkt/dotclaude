---
name: research
description: Probe project and technical questions. Findings are positions to be challenged with explicit sources, not conclusions. Phase 6 advisor pass argues against the synthesis before it lands. Do NOT use for design planning or SOW / Spec generation (use /think instead).
when_to_use: 調査して, 調べて, リサーチ, investigate, 分析して, issueやろう, issue見て, 横並びチェック, 類似パターン検出, refactor 横展開
allowed-tools: Bash(tree:*) Bash(git log:*) Bash(git diff:*) Bash(git show:*) Bash(wc:*) Bash(scout:*) Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash(codegraph:*) Bash(node:*) WebFetch WebSearch
model: opus
context: fork
argument-hint: "[research subject or question]"
---

# /research - Project & Technical Investigation

Investigate codebase with source-based findings, without implementation. Findings are positions to be challenged. Phase 6 advisor pass argues against the synthesis before it lands.

## Input

The research subject is taken from `$ARGUMENTS`, a required free-text topic or question. If empty, prompt via AskUserQuestion.

## Phase 1: Outcome Anchor

Read `.claude/OUTCOME.md`. If absent, generate the stub via /outcome. Confirm the investigation scope aligns with the outcome state. If the investigation steps into Non-goals, confirm with the user before proceeding.

## Phase 2: Prior Research Scan

Derive the lowercase hyphenated subject slug from `$ARGUMENTS`. Run `bfs .claude/workspace/research -name '*<slug>*.md'`. If no match, skip and note "No prior research found for `<slug>`". For each match, the table below shows the carry-forward mapping.

| Extract                 | Carry to | Handling                           |
| ----------------------- | -------- | ---------------------------------- |
| Key Findings table      | Phase 7  | Re-verify or supersede as baseline |
| Constraints table       | Phase 4  | Use as input, do not re-discover   |
| Disconfirmation results | Phase 7  | Reference                          |

## Phase 3: Intent and Domain Clarification

Skip if `$ARGUMENTS` clearly indicates both. Otherwise ask via AskUserQuestion. Domain drives Phase 4 scoping. Domain=General applies no scoping.

| Question        | Options                                              |
| --------------- | ---------------------------------------------------- |
| Research intent | Feature planning / Bug investigation / Understanding |
| Domain          | Data model / API / Infrastructure / General          |

## Phase 4: Domain-Scoped Parallel Investigation

Launch Explore / ugrep / bfs / Read in parallel. For Feature planning or Bug investigation intent, also invoke `Task(subagent_type: explorer-feature, run_in_background: false)` to trace execution paths and map architecture. Feature planning traces the prospective path, Bug investigation the failing path. Include the research subject title verbatim in the spawn prompt. Instruct explorer-feature to return its result as a single JSON object `{ findings: [{ statement: string, source: string }] }`. If Explore returns empty, re-run with broader keywords. State the source for each finding in place: facts `file:line`, inferences `inferred from X`, unverified `unknown, requires X`. Also append each command and its raw output verbatim to the scratch. This is the audit trail; Phase 7 Disconfirmation quotes it directly and does not reconstruct.

When the repo has a `.codegraph/` index, refresh it with `codegraph sync`, then resolve structural questions such as who calls, what breaks, and which tests are affected with codegraph first. Get callers with `codegraph callers <symbol>` and the blast radius plus affected tests with `codegraph impact <symbol>`, and cite that output as the finding's source. A ugrep / grep search for the symbol name is not accepted as a source for these questions. In a repo without the index, do not init unprompted; fall back to Explore / ugrep. Use ugrep / grep only for free-text content search.

Scope every search by Domain using the roots and terms below. Pass the roots to Explore in its prompt, append the terms to ugrep / bfs, and start Read from the roots. If a Domain's glob roots are all missing, fall back to General.

| Domain         | Glob roots                                                      | Domain-aligned terms            |
| -------------- | --------------------------------------------------------------- | ------------------------------- |
| Data model     | `schema/`, `models/`, `db/`, `drizzle/`, `prisma/`, `*.sql`     | model, migration, table, column |
| API            | `routes/`, `handlers/`, `controllers/`, `api/`, `server/`       | endpoint, route, handler        |
| Infrastructure | `terraform/`, `infra/`, `ci/`, `.github/`, `deploy/`, `docker/` | pipeline, deploy, provision     |
| General        | No scoping. Let Explore find                                    | none                            |

### Verification

At the close, apply the checks in `${CLAUDE_SKILL_DIR}/references/verification.md`. Use Cross-method verification for exhaustiveness findings and primary-source verification for external-behavior claims, structurally, with no self-judged exclusion of a finding. Verifying library API behavior applies `~/.claude/rules/development/SOURCING.md`. When scout is unavailable (missing / network fails), fall back to WebFetch / WebSearch.

## Phase 5: Strong Inference (Bug investigation only)

Skip when intent is Feature planning or Understanding. Apply `~/.claude/rules/core/OPERATION.md § Debug Investigation Protocol` to eliminate the bug, then once the root cause is confirmed, run `${CLAUDE_SKILL_DIR}/references/verification.md § Same-origin sweep`.

## Phase 6: Advisor Pre-Synthesis Check

Invoke `advisor()` with no parameters. Advisor sees full conversation history including Phase 3 answers, Phase 4 findings, and the audit trail scratch. If it flags a missed area or weak inference, return to Phase 4 to narrow the scoping.

Skip the invocation when all conditions hold, and record the skip reason in the output.

- Phase 2 hit prior research and the current run inherits only
- Intent is Understanding and Domain is General
- No claim crosses a repository boundary or drives PR scope

## Phase 7: Synthesis

1. If Phase 2 found prior research, integrate the inherited findings / constraints into Key Findings, marking each re-verified or superseded
2. Confirm each finding carries a source in the Phase 4 format. Back facts with `file:line` or command output; mark gaps `unknown, requires X`
3. Record Disconfirmation. If Phase 5 ran, write `Covered by Phase 5 elimination`; if skipped, quote the command and raw output from the scratch verbatim. Treat 0 hits as possible tool misuse before absence.
4. Confirm every Phase 3 question is answered or recorded as `unknown, requires X`.

## Output

Generate the report following the skeleton in `${CLAUDE_SKILL_DIR}/templates/research.md`, fill in `${CLAUDE_SESSION_ID}`, and save to `.claude/workspace/research/YYYY-MM-DD-<slug>.md`.

## Completion Criteria

Not done until all are satisfied. An item whose Condition carries "(...)" is required only when applicable.

| Item              | Condition                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| OUTCOME           | `.claude/OUTCOME.md` present (Phase 1)                                                             |
| Prior research    | `Prior research` field filled with the slug or `none found`                                        |
| Source            | Every finding has an explicit source or an `unknown, requires X` note                              |
| Audit trail       | Phase 4 scratch captured with commands and raw output verbatim                                     |
| Cross-method      | Cross-method verification performed for exhaustiveness claims (when such a claim exists)           |
| Primary source    | Load-bearing external claims verified against primary sources, or marked unverified (when present) |
| Same-origin sweep | Sweep performed when Bug intent confirmed a root cause (when applicable)                           |
| advisor           | Phase 6 advisor invoked, or skip reason recorded                                                   |
| Save              | Output saved to `workspace/research/`                                                              |
