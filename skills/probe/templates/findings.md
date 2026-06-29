# Probe Findings Report Template

The template for the findings.md /probe records as it walks the aspect passes. Saved to `/tmp/probe-{repo}-{YYYYMMDD}/findings.md` (ephemeral).

## Template

Replace `{...}` at generation time. Issues is the final output, with no severity rating. Repeat the Issue block per candidate.

```markdown
# /probe Findings: {repo}

- Date: {YYYY-MM-DD}
- Target: {absolute path}
- Outcome source: .claude/OUTCOME.md
- Scope: {e.g., Constraint 1 deep dive, others shallow sample}

## Outcome Recap

<!-- Restate Behavior / Non-goals / Constraints from OUTCOME.md. Anchors the aspect passes. -->

- Behavior: ...
- Non-goals: ...
- Constraints: ...

## Issues

<!-- Issue candidates discovered during aspect passes. This is the final output. No severity, only Category and Body. -->

### Issue-1: {Conventional Commits style draft title}

- Category: Inconsistency (pick from Issue Categories)
- Labels: security, refactor, consistency
- Body:
  - Current: {observed implementation with file:line evidence}
  - Problem: {divergence from OUTCOME / ADR}
  - Proposal: {concrete fix direction}
  - Impact: {effect and effort}

### Issue-2: {title}

- Category: ADR drift
- Labels: docs, ADR drift
- Body:
  - Current: ...
  - Problem: ...
  - Proposal: ...
  - Impact: ...

## Open Questions

<!-- Questions asked one-at-a-time when stuck, with the user response. Durable record. "Unresolved" marker allowed. -->

| ID  | Question                                                      | User Response                   |
| --- | ------------------------------------------------------------- | ------------------------------- |
| Q-1 | Was the truncation signal omission from envelope intentional? | Likely intentional (unverified) |

## /probe Self-Reflection

<!-- Skill behavior log. Question count, friction patterns, Positive issue presence, aspect pass breakage. -->

- Aspect passes: {no breakage / breakage point and cause}
- Questions asked: {N} / aspects: {M}
- Friction patterns: {e.g., recurring terminology drift between ADR and implementation}
- Positive issues: {N}
- New learning: {insight from this dogfood}
```
