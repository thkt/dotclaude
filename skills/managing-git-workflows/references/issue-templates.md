# Issue Templates

## Bug Report Template

```markdown
## Description

[Clear description]

## Steps to Reproduce

1. [Step 1] 2. [Step 2]

## Expected vs Actual

- Expected: [what should happen]
- Actual: [what happens]

## Environment

OS: [macOS 14.0] | Browser: [Chrome 120] | Version: [v1.2.3]
```

## Feature Request Template

```markdown
## Summary

[Brief description]

## Problem

[What problem solved?]

## Proposed Solution

[How should it work?]
```

## Task Template

```markdown
## Description

[What needs done]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

## Labels

| Type    | Labels                   |
| ------- | ------------------------ |
| Bug     | `bug`, `priority:*`      |
| Feature | `enhancement`, `feature` |
| Task    | `task`, `chore`          |

| Priority            | Meaning            |
| ------------------- | ------------------ |
| `priority:critical` | Production down    |
| `priority:high`     | Significant impact |
| `priority:medium`   | Normal             |
| `priority:low`      | Nice to have       |

## gh CLI

```bash
gh issue create --title "Title" --body "Body"
gh issue create --label "bug,priority:high"
```
