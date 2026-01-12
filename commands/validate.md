---
description: Validate implementation against SOW acceptance criteria
allowed-tools: Read, Glob, Grep
model: opus
argument-hint: "[feature name]"
dependencies: [sow-spec-reviewer, managing-planning]
---

# /validate - SOW Criteria Checker

Display SOW acceptance criteria for manual verification.

## Input

- No argument: latest SOW
- Argument: specific feature name

## Execution

1. Find SOW via Glob (`.claude/workspace/planning/*/sow.md`)
2. Extract Acceptance Criteria section
3. Display as checklist

## Output

```markdown
## SOW Validation: [Feature Name]

| AC ID  | Description   | Check          | Status |
| ------ | ------------- | -------------- | ------ |
| AC-001 | [description] | [verification] | [ ]    |
| AC-002 | [description] | [verification] | [ ]    |
```

## IDR

Append `/validate` section to IDR:

```markdown
## /validate - [YYYY-MM-DD]

| AC ID  | Status | Evidence     |
| ------ | ------ | ------------ |
| AC-001 | PASS   | [validation] |
| AC-002 | FAIL   | [validation] |
```
