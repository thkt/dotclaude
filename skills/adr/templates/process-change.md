# Process Change Template

Document decisions that change a workflow, rule, review procedure, or quality gate.

## When to Use

| Scenario                                      |
| --------------------------------------------- |
| Changing development workflows or conventions |
| Modifying review processes or quality gates   |
| Introducing new rules or deprecating old ones |

## Required Sections (MADR Core)

| # | Section                       | Purpose                                               |
| - | ----------------------------- | ----------------------------------------------------- |
| 1 | Title                         | Action-oriented. Example: `Adopt X process for Y`     |
| 2 | Status                        | `proposed` / `accepted` / `deprecated` / `superseded` |
| 3 | Context and Problem Statement | Why this decision is needed now                       |
| 4 | Decision Drivers              | Factors influencing the choice                        |
| 5 | Considered Options            | Minimum 2 options, each with Good / Bad bullets       |
| 6 | Decision Outcome              | `Chosen option: X, because Y`                         |
| 7 | Consequences                  | Positive and Negative impacts                         |

Metadata line: `- Confidence: {level}. {rationale}`. Reassessment goes in an optional `## Reassessment Triggers` section after Consequences.

## Template-Specific Sections

| Section                        | Purpose                                        |
| ------------------------------ | ---------------------------------------------- |
| Current Process vs New Process | Before / After comparison (table)              |
| Transition Plan                | Phased rollout with success criteria per phase |
| Team Impact                    | Affected roles, training needs                 |
| Rollback Plan                  | How to revert if the change fails              |
| Review Schedule                | When to evaluate effectiveness                 |

## Example

```markdown
# Adopt Audience-Optimized Templates

- Status: accepted
- Deciders: Project owner
- Date: 2026-01-28
- Confidence: medium. Template-reality gap observed. Optimal format unproven.

## Context and Problem Statement

SOW, Spec, and ADR serve different audiences, but all templates used the same placeholder-list format. As a result, ADR templates were effectively unused, and 24 SOWs diverged from the template structure.

## Decision Drivers

- Structured tables are optimal for AI readers
- Prose and guidelines are optimal for human readers
- Large gap between templates and actual documents

## Considered Options

### Audience-Optimized

Keep structured tables for SOW and Spec. Switch ADR to guideline format.

- Good: Optimal format for each document's audience
- Good: Eliminates template-reality gap
- Bad: Reduced uniformity across template types

### Unified Placeholder Format

Keep all templates in placeholder format.

- Good: Consistency
- Bad: ADR reality gap persists

## Decision Outcome

Adopted the audience-optimized approach.

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

- 1 week. Check template usability.
- 1 month. Quantitative evaluation of SOW and ADR quality.

## Reassessment Triggers

- If template usage rate drops below 50% in new ADRs
```
