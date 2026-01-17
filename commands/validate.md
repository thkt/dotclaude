---
description: Validate implementation against SOW acceptance criteria
allowed-tools: Read, Glob, Grep
model: opus
argument-hint: "[feature name]"
---

# /validate - SOW Criteria Checker

Display SOW acceptance criteria for manual verification.

## Input

- No argument: latest SOW
- Argument: specific feature name

## Execution

1. Find SOW via Glob (`.claude/workspace/planning/*/sow.md`)
2. Extract Acceptance Criteria section
3. Validate each AC
4. Display as checklist

## AC Validation

| Check       | Question                     |
| ----------- | ---------------------------- |
| Implemented | Does code implement this AC? |
| Tested      | Do tests validate this AC?   |
| Documented  | Is behavior documented?      |
| Reviewed    | Was it reviewed in /audit?   |

## Pass/Fail Criteria

| Score  | Status | Action                 |
| ------ | ------ | ---------------------- |
| 100%   | PASS   | Ready to ship          |
| 90-99% | WARN   | Review gaps            |
| <90%   | FAIL   | Address before release |

## SOW Status Update

| Score | Status Update                   |
| ----- | ------------------------------- |
| 100%  | Update `Status:` → `completed`  |
| <100% | Keep current status (no change) |

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
