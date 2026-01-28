# Process Change Template

Guide for documenting workflow, rule, or process change decisions.

## When to Use

- Changing development workflows or conventions
- Modifying review processes or quality gates
- Introducing new rules or deprecating old ones

## Required Sections

All ADRs must include these MADR core sections:

1. **Title** — Action-oriented: "Adopt X process for Y"
2. **Status** — proposed | accepted | deprecated | superseded
3. **Context and Problem Statement** — Why this decision is needed now
4. **Decision Drivers** — Factors influencing the choice
5. **Considered Options** — Minimum 2 options with Pros/Cons
6. **Decision Outcome** — "Chosen option: X, because Y"
7. **Consequences** — Positive and Negative impacts

## Template-Specific Sections

In addition to the core sections, include:

- **Current Process vs New Process** — Before/After comparison
- **Transition Plan** — Phased rollout with success criteria
- **Team Impact** — Affected roles, training needs
- **Rollback Plan** — How to revert if the change fails
- **Review Schedule** — When to evaluate effectiveness

## Example

```markdown
# Adopt Audience-Optimized Templates

- Status: accepted
- Deciders: Project owner
- Date: 2026-01-28

## Context and Problem Statement

SOW/Spec/ADR serve different audiences, but all templates used the
same placeholder-list format. As a result, ADR templates were effectively
unused, and 24 SOWs diverged from the template structure.

## Decision Drivers

- Structured tables are optimal for AI readers
- Prose and guidelines are optimal for human readers
- Large gap between templates and actual documents

## Considered Options

### Audience-Optimized

Keep structured tables for SOW/Spec; switch ADR to guideline format.

- Good: Optimal format for each document's audience
- Good: Eliminates template-reality gap
- Bad: Reduced uniformity across template types

### Unified Placeholder Format

Keep all templates in placeholder format.

- Good: Consistency
- Bad: ADR reality gap persists

## Decision Outcome

Adopted audience-optimized approach.

### Positive Consequences

- Templates are actually used in practice
- Document quality improves

### Negative Consequences

- Increased template management complexity

## Current Process vs New Process

| Aspect        | Before                   | After                 |
| ------------- | ------------------------ | --------------------- |
| SOW templates | Excessive IDs (8 types)  | Reality-based (AC-N)  |
| ADR templates | Placeholder lists        | Guidelines + examples |
| Reviewer      | Mismatched with template | Synced with template  |

## Review Schedule

- 1 week: Check template usability
- 1 month: Quantitative evaluation of SOW/ADR quality
```
