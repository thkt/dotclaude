# Standard Workflows

## Quick Reference

| Pattern | Workflow | Tasks |
|---------|----------|-------|
| Bug Investigation | `/research` → `/fix` | 2 |
| Feature Development | `/research` → `/think` → `/code` → `/test` → `/audit` → `/validate` | 6 |
| Emergency Fix | `/hotfix` | 1 |
| Quick Fix | `/fix` | 1 |

## Selection Rules

### Emergency Response

- **Condition**: Production critical issue
- **Workflow**: `/hotfix`
- **TodoWrite**: Single urgent task

### Bug with Unknown Cause

- **Condition**: Need to understand problem first
- **Workflow**: `/research` → `/fix`
- **TodoWrite**: Investigation, then fix

### New Feature

- **Condition**: Adding new capability
- **Workflow**: `/research` → `/think` → `/code` → `/test` → `/audit` → `/validate`
- **TodoWrite**: Investigate, plan, implement, verify, review, validate

### Simple Known Bug

- **Condition**: Clear fix, development environment
- **Workflow**: `/fix`
- **TodoWrite**: Single fix task

## Edge Cases

- **Unclear requirements**: Start with `/research`
- **Complex multi-part**: Break into sub-workflows
- **No match**: Use direct implementation
