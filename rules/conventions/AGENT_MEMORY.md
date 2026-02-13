---
paths:
  - ".claude/agents/**"
---

# Agent Memory Convention

## `memory: project` Frontmatter

Enables project-specific pattern retention across sessions.

## Selection Criteria

Assign only when all 3 conditions are met.

| Condition         | Description                                            | Example                              |
| ----------------- | ------------------------------------------------------ | ------------------------------------ |
| Frequency         | Invoked repeatedly across sessions                     | Called on every audit                |
| Project-dependent | Output quality depends on project-specific knowledge   | Naming conventions, allowed patterns |
| Learning benefit  | Memory reduces false positives or improves consistency | Stop re-reporting known exceptions   |

## Current Assignments

| Agent                   | Learned Patterns                                             |
| ----------------------- | ------------------------------------------------------------ |
| security-reviewer       | Accepted security patterns, known false positives            |
| code-quality-reviewer   | Project naming conventions, accepted complexity exceptions   |
| type-safety-reviewer    | Intentional any types, accepted type assertion patterns      |
| silent-failure-reviewer | Intentional error suppression, graceful degradation patterns |
| commit-generator        | Commit message style, scope naming conventions               |

## Exclusion Rationale

| Category                             | Reason                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- |
| devils-advocate                      | Receives other reviewers' findings, own memory causes contradictions    |
| performance / accessibility reviewer | Applies universal standards (WCAG, Web Vitals), low project specificity |
| generators (except commit)           | Low execution frequency, templates suffice                              |

## Security Properties

| Property   | Value                                           |
| ---------- | ----------------------------------------------- |
| Stored     | Analysis patterns, conventions, exception lists |
| Not stored | Raw source code, secrets, credentials           |
| Location   | `.claude/agent-memory/` (recommend gitignore)   |
