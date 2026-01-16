# PR Description

## Template

```markdown
## Summary

- [1-3 bullet points]

## Changes

- [Key changes grouped by area]

## Test Plan

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related

- Closes #123
```

## Section Guide

| Section   | Content                                        |
| --------- | ---------------------------------------------- |
| Summary   | Problem solved, approach, decisions            |
| Changes   | Grouped by component, include breaking changes |
| Test Plan | Automated + manual tests, edge cases           |
| Related   | `Closes #123`, `Fixes #456`, `Related to #789` |

## Generation Process

```text
1. git log main..HEAD (commits)
2. Group by type/scope
3. Extract changes from diffs
4. Generate summary
5. Create test checklist
```

## Git Commands

```bash
git log main..HEAD --oneline      # Commits
git diff main...HEAD --stat       # Summary
git diff main...HEAD              # Details
```

## Good vs Bad

| Good                   | Bad                   |
| ---------------------- | --------------------- |
| Detailed bullet points | "Added auth"          |
| Grouped changes        | "stuff"               |
| Test checklist         | "works on my machine" |
