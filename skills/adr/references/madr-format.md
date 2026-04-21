# MADR: Markdown Architectural Decision Records

MADR (pronounced "matter") is a streamlined markdown template for recording architectural decisions. Originally "Markdown Architectural Decision Records". From v3.0 the acronym also covers "Markdown Any Decision Records".

## Source

| Topic          | URL                                                                 |
| -------------- | ------------------------------------------------------------------- |
| Official site  | <https://adr.github.io/madr/>                                       |
| Repository     | <https://github.com/adr/madr>                                       |
| Full template  | <https://github.com/adr/madr/blob/develop/template/adr-template.md> |
| Latest release | MADR 4.0.0 (2024-09-17)                                             |

## Key Points

| Aspect      | Convention                                                          |
| ----------- | ------------------------------------------------------------------- |
| Granularity | One markdown file per architectural decision                        |
| Filename    | `NNNN-title-with-dashes.md`. 4-digit number, lowercase dashed title |
| Location    | `docs/decisions/` (MADR default). `doc/adr/` or `adr/` also common  |
| Template    | v4.0 offers `bare` (minimum) and `minimal` (recommended) flavors    |

## Required Sections

| Section                       | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| Title                         | `# {title}`. Short declarative statement      |
| Context and Problem Statement | Why the decision is being made                |
| Considered Options            | Alternatives examined                         |
| Decision Outcome              | Chosen option and the immediate justification |

## Optional Sections

| Section                          | When to include                               |
| -------------------------------- | --------------------------------------------- |
| Decision Drivers                 | Criteria guiding the choice                   |
| Positive / Negative Consequences | Knock-on effects of the decision              |
| Pros and Cons of the Options     | Detailed per-option evaluation                |
| Reassessment Triggers            | Conditions that should prompt a re-evaluation |

## Status Lifecycle

`proposed` → `accepted` → `superseded` when a new ADR supersedes an older one. Other common values are `deprecated` and `rejected`.

## Example

```markdown
# Use Plain JUnit5 for advanced test assertions

## Context and Problem Statement

How to write readable test assertions for advanced tests?

## Considered Options

- Plain JUnit5
- Hamcrest
- AssertJ

## Decision Outcome

Chosen option: "Plain JUnit5", because it is a standard framework and the features of the other frameworks do not outweigh the drawback of adding a new dependency.
```

## Related in This Repo

| Path                  | Role                                       |
| --------------------- | ------------------------------------------ |
| `../../adr/README.md` | Full ADR index (auto-generated)            |
| `../templates/`       | MADR-aligned template files for this skill |
