# IDR (Implementation Decision Record) Generation

Common IDR generation and update logic for implementation commands.

## IDR Overview

IDR tracks implementation decisions throughout the development lifecycle.

| Command     | IDR Action              |
| ----------- | ----------------------- |
| `/code`     | Creates with decisions  |
| `/audit`    | Appends review findings |
| `/polish`   | Appends simplifications |
| `/validate` | Reconciles with SOW AC  |

**Location**: `~/.claude/workspace/planning/[feature]/idr.md`

## IDR Detection

### SOW-related Detection

```text
1. Search: ~/.claude/workspace/planning/**/sow.md
   Sort: by modification time (newest first)

2. If SOW found:
   IDR path: [SOW directory]/idr.md

3. Return: { sowPath, idrPath, exists }
```

### Standalone Detection

```text
1. If no SOW:
   Prompt for feature name or infer from context
   IDR path: ~/.claude/workspace/idr/[feature-name]/idr.md

2. Create directory if not exists
```

## IDR Generation (/code)

### New IDR Structure

Template: [@../../../../templates/idr/template.md](../../../../templates/idr/template.md)

Sections created: Changed Files, Key Decisions, Notes, Reviewer Attention

### Changed Files Detection

```bash
# From git
git diff --name-status HEAD

# Parse:
# A = Added (Created)
# M = Modified
# D = Deleted
```

## IDR Update (/audit, /polish, /validate)

### Section Append Logic

```text
1. Read existing idr.md
2. Generate new section with timestamp
3. Append to end of file
4. Update "Last Updated" in metadata
```

### /audit Section

```markdown
## /audit - YYYY-MM-DD HH:MM

### Summary

| Severity | Count | Resolved |
| -------- | ----- | -------- |
| Critical | 0     | 0        |
| High     | 0     | 0        |

### Issues

| #   | Issue   | Severity | Location    | Action         |
| --- | ------- | -------- | ----------- | -------------- |
| 1   | [issue] | High     | [file:line] | Fixed/Deferred |

### Notes

[Findings, patterns observed, recommendations for future]
```

### /polish Section

```markdown
## /polish - YYYY-MM-DD HH:MM

### Removals

| Item   | Type         | Reason   |
| ------ | ------------ | -------- |
| [item] | Comment/Code | [reason] |

### Simplifications

[Description of simplifications made]
```

### /validate Section

```markdown
## /validate - YYYY-MM-DD HH:MM

### Acceptance Criteria

| AC     | Status    | Evidence     |
| ------ | --------- | ------------ |
| AC-001 | PASS/FAIL | [validation] |

### Gaps

[Any gaps between SOW and implementation]

### Sign-off

[Final notes, remaining concerns, or confirmation]
```

## SOW Integration

### Bidirectional Links

**IDR → SOW** (in IDR metadata):

```markdown
SOW: ./sow.md
```

**SOW → IDR** (in SOW Implementation Records):

```markdown
## Implementation Records

IDR: `./idr.md`
Status: [x] In Progress
```

## Validation Logic (/validate)

### SOW AC ↔ IDR Reconciliation

```text
1. Read SOW Acceptance Criteria section
2. Read IDR implementation records
3. For each AC:
   - Check if implementation evidence exists
   - Determine PASS/FAIL status
4. Generate validation report
5. Append to IDR /validate section
```

## Error Handling

| Scenario          | Action                                      |
| ----------------- | ------------------------------------------- |
| No SOW found      | Create standalone IDR in workspace/idr/     |
| IDR not found     | Create new (for /code) or skip (for others) |
| SOW update fails  | Log warning, continue without SOW link      |
| Git not available | Skip changed files, use manual input        |

## Related Files

- Template: `~/.claude/templates/idr/template.md`
- SOW Template: `~/.claude/templates/sow/template.md`
- Workspace: `~/.claude/workspace/planning/`
