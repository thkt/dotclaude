# Rules/Reference Sync Checklist

## When Updating rules/reference/

### Required Updates

- [ ] Update Japanese version (ja/rules/reference/)
- [ ] Check corresponding section in skills/applying-code-principles/SKILL.md

### Verification Items

| Reference File | SKILL.md Section | Verify |
|----------------|------------------|--------|
| SOLID.md | "1. SOLID Principles" | Summary matches |
| DRY.md | "2. DRY" | Core concepts match |
| OCCAMS_RAZOR.md | "3. Occam's Razor" | Decision criteria match |
| MILLERS_LAW.md | "4. Miller's Law" | Numeric limits match |
| YAGNI.md | "5. YAGNI" | Decision criteria match |

### Update Procedure

1. Update reference/ file
2. Sync ja/reference/
3. Check SKILL.md summary
4. Resolve discrepancies (reference is canonical)

### DRY Principle Consistency

**Intentional Structure**:

- `rules/reference/`: Detailed canonical source (single source of truth)
- `SKILL.md`: Integrated summary (with reference links)

This hierarchical structure is not a DRY violation,
but rather knowledge representation at different abstraction levels.

## Related Documents

- [DOCUMENTATION_RULES.md](../../docs/DOCUMENTATION_RULES.md) - Documentation management rules
- [code-principles SKILL](../../skills/applying-code-principles/SKILL.md) - Principles skill
