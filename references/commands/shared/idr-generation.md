# IDR Generation Logic

Common IDR (Implementation Decision Record) generation and update logic.

## IDR Detection

### SOW-related IDR Detection

```markdown
1. Search for recent SOW:
   Glob pattern: ~/.claude/workspace/planning/**/sow.md
   Sort: by modification time (newest first)

2. If SOW found:
   - IDR path: [SOW directory]/idr.md
   - Check if idr.md exists

3. Return: { sowPath, idrPath, exists }
```

### Standalone IDR Detection

```markdown
1. If no SOW found:
   - Prompt for feature name or infer from context
   - IDR path: ~/.claude/workspace/idr/[feature-name]/idr.md

2. Create directory if not exists

3. Return: { sowPath: null, idrPath, exists }
```

## IDR Generation (/code)

### New IDR Creation

```markdown
1. Get current timestamp: YYYY-MM-DD HH:MM

2. Generate metadata section:
   - Feature name (from SOW or context)
   - SOW link (if exists)
   - Created/Updated timestamps

3. Generate /code section:
   - Changed Files: Extract from git diff or tool results
   - Implementation Decisions: Key choices made during implementation
   - Attention Points: Gotchas, edge cases, review notes
   - Applied Principles: TDD, Occam's Razor, SOLID, etc.
   - Confidence score

4. Write to idr.md using template:
   [@../../../templates/idr/implementation.md](~/.claude/templates/idr/implementation.md)
```

### Changed Files Detection

```bash
# If in git repository
git diff --name-status HEAD

# Parse output:
# A = Added (Created)
# M = Modified
# D = Deleted
```

## IDR Update (/audit, /polish, /validate)

### Section Append Logic

```markdown
1. Read existing idr.md

2. Generate new section with timestamp:

   ## /[command] - [YYYY-MM-DD HH:MM]

3. Append section to end of file

4. Update "Last Updated" in metadata
```

### /audit Section

```markdown
## /audit - [timestamp]

### Review Summary

[Agent review results summary]

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

[AC validation results from SOW]

### Gaps Identified

[Gaps between SOW and implementation]

### Sign-off

[Validation confidence]
```

## SOW Integration

### IDR → SOW Link

In IDR metadata:

```markdown
| SOW | ./sow.md |
```

### SOW → IDR Link

Update SOW's Implementation Records section:

```markdown
## Implementation Records

IDR: `./idr.md`
Status: [x] In Progress

| Phase     | Date       | Confidence |
| --------- | ---------- | ---------- |
| /code     | 2026-01-06 | [C: 0.90]  |
| /audit    | 2026-01-06 | [C: 0.85]  |
| /polish   | -          | -          |
| /validate | -          | -          |
```

## Validation Logic (/validate)

### SOW AC ↔ IDR Reconciliation

```markdown
1. Read SOW Acceptance Criteria section
2. Read IDR implementation records
3. For each AC:
   - Check if implementation evidence exists in IDR
   - Determine PASS/FAIL status
4. Generate validation report
5. Append to IDR /validate section
```

## Error Handling

| Scenario          | Action                                          |
| ----------------- | ----------------------------------------------- |
| No SOW found      | Create standalone IDR in workspace/idr/         |
| IDR not found     | Create new IDR (for /code) or skip (for others) |
| SOW update fails  | Log warning, continue without SOW link          |
| Git not available | Skip changed files detection, use manual input  |

## Related Files

- Template: `~/.claude/templates/idr/implementation.md`
- SOW Template: `~/.claude/templates/sow/workflow-improvement.md`
- Workspace: `~/.claude/workspace/planning/` or `~/.claude/workspace/idr/`
