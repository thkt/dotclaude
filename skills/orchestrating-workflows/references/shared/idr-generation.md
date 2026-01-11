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

```markdown
# IDR: [Feature Name]

| Metadata | Value            |
| -------- | ---------------- |
| Created  | YYYY-MM-DD HH:MM |
| Updated  | YYYY-MM-DD HH:MM |
| SOW      | ./sow.md         |

## /code - [timestamp]

### Changed Files

| Status   | File            |
| -------- | --------------- |
| Created  | src/new-file.ts |
| Modified | src/existing.ts |

### Implementation Decisions

[Key choices made during implementation]

### Attention Points

[Gotchas, edge cases, review notes]

### Applied Principles

- TDD/RGRC cycle
- Occam's Razor
- [Other principles]

### Confidence

[C: 0.XX] - [reasoning]
```

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
## /audit - [timestamp]

### Review Summary

[Agent review results]

### Issues & Actions

[Issues found and actions taken]

### Recommendations Applied

[Applied recommendations]
```

### /polish Section

```markdown
## /polish - [timestamp]

### Removals

[Items removed: comments, code, helpers]

### Simplifications

[Simplifications made]
```

### /validate Section

```markdown
## /validate - [timestamp]

### SOW Acceptance Criteria Validation

[AC validation results]

### Gaps Identified

[Gaps between SOW and implementation]

### Sign-off

[Validation confidence]
```

## SOW Integration

### Bidirectional Links

**IDR → SOW** (in IDR metadata):

```markdown
| SOW | ./sow.md |
```

**SOW → IDR** (in SOW Implementation Records):

```markdown
## Implementation Records

IDR: `./idr.md`
Status: [x] In Progress

| Phase  | Date       | Confidence |
| ------ | ---------- | ---------- |
| /code  | 2026-01-06 | [C: 0.90]  |
| /audit | 2026-01-06 | [C: 0.85]  |
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

- Template: `~/.claude/templates/idr/implementation.md`
- SOW Template: `~/.claude/templates/sow/workflow-improvement.md`
- Workspace: `~/.claude/workspace/planning/`
