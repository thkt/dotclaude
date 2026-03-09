---
name: validate
description: Validate implementation against SOW acceptance criteria. Use when user mentions 検証して, 受入確認, バリデーション, validate implementation.
allowed-tools: Read, Glob, Grep, TaskList, TaskUpdate, AskUserQuestion
model: opus
argument-hint: "[feature name]"
user-invocable: true
---

# /validate - SOW Criteria Checker

Display SOW acceptance criteria for manual verification.

## Input

- Feature name: `$1` (optional)
- If `$1` is empty and multiple SOWs exist → select via AskUserQuestion
- If `$1` is empty and single SOW → use latest SOW

### SOW Selection

List SOWs → present as AskUserQuestion options with feature name + status.

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

## Error Handling

| Error                 | Action                                |
| --------------------- | ------------------------------------- |
| No SOW found          | Report "No SOW found" — do NOT pass   |
| SOW has no AC section | Report "No acceptance criteria found" |

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

## Todo Completion

| Condition | Action                             |
| --------- | ---------------------------------- |
| 100% pass | `TaskUpdate` remaining → completed |
| <100%     | Skip                               |

## Output

```markdown
## SOW Validation: [Feature Name]

| AC ID  | Description   | Check          | Status |
| ------ | ------------- | -------------- | ------ |
| AC-001 | [description] | [verification] | [ ]    |
| AC-002 | [description] | [verification] | [ ]    |
```
