# GitHub Issue Templates

Structured templates for different issue types.

## Bug Report

```markdown
## Description

[Clear description of the bug]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Environment

- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Version: [e.g., v1.2.3]

## Additional Context

[Screenshots, logs, etc.]
```

## Feature Request

```markdown
## Summary

[Brief description of the feature]

## Problem

[What problem does this solve?]

## Proposed Solution

[How should it work?]

## Alternatives Considered

[Other approaches you thought about]

## Additional Context

[Mockups, examples, references]
```

## Task/Chore

```markdown
## Description

[What needs to be done]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Context

[Why is this needed?]

## Related

- [Links to related issues/PRs]
```

## Label Mapping

| Issue Type    | Labels                    |
| ------------- | ------------------------- |
| Bug           | `bug`, `priority:*`       |
| Feature       | `enhancement`, `feature`  |
| Task          | `task`, `chore`           |
| Documentation | `documentation`           |
| Question      | `question`, `help wanted` |

## Priority Labels

| Label               | Meaning            |
| ------------------- | ------------------ |
| `priority:critical` | Production down    |
| `priority:high`     | Significant impact |
| `priority:medium`   | Normal priority    |
| `priority:low`      | Nice to have       |

## Generation Process

```text
1. Analyze user's description
2. Detect issue type (bug/feature/task)
3. Extract key information
4. Format with appropriate template
5. Suggest labels
```

## gh CLI Commands

```bash
# Create issue
gh issue create --title "Title" --body "Body"

# Create with labels
gh issue create --title "Bug: X" --label "bug,priority:high"

# Create from file
gh issue create --body-file issue.md
```

## Related

- PR descriptions: [@./pr-descriptions.md](./pr-descriptions.md)
