---
description: >
  Validate implementation against SOW acceptance criteria with L2 (practical) validation level.
  Checks acceptance criteria, coverage, and performance. Pass/fail logic with clear scoring.
  Identifies missing features and issues. Use when ready to verify implementation conformance.
  SOWの受け入れ基準に対して実装を検証。受け入れ基準、カバレッジ、パフォーマンスをチェック。
allowed-tools: Read, Bash(ls:*), Bash(cat:*), Grep
model: inherit
---

# /validate - SOW Criteria Checker

## Purpose

Display SOW acceptance criteria for manual verification against completed work.

**Simplified**: Manual checklist review tool.

## Functionality

### Display Acceptance Criteria

```bash
# Show criteria from latest SOW
!`ls -t ~/.claude/workspace/sow/*/sow.md | head -1 | xargs grep -A 20 "Acceptance Criteria"`
```

### Manual Review Process

1. Display SOW criteria
2. Review each item manually
3. Check against implementation
4. Document findings

## Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 SOW Validation Checklist

Feature: User Authentication
Created: 2025-01-14

## Acceptance Criteria:

□ AC-01: User registration with email
  → Check: Does registration form exist?
  → Check: Email validation implemented?

□ AC-02: Password requirements enforced
  → Check: Min 8 characters?
  → Check: Special character required?

□ AC-03: OAuth integration
  → Check: Google OAuth working?
  → Check: GitHub OAuth working?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Manual Review Required:
- Test each feature
- Verify against criteria
- Document any gaps
```

## Usage Examples

### Validate Latest SOW

```bash
/validate
```

Shows acceptance criteria from most recent SOW.

### Validate Specific SOW

```bash
/validate "feature-name"
```

Shows criteria for specific feature.

## Manual Validation Process

### Step 1: Review Criteria

```markdown
- Read each acceptance criterion
- Understand requirements
- Note any ambiguities
```

### Step 2: Test Implementation

```markdown
- Run application
- Test each feature
- Document behavior
```

### Step 3: Compare Results

```markdown
- Match behavior to criteria
- Identify gaps
- Note improvements needed
```

## Integration with Workflow

```markdown
1. Complete implementation
2. Run /validate to see criteria
3. Manually test each item
4. Update documentation with results
```

## Simplified Approach

- **No automation**: Human judgment required
- **Clear checklist**: Easy to follow
- **Manual process**: Thorough verification

## Related Commands

- `/think` - Create SOW with criteria
- `/sow` - View full SOW document
- `/test` - Run automated tests

## Applied Principles

### Occam's Razor

- Simple checklist display
- No complex validation logic
- Human judgment valued

### Single Responsibility

- Only displays criteria
- Validation done manually

### Progressive Enhancement

- Start with manual process
- Automate later if needed
