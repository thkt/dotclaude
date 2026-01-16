---
description: Generate project rules from ADR and integrate with CLAUDE.md
allowed-tools: Read, Write, Edit, Bash(ls:*), Grep, Glob
model: opus
argument-hint: "[ADR number]"
---

# /rulify - Generate Rule from ADR

Convert ADR into AI-executable rule format.

## Input

- Argument: ADR number (required, e.g., `1` or `0001`)
- If missing: prompt via AskUserQuestion

## Execution

Parse ADR → Determine priority → Generate rule → Integrate with CLAUDE.md.

### Priority Mapping

| Condition                 | Priority |
| ------------------------- | -------- |
| Security/Auth related     | P0       |
| Language/Framework config | P1       |
| Development process       | P2       |
| Recommendations           | P3       |

## Output

```markdown
## Rule Generated

| Item       | Path                    |
| ---------- | ----------------------- |
| ADR        | adr/0001-title.md       |
| Rule       | docs/rules/RULE_NAME.md |
| Integrated | .claude/CLAUDE.md       |
```

## Error Handling

| Error         | Resolution        |
| ------------- | ----------------- |
| ADR not found | Check `adr/`      |
| Rule exists   | Confirm overwrite |
| No CLAUDE.md  | Create new file   |
