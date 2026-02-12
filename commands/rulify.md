---
description: Generate project rules from ADR and integrate with CLAUDE.md. Use when user mentions ルール生成, ルール化, ADRからルール, generate rules.
allowed-tools: Read, Write, Edit, Bash(ls:*), Grep, Glob, AskUserQuestion
model: opus
argument-hint: "[ADR number]"
---

# /rulify - Generate Rule from ADR

Convert ADR into AI-executable rule format.

## Input

- ADR number: `$1` (required, e.g., `1` or `0001`)
- If `$1` is empty → list ADRs in `adr/` and select via AskUserQuestion

### ADR Selection

List ADRs in `adr/` → present numbered list via AskUserQuestion.

## Execution

Parse ADR → Determine priority → Generate rule → Integrate with CLAUDE.md.

### Rule Extraction

| ADR Section  | Rule Content    |
| ------------ | --------------- |
| Decision     | What to enforce |
| Consequences | Why it matters  |
| Context      | When to apply   |

### Priority Mapping

| Condition                 | Priority |
| ------------------------- | -------- |
| Security/Auth related     | P0       |
| Language/Framework config | P1       |
| Development process       | P2       |
| Recommendations           | P3       |

## Output

| Type      | Location                     |
| --------- | ---------------------------- |
| Rule file | `rules/[category]/[name].md` |
| Reference | CLAUDE.md update             |

### Categories

| Category       | Purpose           |
| -------------- | ----------------- |
| `core/`        | Fundamental rules |
| `guidelines/`  | Best practices    |
| `development/` | Implementation    |

### Rule File Format

```markdown
# [RULE_NAME_UPPER_SNAKE_CASE]

Priority: P[0-3]
Source: ADR-[number]

## Application Conditions

[When to apply - from ADR "Decision Outcome"]

## Requirements

- [Must do - from ADR decision/rationale]

## Prohibitions

- [Must NOT do - anti-patterns]

## Examples

[Good/Bad code examples]

## References

- ADR: [path to ADR]
```

## Error Handling

| Error         | Resolution        |
| ------------- | ----------------- |
| ADR not found | Check `adr/`      |
| Rule exists   | Confirm overwrite |
| No CLAUDE.md  | Create new file   |
