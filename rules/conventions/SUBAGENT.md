---
paths:
  - ".claude/agents/**"
---

# Subagent Definition

Conventions for sub-agent files under `.claude/agents/`.

## Memory

`memory: project` frontmatter enables project-specific pattern retention across sessions.

### Selection Criteria

Assign only when all 3 conditions are met.

| Condition         | Description                                            | Example                              |
| ----------------- | ------------------------------------------------------ | ------------------------------------ |
| Frequency         | Invoked repeatedly across sessions                     | Called on every audit                |
| Project-dependent | Output quality depends on project-specific knowledge   | Naming conventions, allowed patterns |
| Learning benefit  | Memory reduces false positives or improves consistency | Stop re-reporting known exceptions   |

### Exclusions

Default is `memory: project` (30/35 agents).

| Agent               | Reason                                                 |
| ------------------- | ------------------------------------------------------ |
| team-implementation | Team agent, works within session only                  |
| team-integration    | Team agent, works within session only                  |
| critic-audit        | Receives other reviewers' findings, memory causes bias |
| critic-design       | Same as above, must remain objective                   |
| critic-evidence     | Must verify findings without preconceptions            |

## Reviewer Design Patterns

| Element     | Convention                                      |
| ----------- | ----------------------------------------------- |
| Scope       | Single domain, single responsibility, ~60 lines |
| Frontmatter | `tools`, `model`, `skills`, `context: fork`     |
| Output      | Structured Markdown with `findings` + `summary` |

## Security Properties

| Property   | Value                                           |
| ---------- | ----------------------------------------------- |
| Stored     | Analysis patterns, conventions, exception lists |
| Not stored | Raw source code, secrets, credentials           |
| Location   | `.claude/agent-memory/`                         |

Location is registered in `.gitignore` as `/.claude/agent-memory/`.
