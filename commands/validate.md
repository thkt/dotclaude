---
description: Validate implementation against SOW acceptance criteria
allowed-tools: Read, Glob, Grep
model: inherit
dependencies: [sow-spec-reviewer, managing-planning]
---

# /validate - SOW Criteria Checker

Display SOW acceptance criteria for manual verification.

## Workflow Reference

**Full workflow**: [@../skills/managing-planning/references/validation-criteria.md](../skills/managing-planning/references/validation-criteria.md)

## Functionality

1. Find latest SOW via Glob
2. Extract Acceptance Criteria section
3. Display as checklist

## Output Format

```text
SOW Validation Checklist

Feature: [Feature Name]

Acceptance Criteria:

[ ] AC-01: [Description]
    Check: [Verification point]

[ ] AC-02: [Description]
    Check: [Verification point]
```

## Manual Process

```text
1. Review Criteria
   └─ Read each AC

2. Test Implementation
   └─ Run and verify each feature

3. Compare Results
   └─ Match behavior to criteria
```

## IDR Update

After validation:

```markdown
## /validate - [YYYY-MM-DD]

| AC ID  | Status | Evidence     |
| ------ | ------ | ------------ |
| AC-001 | PASS   | [validation] |
| AC-002 | FAIL   | [validation] |
```

## Usage

```bash
/validate                 # Latest SOW
/validate "feature-name"  # Specific feature
```

## Related

- `/think` - Create SOW
- `/sow` - View SOW
- `/test` - Automated tests
