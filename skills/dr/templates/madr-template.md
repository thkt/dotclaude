# MADR Template

The template is common to every decision type. The only per-type variation is the recommended topics under More Information; list the ones selected for the decision type as `### {topic}`.

## Template

Replace `{...}` at creation time. Omit a section marked optional, heading included, when there is nothing to write.

```markdown
---
status: "{proposed | rejected | accepted | deprecated | superseded by DR-NNNN}"
date: "{YYYY-MM-DD}"
decision-makers: "{names or roles}"
consulted: "{optional. experts consulted}"
informed: "{optional. stakeholders kept in the loop}"
---

# {Decision title in "Adopt X for Y" form}

## Context and Problem Statement

{Why this decision is needed. May close with a question}

## Decision Drivers

- {Optional. Criteria guiding the choice, as bullets}
  - {Verified. What was run or read, its version and date, and what it showed | Not verified. Why | By policy. Which policy}

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

{Required for each rejected option, optional for the chosen one. Repeat the following per option}

### {option}

{One-line description}

- Good, because {advantage}
- Bad, because {drawback}
  - {Verified. What was run or read, its version and date, and what it showed | Not verified. Why | By policy. Which policy}

## More Information

{Relative original paths and needed versions, scope and conditions, and the Issue/PR confirming agreement. Mark unknowns unconfirmed}

### {Recommended topic by type}

{Only the decision type's recommended topics that apply to the decision. Repeat the ### heading per topic}

### Reassessment Triggers

- {Conditions that reopen the decision}
```
