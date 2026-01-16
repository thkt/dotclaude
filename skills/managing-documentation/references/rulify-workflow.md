# Rulify Workflow

## Flow

```text
ADR (decision) → Rule (enforcement) → CLAUDE.md (integration)

/rulify <ADR-number>
  → Read ADR → Extract rules → Generate file → Update CLAUDE.md
```

## Rule Extraction

| ADR Section  | Rule Content    |
| ------------ | --------------- |
| Decision     | What to enforce |
| Consequences | Why it matters  |
| Context      | When to apply   |

## Rule Template

```markdown
# [Rule Title]

## Rule

[Clear, actionable statement]

## Rationale

[From ADR Decision]

## Examples

### Good

[Compliant]

### Bad

[Non-compliant]

## Related

- ADR: [@../adr/NNNN-slug.md]
```

## Output

| Type      | Location                     |
| --------- | ---------------------------- |
| Rule file | `rules/[category]/[name].md` |
| Reference | CLAUDE.md update             |

## Categories

| Category       | Purpose           |
| -------------- | ----------------- |
| `core/`        | Fundamental rules |
| `guidelines/`  | Best practices    |
| `development/` | Implementation    |
