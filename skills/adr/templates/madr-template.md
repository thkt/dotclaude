# MADR Template

Every decision type uses the same MADR v4 skeleton. Required sections are common to all types (Title, Context and Problem Statement, Considered Options 2+, Decision Outcome). The only per-type difference is the recommended topics under More Information; include only those that apply to the decision, as `### {topic}`.

## Template

Replace `{...}` at creation time. Omit a section marked optional, heading included, when there is nothing to write.

```markdown
---
status: "{proposed | rejected | accepted | deprecated | superseded by ADR-NNNN}"
date: { YYYY-MM-DD }
decision-makers: { names or roles }
---

# {Decision title in "Adopt X for Y" form}

## Context and Problem Statement

{Why this decision is needed. May close with a question}

## Decision Drivers

- {Optional. Criteria guiding the choice, as bullets}

## Considered Options

- {option 1}
- {option 2. List two or more}

## Decision Outcome

Chosen option: "{chosen option}", because {immediate justification}.

### Consequences

- Good, because {positive consequence}
- Bad, because {negative consequence}

### Confirmation

{How to verify implementation matches the decision. CI command, review procedure, etc.}

## Pros and Cons of the Options

{Optional. Repeat the following per option}

### {option}

{One-line description}

- Good, because {advantage}
- Bad, because {drawback}

## More Information

### {Recommended topic by type}

{Only the decision type's recommended topics that apply to the decision. Repeat the ### heading per topic}

### Reassessment Triggers

- {Conditions that reopen the decision}
```
