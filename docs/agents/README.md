# Agents Directory

## Overview

Directory containing Agent definition files used by Claude Code.

## Directory Structure

```text
agents/
├── README.md                    # This file
├── MODEL_SELECTION_GUIDE.md     # Model selection guide
├── reviewers/                   # Code review agents
│   ├── _base-template.md        # Reviewer base template
│   ├── accessibility.md
│   ├── design-pattern.md
│   ├── document.md
│   ├── performance.md
│   ├── readability.md
│   ├── root-cause.md
│   ├── structure.md
│   ├── subagent.md
│   ├── testability.md
│   └── type-safety.md
├── generators/                  # Code/content generation
│   └── test.md
├── orchestrators/               # Coordination & integration
│   └── audit-orchestrator.md
├── enhancers/                   # Code improvement
│   └── progressive.md
└── git/                         # Git operations
    ├── branch-generator.md
    ├── commit-generator.md
    └── pr-generator.md
```

## Agent File Format

All Agents use YAML frontmatter + Markdown format:

```yaml
---
name: agent-name              # Required: kebab-case
description: >                # Required: Multi-line description
  English description.
tools: Read, Grep, Task       # Required: Available tools
model: sonnet                 # Optional: haiku|sonnet|opus
skills:                       # Optional: Referenced skills
  - skill-name
---

# Agent Content

[Markdown content with instructions]
```

## Creating New Agents

1. **Model Selection**: Refer to [MODEL_SELECTION_GUIDE.md](./MODEL_SELECTION_GUIDE.md)
2. **Template Selection**: Use base-template for the appropriate category
3. **YAML Frontmatter**: name, description, tools are required
4. **Directory Placement**: Place in appropriate category directory
5. **Testing**: Test invocation with Task tool

## Agent Discovery

Agents are dynamically discovered via:

- **Glob**: `~/.claude/agents/**/*.md`
- **Identifier**: `name` field in YAML frontmatter
- **Invocation**: Specified via `subagent_type` parameter

## Category Descriptions

| Category | Purpose | Recommended Model |
| --- | --- | --- |
| reviewers | Code review & analysis | sonnet/haiku |
| generators | Content generation | haiku/sonnet |
| orchestrators | Multi-agent coordination | opus |
| enhancers | Code improvement & optimization | sonnet |
| git | Git operation automation | haiku |

## Related Documents

- [MODEL_SELECTION_GUIDE.md](./MODEL_SELECTION_GUIDE.md) - Model selection criteria
- [reviewers/_base-template.md](./reviewers/_base-template.md) - Reviewer template
- [Skills README](../../skills/README.md) - Integration with skills
