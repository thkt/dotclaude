---
status: "accepted"
date: 2026-04-04
decision-makers: thkt
---

# Record convergence signals in audit/verify dedup and move reconciliation into enhancer-evidence

## Context and Problem Statement

/audit and /verify pipelines deduplicate findings by `file:line:category`, keeping the highest severity. When multiple reviewers flag the same location with different severities, the rationale for the upgrade is lost. Additionally, cross-finding reasoning (one domain's finding changing the impact assessment of another's) has no structural mechanism. In /verify, the reconciliation of challenger + verifier output is expected by enhancer-evidence but not explicitly assigned.

## Decision Drivers

- Severity upgrades during dedup are silent — no audit trail
- Cross-domain findings at the same location are a convergence signal that should influence prioritization
- enhancer-evidence assumes pre-reconciled input, but /verify SKILL.md does not assign reconciliation to any component
- /audit (static-only) and /verify (static + dynamic) have structurally different confidence requirements

## Considered Options

### A: Minimal — add `reviewer_count` field to dedup

Use a single `reviewer_count` field as a tiebreaker in the Prioritize scoring formula.

- Good: One field, no new sub-steps
- Bad: Does not capture which reviewers disagreed or why
- Bad: Does not enable cross-finding reasoning

### B: Record severity discrepancies + add cross-finding reasoning + clarify reconciliation ownership

Add `severity_upgraded` and `original_severities` to dedup output. Add a severity re-evaluation sub-step in Correlate that requires explicit cross-domain reasoning. Move reconciliation into enhancer-evidence.

- Good: Full audit trail for severity changes
- Good: Cross-finding reasoning is explicit and citation-required
- Good: Reconciliation ownership is unambiguous
- Bad: More text in agent definitions

### C: Unify integrator logic into shared canonical spec

Extract dedup, reconciliation, and root cause logic into a shared reference, used by both integrators.

- Good: DRY
- Bad: Constrains independent evolution of /audit vs /verify pipelines
- Bad: YAGNI — the two integrators handle different evidence types

## Decision Outcome

Adopted option B. The additional text in agent definitions is justified by the audit trail and explicit reasoning it produces. Option A was too lossy. Option C was rejected because the two integrators intentionally diverge (confidence floors, evidence types).

### Positive Consequences

- Severity upgrades during dedup now have a traceable rationale
- Cross-finding reasoning is citation-required, preventing count-based auto-escalation
- enhancer-evidence owns reconciliation end-to-end, removing the ambiguity in /verify Phase 3
- Confidence floor divergence (0.60 in team-integration, 0.70 in enhancer-evidence) is preserved as intentional

### Negative Consequences

- Reconciliation rules are now duplicated between team-integration and enhancer-evidence (enhancer-evidence references team-integration as canonical)

## Architecture Diagram

```text
/audit pipeline:
  reviewers → challenger + verifier → team-integration
                                       ├── Clean: dedup + severity_upgraded (G1)
                                       ├── Correlate: convergence + re-evaluation (G2)
                                       ├── Synthesize: root causes
                                       └── Prioritize: score

/verify pipeline:
  reviewers + Codex + build/test → adversarial + challenger + verifier
                                                        ↓ (raw output)
                                              enhancer-evidence
                                               ├── Reconcile (G3, owns rules)
                                               ├── Merge
                                               ├── Correlate: cross-evidence + re-evaluation (G2)
                                               ├── Synthesize: dedup + severity_upgraded (G1) + root causes
                                               ├── Score: Trust Score
                                               └── Report
```

## Quality Attributes

| Attribute    | Priority | Approach                                                  |
| ------------ | -------- | --------------------------------------------------------- |
| Traceability | High     | severity_upgraded + original_severities on every dedup    |
| Correctness  | High     | Citation-required re-evaluation prevents false escalation |
| Independence | Medium   | Confidence floors remain pipeline-specific                |

## Trade-offs

- Reconciliation rules appear in two files, but enhancer-evidence treats team-integration as canonical source
- Re-evaluation sub-step adds processing, but prevents silent misjudgment

## Implementation Guidelines

- team-integration Clean step 1a: record severity_upgraded + original_severities
- team-integration Correlate step 4a: cross-finding reasoning with citation
- enhancer-evidence Phase 2: reconciliation (team-integration rules)
- enhancer-evidence Phase 5 step 1a, 4a: same as team-integration
- /verify SKILL.md Phase 3: input changed to raw challenger + verifier output
- 2× medium ≠ high: count alone never justifies severity upgrade

## Reassessment Triggers

- If reconciliation rules diverge between the two integrators beyond the confidence floor difference
- If the severity re-evaluation sub-step produces too many false upgrades in practice
