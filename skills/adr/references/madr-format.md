# MADR: Markdown Architectural Decision Records

MADR (pronounced "matter") is a streamlined markdown template for recording architectural decisions. From v3.0 the acronym also covers "Markdown Any Decision Records".

## Key Points

| Aspect      | Convention                                                          |
| ----------- | ------------------------------------------------------------------- |
| Granularity | One markdown file per architectural decision                        |
| Filename    | `nnnn-title-with-dashes.md`. 4-digit number, lowercase dashed title |
| Location    | `docs/decisions/` (MADR default and this skill's enforced path)     |
| Templates   | v4 ships full, minimal, bare, bare-minimal flavors                  |

## Required Sections (v4)

| Section                       | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| Title                         | `# {title}`. Short declarative statement      |
| Context and Problem Statement | Why the decision is being made                |
| Considered Options            | Alternatives examined as a bullet list        |
| Decision Outcome              | Chosen option and the immediate justification |

## Optional Sections (v4)

| Section                          | When to include                               |
| -------------------------------- | --------------------------------------------- |
| Decision Drivers                 | Criteria guiding the choice                   |
| Consequences (under Outcome)     | `Good, because ...` / `Bad, because ...`      |
| Confirmation (under Outcome)     | How to verify implementation matches decision |
| Pros and Cons of the Options     | Per-option detail with `### {option}` heads   |
| More Information                 | Migration plan, triggers, related links       |

## YAML Frontmatter (v4, all optional)

```yaml
---
status: "proposed | rejected | accepted | deprecated | superseded by ADR-NNNN"
date: 2026-04-25
decision-makers: list everyone involved
consulted: subject-matter experts (two-way comms)
informed: kept up-to-date (one-way comms)
---
```

| Field           | Notes                                           |
| --------------- | ----------------------------------------------- |
| status          | YAML quotes required. Identifier only, no links |
| date            | YYYY-MM-DD when the decision was last updated   |
| decision-makers | Renamed from `deciders` in v4                   |
| consulted       | RACI-inspired, two-way                          |
| informed        | RACI-inspired, one-way                          |

## Status Lifecycle

| Status                 | Meaning                                 |
| ---------------------- | --------------------------------------- |
| proposed               | Awaiting review                         |
| accepted               | Approved, implementing or completed     |
| rejected               | Considered but not adopted              |
| deprecated             | Retired without a replacement ADR       |
| superseded by ADR-NNNN | Replaced by another ADR (record the ID) |

## Example (Minimal)

```markdown
---
status: "accepted"
date: 2026-04-25
---

# Use Plain JUnit5 for advanced test assertions

## Context and Problem Statement

How to write readable test assertions for advanced tests?

## Considered Options

* Plain JUnit5
* Hamcrest
* AssertJ

## Decision Outcome

Chosen option: "Plain JUnit5", because it is a standard framework and the features of the other frameworks do not outweigh the drawback of adding a new dependency.
```
