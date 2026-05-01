---
paths:
  - ".claude/agents/**"
---

# Subagent Conventions

Conventions for sub-agent files under `.claude/agents/`.

## YAML Frontmatter

```yaml
---
name: agent-name              # lowercase-hyphens, ≤64 chars
description: Brief summary.   # third person, ≤1024 chars
tools: Read, Grep, Glob       # field name is `tools` (skills use `allowed-tools`)
model: opus                   # sonnet | opus | haiku | inherit | full-id
skills: [skill-name]          # Optional: skill content injected at spawn (plugin form: <plugin>:<skill>)
memory: project               # Optional: user | project | local
background: true              # Optional: boolean
---
```

## Official frontmatter fields

| Field                                   | Required | Notes                                |
| --------------------------------------- | -------- | ------------------------------------ |
| name                                    | Yes      | Lowercase + hyphens                  |
| description                             | Yes      | Used for delegation routing          |
| tools, disallowedTools                  | No       | Comma- or space-separated string     |
| model                                   | No       | Default: `inherit`                   |
| permissionMode, maxTurns                | No       | As needed                            |
| skills                                  | No       | Injects skill contents at spawn time |
| mcpServers, hooks                       | No       | As needed                            |
| memory                                  | No       | `user` / `project` / `local`         |
| background                              | No       | Boolean                              |
| effort, isolation, color, initialPrompt | No       | As needed                            |

## Description

| Field       | Requirement       |
| ----------- | ----------------- |
| description | Third person only |

No `when_to_use` field. Subagents are spawned via the Task tool, not auto-loaded.

## Naming

Pattern: `<role>-<scope>`. Lowercase + hyphens only.

| Role prefix | Purpose               | Example             |
| ----------- | --------------------- | ------------------- |
| architect-  | Design composition    | architect-feature   |
| critic-     | Adversarial challenge | critic-design       |
| enhancer-   | Code refinement       | enhancer-code       |
| evaluator-  | Quality scoring       | evaluator-test      |
| explorer-   | Codebase mapping      | explorer-feature    |
| generator-  | Artifact creation     | generator-test      |
| resolver-   | Error fixing          | resolver-build      |
| reviewer-   | Inspection            | reviewer-security   |
| team-       | Swarm participant     | team-implementation |

## Directory structure

```text
agents/
├── architects/
├── critics/
├── enhancers/
├── evaluators/
├── explorers/
├── generators/
├── resolvers/
├── reviewers/
└── teams/
```

Subdirectories are not part of the official spec. Implementation discovery walks recursively, so this layout works in practice. Re-evaluate if official `agents/` location semantics change.

## Tools format

Use comma- or space-separated string per official spec.

```yaml
tools: Read, Grep, Glob
tools: Read Grep Glob       # also valid
```

Bash matcher syntax (`Bash(yomu:*)`) is supported.

## Model selection

| Need                                                | Recommended  |
| --------------------------------------------------- | ------------ |
| Multi-step instructions, peer DM, shutdown protocol | opus, sonnet |
| Mechanical single-pass output                       | haiku        |
| Match parent context                                | inherit      |

Haiku is excluded from swarm team agents. See `skills/swarm/SKILL.md` for rationale.

## Memory

`memory: project` enables project-specific pattern retention across sessions.

### Selection Criteria

Assign only when all 3 conditions are met.

| Condition         | Description                                            | Example                              |
| ----------------- | ------------------------------------------------------ | ------------------------------------ |
| Frequency         | Invoked repeatedly across sessions                     | Called on every audit                |
| Project-dependent | Output quality depends on project-specific knowledge   | Naming conventions, allowed patterns |
| Learning benefit  | Memory reduces false positives or improves consistency | Stop re-reporting known exceptions   |

### Exclusions by category

23 of 34 agents use `memory: project`. Categories below opt out by design.

| Category   | Reason                                              |
| ---------- | --------------------------------------------------- |
| teams      | Session-only execution; no cross-session continuity |
| critics    | Must remain objective; memory introduces bias       |
| enhancers  | Stateless transformation; no learning benefit       |
| evaluators | Score against fixed metrics; memory shifts baseline |
| generators | Output driven by prompt input only                  |

## References from agent body

| Need                    | Mechanism                                              |
| ----------------------- | ------------------------------------------------------ |
| Reuse skill content     | `skills: [skill-name]` frontmatter (injected at spawn) |
| Cross-file rules / docs | Cite relative path from the agent file; agent resolves to absolute when reading |

## Body structure

No required sections. Common patterns observed across existing agents:

| Section                | Purpose                              |
| ---------------------- | ------------------------------------ |
| Input                  | Task prompt fields the agent expects |
| Constraints / PROHIBIT | What the agent must not do           |
| Workflow / Phases      | Step-by-step actions                 |
| Output                 | DM payload or file artifacts         |
| Error Handling         | Recovery behavior                    |

See existing agents under `agents/` for representative examples.

## Reviewer-specific patterns

| Element     | Convention                                                                    |
| ----------- | ----------------------------------------------------------------------------- |
| Scope       | Single domain, single responsibility; ~80 line target, more for complex specs |
| Frontmatter | `tools`, `model`, `skills`, `memory`                                          |
| Output      | Structured Markdown with `findings` + `summary`                               |

## Size

No hard limit. Keep concise; aim for one-pass readability.

## Security Properties

| Property   | Value                                           |
| ---------- | ----------------------------------------------- |
| Stored     | Analysis patterns, conventions, exception lists |
| Not stored | Raw source code, secrets, credentials           |
| Location   | `.claude/agent-memory/`                         |

Location is registered in `.gitignore` as `/.claude/agent-memory/`.
