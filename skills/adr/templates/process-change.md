# Process Change Template

Document decisions that change a workflow, rule, review procedure, or quality gate.

## When to Use

| Scenario                                      |
| --------------------------------------------- |
| Changing development workflows or conventions |
| Modifying review processes or quality gates   |
| Introducing new rules or deprecating old ones |

## Template-Specific Topics

Place under `## More Information` as `### {topic}`.

| Topic                          | Purpose                                        |
| ------------------------------ | ---------------------------------------------- |
| Current Process vs New Process | Before / After comparison (table)              |
| Transition Plan                | Phased rollout with success criteria per phase |
| Team Impact                    | Affected roles, training needs                 |
| Rollback Plan                  | How to revert if the change fails              |
| Review Schedule                | When to evaluate effectiveness                 |

## Example

````markdown
---
status: "accepted"
date: 2026-01-28
decision-makers: Project owner
---

# Adopt Audience-Optimized Templates

## Context and Problem Statement

SOW, Spec, and ADR serve different audiences, but all templates used the same placeholder-list format. As a result, ADR templates were effectively unused, and 24 SOWs diverged from the template structure. How should we restructure templates to close the gap?

## Decision Drivers

* Structured tables are optimal for AI readers
* Prose and guidelines are optimal for human readers
* Large gap between templates and actual documents

## Considered Options

* Audience-Optimized
* Unified Placeholder Format

## Decision Outcome

Chosen option: "Audience-Optimized", because each document type matches the format that best serves its primary audience.

### Consequences

* Good, because templates are actually used in practice
* Good, because document quality improves
* Bad, because increased template management complexity

### Confirmation

After 1 month, audit ADR usage and SOW divergence. Templates remain in use if usage rate stays above 50%.

## Pros and Cons of the Options

### Audience-Optimized

Keep structured tables for SOW and Spec. Switch ADR to guideline format.

* Good, because optimal format for each document's audience
* Good, because eliminates template-reality gap
* Bad, because reduced uniformity across template types

### Unified Placeholder Format

Keep all templates in placeholder format.

* Good, because consistency
* Bad, because ADR reality gap persists

## More Information

### Current Process vs New Process

| Aspect        | Before                   | After                 |
| ------------- | ------------------------ | --------------------- |
| SOW templates | Excessive IDs (8 types)  | Reality-based (AC-N)  |
| ADR templates | Placeholder lists        | Guidelines + examples |
| Reviewer      | Mismatched with template | Synced with template  |

### Review Schedule

* 1 week. Check template usability.
* 1 month. Quantitative evaluation of SOW and ADR quality.

### Reassessment Triggers

* If template usage rate drops below 50% in new ADRs
````
