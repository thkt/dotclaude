---
description: Validate implementation against SOW acceptance criteria
allowed-tools: Read, Glob, Grep
model: inherit
dependencies: [sow-spec-reviewer]
---

# /validate - SOW Criteria Checker

## Purpose

Display SOW acceptance criteria for manual verification against completed work.

**Simplified**: Manual checklist review tool.

## Functionality

### Display Acceptance Criteria

1. Use Glob to find latest SOW:

   ```text
   Glob pattern: ~/.claude/workspace/planning/**/sow.md
   ```

2. Use Read tool on the most recent file

3. Extract and display "Acceptance Criteria" section

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

## IDR Update & SOW AC Reconciliation

After validation is complete, update the IDR with validation results and reconcile with SOW Acceptance Criteria.

### IDR Requirement Check

Before updating IDR, check if it's required:

1. **Check spec.md** for `idr_required` field (Section 11)
2. **If `idr_required: false`** → Skip IDR update (but still show AC status)
3. **If `idr_required: true` or no spec** → Update IDR

### IDR Detection

For detailed logic: [@../references/commands/shared/idr-generation.md](../references/commands/shared/idr-generation.md)

Search for existing IDR:

1. `~/.claude/workspace/planning/**/idr.md` (SOW-related)
2. `~/.claude/workspace/idr/**/idr.md` (standalone)

### SOW AC ↔ IDR Reconciliation

1. **Read SOW Acceptance Criteria section**
2. **Read IDR implementation records**
3. **For each AC**:
   - Check if implementation evidence exists in IDR
   - Determine PASS/FAIL status
4. **Generate validation report**
5. **Append to IDR /validate section**

### IDR Section Addition

Append `/validate` section to IDR:

```markdown
## /validate - [YYYY-MM-DD HH:MM]

### SOW Acceptance Criteria Validation

| AC ID  | Description | Status | Evidence     |
| ------ | ----------- | ------ | ------------ |
| AC-001 | [summary]   | PASS   | [validation] |
| AC-002 | [summary]   | FAIL   | [validation] |

### Gaps Identified

- [gaps from SOW]

### Sign-off

- Validator: AI
- Confidence: [C: 0.XX]
```

### SOW Update

Update SOW's Implementation Records section with validation status.

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
