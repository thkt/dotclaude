---
name: formatting-audits
description: >
  Binary Ready/NotReady gate for SOW/Spec. Use when: 設計書レビュー,
  実装可否判定, document gate.
allowed-tools: [Read, Grep, Glob]
agent: sow-spec-reviewer
context: fork
user-invocable: false
---

# SOW/Spec Quality Gate

Binary gate: the spec is either ready for CC to implement without asking, or it
is not. No numeric score.

## Outcome Basis

Goal: every FR / AC produces unambiguous test cases. If CC cannot write a test
from a requirement without an escalation, the spec is NotReady.

Judgment rule: "Can I write the Given/When/Then from this requirement right now,
with observable assertions?" If no → Blocker.

## Priority

| Level | Meaning                                                | Gate          |
| ----- | ------------------------------------------------------ | ------------- |
| P0    | Decision missing or behavior unobservable. CC will escalate | Block (NotReady) |
| P1    | Ambiguous but CC can infer with risk of drift          | Warn          |
| P2    | Quality issue, no implementation impact                | Info          |

Concrete triggers live in `validating-specs` (check-level) and `sow-spec-reviewer`
(document-level). The rule for assigning Priority: replay the judgment above on
the specific finding.

## Gate

| Condition           | Judgment  | Action                              |
| ------------------- | --------- | ----------------------------------- |
| P0 = 0              | Ready     | Proceed to implementation           |
| P0 ≥ 1              | NotReady  | Resolve P0 findings, re-run gate    |

P1/P2 findings are reported for visibility. They never block the gate.

## Finding Format

Every finding must carry Priority + Fix example. A finding without a Fix example
is not actionable and must be rejected as a reviewer error.

| Field    | Requirement                                           |
| -------- | ----------------------------------------------------- |
| Priority | P0 / P1 / P2                                          |
| Location | document:line or section                              |
| CC Impact | What happens when CC reads this (escalates / drifts / ok) |
| Fix      | Concrete rewrite example, not "clarify this"         |

## Legacy Format Handling

Documents written before a template extension may lack a newly-added column.

| State                                        | Treatment                                    |
| -------------------------------------------- | -------------------------------------------- |
| Column exists in table, value empty          | Finding per Priority rules (Check 8 etc.)    |
| Column absent from table structure entirely  | Skip column check. Emit P2 "legacy format — column X missing, migrate when convenient" |

Prevents every pre-existing document from being marked NotReady after template changes.
Applies to all column-completeness checks in `validating-specs` and reviewer agents.

## Delegation

| Concern                             | Skill / Agent             |
| ----------------------------------- | ------------------------- |
| AC-FR traceability, consistency     | `validating-specs`        |
| Document-level review orchestration | `sow-spec-reviewer` agent |
