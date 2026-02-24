---
paths:
  - ".claude/agents/**"
---

# Agent Conventions

## `memory: project` Frontmatter

Enables project-specific pattern retention across sessions.

## Selection Criteria

Assign only when all 3 conditions are met.

| Condition         | Description                                            | Example                              |
| ----------------- | ------------------------------------------------------ | ------------------------------------ |
| Frequency         | Invoked repeatedly across sessions                     | Called on every audit                |
| Project-dependent | Output quality depends on project-specific knowledge   | Naming conventions, allowed patterns |
| Learning benefit  | Memory reduces false positives or improves consistency | Stop re-reporting known exceptions   |

## Current Status

`memory: project` is the default for most agents (30/35). Only excluded:

| Agent                  | Reason                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| unit-implementer       | Team agent — works within session only                               |
| progressive-integrator | Team agent — works within session only                               |
| devils-advocate-audit  | Receives other reviewers' findings, own memory causes contradictions |
| devils-advocate-design | Same as above — must remain objective                                |
| evidence-verifier      | Must verify findings without preconceptions                          |

## Reviewer Design Patterns

| Element     | Convention                                      |
| ----------- | ----------------------------------------------- |
| Scope       | Single domain, single responsibility, ~60 lines |
| Frontmatter | `tools`, `model`, `skills`, `context: fork`     |
| Output      | Structured YAML with `findings` + `summary`     |

## Security Properties

| Property   | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Stored     | Analysis patterns, conventions, exception lists                       |
| Not stored | Raw source code, secrets, credentials                                 |
| Location   | `.claude/agent-memory/` (in `.gitignore` as `/.claude/agent-memory/`) |
