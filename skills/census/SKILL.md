---
name: census
description: Discover design decisions that exist in code but have no ADR, and produce an ADR promotion candidate list ranked by impact and reversibility. Pairs with adrift, which scans existing ADRs for drift against code.
when_to_use: 判断未記録の発掘, undocumented decisions, ADR候補発掘, 設計判断棚卸し, decision archaeology, design rationale audit
allowed-tools: Read Write LS Bash(mkdir:*) Bash(date:*) Bash(python3:*) Bash(ugrep:*) Bash(git:*) Task AskUserQuestion
model: opus
argument-hint: "[file or directory]"
---

# /census - ADR Gaps Audit

Discover design decisions that exist in the code but have no ADR. Produce a ranked list of ADR promotion candidates so the next refactor has a complete decision baseline.

## Input

`$ARGUMENTS` is an optional path naming the audit scope. No argument means the whole repository (Phase 1 lists source files, Phase 2 lists docs); a file path mines that file alone (skipping the doc phases if it is a source file); a directory path limits Phase 1 / Phase 2 to that subtree. When scoped to a path, the result is a partial decision baseline, so record the target in the report Summary's Scope row.

## Decision Criteria

All judgment criteria (impact / reversibility, the incomplete-contract definition, the ADR worth heuristic, the challenge angles) live in `${CLAUDE_SKILL_DIR}/references/decision-criteria.md`. Each phase applies it as the basis for judgment.

## Phase 1: Source File Listing

If a file is named directly, skip this phase and pass that file to Phase 3. Otherwise run `python3 ${CLAUDE_SKILL_DIR}/scripts/list-source-files.py <scope>` to list the source files (`<scope>` is the directory when one is given, the repository root when no argument is passed).

When the file count is large (guideline 20+, adjust to repository size), confirm focus via AskUserQuestion before the Phase 3 reviewer fan-out (subdirectory / top-N / a specific module). At or below the guideline, skip the focus prompt and pass the full list to Phase 3.

## Phase 2: Document Detection

Skip this phase when the target is a single source file. With a directory target, scope to that subtree; with no argument, scan top-level and `docs/`. Look for decision-bearing documents using the patterns in `${CLAUDE_SKILL_DIR}/references/detection-targets.md`.

## Phase 3: Source File Decision Mining

Gather evidence from two channels per source file. The reviewer covers code-internal evidence, census covers git history; both are recorded in a shared format and then cross-referenced against ADRs.

### 3a Reviewer mining

For each source file, spawn the reviewer subagent matching its language via Task. The reviewer answers the following.

- Why does this file have this granularity and shape?
- What invariant or contract does it carry that a reader cannot derive from the code?
- Is there a comment or module-doc that records the rationale?
- Does the comment describe only the current state and omit the rule for future contributors? (the `incomplete-contract` pattern)

### 3b Commit message mining

The reviewer has no git access, so census itself runs `git log --follow --format='%h %s' -- <file>` and extracts commits containing decision verbs (list in detection-targets.md). Commit messages are often the primary record of the "why" a comment omits, either corroborating a 3a finding or surfacing a standalone decision.

### 3c Recording and ADR cross-reference

Record each finding as `file:line` + decision summary + evidence (comment/naming/module-doc/commit) + `documented?` + `incomplete-contract?`. Commit-sourced findings use `commit <sha>` as evidence. After collecting findings, cross-reference against the ADR directory if any, and drop findings already covered by an ADR (record the count as "ADR-covered (excluded)" in the summary).

## Phase 4: Prose Decision Extraction

For each detected document, find sentences containing decision verbs (list in detection-targets.md); each match is a candidate. Then for each candidate, search the ADR directory (if any) for cross-reference. Drop candidates already covered by an ADR.

## Phase 5: Ranking and Challenge

### 5a Tagging and Initial Ranking

Tag each candidate from Phase 3 and Phase 4 with impact and reversibility. ADR promotion candidates satisfy `(impact = H) AND (reversibility = low OR medium)`.

Findings with `incomplete-contract=Yes` are promoted regardless of `documented?` value. Other findings are recorded but not promoted (informational).

### 5b Devil's Advocate Challenge

Spawn `critic-design` via Task with the initial promotion candidate list and `${CLAUDE_SKILL_DIR}/references/decision-criteria.md`. `critic-design` challenges each candidate with the challenge angles and returns one of the Verdict values (`keep` / `downgrade` / `drop`) defined in `${CLAUDE_SKILL_DIR}/references/decision-criteria.md`. Record the verdict alongside the initial ranking.

## Phase 6: Report Output

Write the report following `${CLAUDE_SKILL_DIR}/templates/report-template.md`, substituting placeholders from findings. Add a single repo-wide summary line `keep N / downgrade N / drop N` right after the ADR Promotion Candidates table. After writing, print a console summary: candidate count, ADR promotion candidate count.

```bash
mkdir -p docs/audit
STAMP=$(date -u +%Y-%m-%d-%H%M%S)  # UTC date + HHMMSS; same-day reruns never collide
REPORT="docs/audit/${STAMP}-adr-gaps.md"
```

## Hand-off

- Print only the post-challenge `keep` candidates and offer `/adr` for each, or aggregate them into a single tracking issue via `/issue`
- List `downgrade` candidates as comment-strengthening tasks (not ADRs). Record `drop` candidates in the report only, not as follow-up
- This skill only mines and nominates. ADR drafting goes to `/adr`, drift scan against existing ADRs to `/adrift`, code changes and README updates are out of scope
- In a repo that already has ADRs, run `/adrift` first, then use this skill to mine the gaps drift cannot see

## Completion Criteria

Finish only when all of the following hold. Record the reason for any unmet item in the report.

| Item        | Condition                                                                             |
| ----------- | ------------------------------------------------------------------------------------- |
| Report      | `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md` exists                                 |
| Source file | Every reviewed file is accounted for (no-decision files may be batched into one line) |
| Document    | Every scanned document has an extraction section (or "no decisions found")            |
| Tags        | Every candidate has impact + reversibility                                            |
| Candidates  | ADR promotion candidates listed at the end with a one-line rationale                  |
