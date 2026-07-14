# MADR: Markdown Architectural Decision Records

MADR is a streamlined markdown template for recording architectural decisions. This file assumes v4.

## Key Points

| Aspect      | Convention                                                          |
| ----------- | ------------------------------------------------------------------- |
| Granularity | One markdown file per architectural decision                        |
| Filename    | `nnnn-title-with-dashes.md`. 4-digit number, lowercase dashed title |
| Location    | `docs/decisions/`. The MADR default, fixed by this skill            |

## Required Sections

Confirmation is optional in upstream MADR v4 but treated as required by this skill.

| Section                       | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| Title                         | `# {title}`. Short declarative statement      |
| Context and Problem Statement | Why the decision is being made                |
| Considered Options            | Alternatives examined as a bullet list        |
| Decision Outcome              | Chosen option and the immediate justification |
| Confirmation (under Outcome)  | How to verify implementation matches decision |

## Optional Sections

| Section                      | When to include                             |
| ---------------------------- | ------------------------------------------- |
| Decision Drivers             | Criteria guiding the choice                 |
| Consequences (under Outcome) | `Good, because ...` / `Bad, because ...`    |
| Pros and Cons of the Options | Per-option detail with `### {option}` heads |
| More Information             | Migration plan, triggers, related links     |

## Status Lifecycle

| Status                 | Meaning                                 |
| ---------------------- | --------------------------------------- |
| proposed               | Awaiting review                         |
| accepted               | Approved, implementing or completed     |
| rejected               | Considered but not adopted              |
| deprecated             | Retired without a replacement ADR       |
| superseded by ADR-NNNN | Replaced by another ADR (record the ID) |
