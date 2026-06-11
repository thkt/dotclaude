---
name: probe
description: Extract repository spec while detecting bugs, spec gaps, and consistency drift via dual-purpose documentation. OUTCOME.md-axis question-driven exploration with ephemeral output. Do NOT use for code review (use /audit or /polish), feature implementation (use /code), planning only (use /think), or single-bug fix (use /fix).
when_to_use: 仕様抽出, 一貫性チェック, ムラ検知, ADR drift, repository spec, バグ発掘, spec gap detection, 暗黙知発掘
allowed-tools: Read Write Edit Bash LS Glob Grep
---

# probe

Trace the repository aspect-by-aspect and surface friction points as issue candidates. The act of "trying to explain" exposes contradictions and gaps. Final output is Issues, no severity rating. Single-file output: findings.md.

## Inputs

No arguments. Target is the entire repository at current working directory. Scope auto-derived from `.claude/OUTCOME.md`.

| Input      | Required | Source                                                 |
| ---------- | -------- | ------------------------------------------------------ |
| OUTCOME.md | Yes      | `.claude/OUTCOME.md` (generate via /outcome if absent) |
| ADR        | Optional | `docs/decisions/`                                      |
| Spec       | Optional | `.claude/workspace/planning/*/spec.md` etc.            |

## Output

File: `/tmp/probe-{repo}-{YYYYMMDD}/findings.md` (ephemeral)

Template: ${CLAUDE_SKILL_DIR}/templates/findings.md

## Process

### Step 1: Outcome Loading

Add each item under Behavior / Non-goals / Constraints in `.claude/OUTCOME.md` to the aspect list. If ADR exists, enumerate headings with status.

### Step 2: Pass-by-Aspect Exploration

Sequential per aspect:

1. Locate implementation matching the aspect
2. Summarize the spec mentally while reading (do not write out)
3. Stop when stuck
4. Record as issue candidate in findings.md Issues section (inline current / problem / proposal / impact in the body)
5. Ask one question if needed
6. Move to next aspect

### Step 3: Inconsistency Sweep

After each aspect pass, detect via grep.

| Target              | Example                                                       |
| ------------------- | ------------------------------------------------------------- |
| Terminology drift   | ADR/README term vs implementation symbol vs test assertion    |
| Concept overlap     | Same name carrying different meaning across fields            |
| Logging hygiene     | Redact wrapper vs raw value in log statements                 |
| ADR Call Site Index | Function names listed in ADR still exist / line numbers drift |

### Step 4: Question Phase

Ask one question only when stuck. Mark as "unresolved" and proceed if no answer. Durably record in findings.md Open Questions.

### Step 5: Self-Reflection

Record skill behavior at the end of findings.md (question count, friction patterns, Positive issue presence, aspect pass breakage).

## Issue Categories

| Category           | What                                                                |
| ------------------ | ------------------------------------------------------------------- |
| Bug candidate      | Implementation flaw leading to misbehavior                          |
| Spec gap           | Expected by OUTCOME / Spec but not reflected in implementation      |
| Non-goals leakage  | Implementation crossing OUTCOME.md Non-goals                        |
| Constraints breach | OUTCOME.md Constraints not honored                                  |
| Inconsistency      | Pattern divergence among same-responsibility code                   |
| ADR drift          | ADR Call Site Index / function names / numbers diverge from current |
| Implicit knowledge | Exists in code but undocumented                                     |
| Positive           | Dynamic verification that OUTCOME / ADR / implementation align      |
