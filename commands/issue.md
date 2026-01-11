---
description: Generate GitHub Issue with structured title and body
allowed-tools: Task
model: inherit
dependencies: [issue-generator, utilizing-cli-tools, managing-git-workflows]
---

# /issue - GitHub Issue Generator

Generate well-structured GitHub Issues.

## Workflow Reference

**Full format**: [@../skills/managing-git-workflows/references/issue-templates.md](../skills/managing-git-workflows/references/issue-templates.md)

## How It Works

Delegates to `issue-generator` subagent:

1. Analyzes provided description
2. Generates structured title and body
3. Optionally creates via `gh issue create`

## Usage

```bash
/issue "Login button not working"          # Basic
/issue bug "API returns 500"               # With type
/issue --create "Database timeout"         # Create directly
```

## Issue Format

### Title

```text
[type] Brief, specific description
```

### Body

```markdown
## Description

[Problem statement]

## Steps to Reproduce (for bugs)

1. [Step]

## Acceptance Criteria

- [ ] [Criterion]
```

## Context Efficiency

- No codebase files loaded
- Fast execution (<5 seconds)

## Related

- `/branch` - Create branch from issue
- `/commit` - Reference issue in commits
- `/pr` - Link PR to issue
