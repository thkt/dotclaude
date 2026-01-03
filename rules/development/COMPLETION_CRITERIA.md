# Completion Criteria (Shared)

Common completion standards used across commands.

## Confidence Metrics

Confidence level indicates certainty about implementation:

| Level | Marker | Range | Action |
| --- | --- | --- | --- |
| High | **[✓]** | >0.8 | Proceed normally |
| Medium | **[→]** | 0.5-0.8 | Add defensive checks |
| Low | **[?]** | <0.5 | Research before implementing |

**Target**: Overall confidence ≥0.9 for completion.

## Quality Gates

All implementations must pass:

### Critical (Must Pass)

- [Required] **All tests passing** - Exit code: 0
- [Required] **No lint errors** - 0 errors (warnings <5 acceptable)
- [Required] **No type errors** - TypeScript passes
- [Required] **No regressions** - Related features work

### Recommended

- [Optional] **Coverage ≥80%** - For new code
- [Optional] **Documentation updated** - If behavior changed
- [Optional] **Consistent with codebase** - Follow existing patterns

## Output Format

Use confidence markers in reports:

```markdown
- ✅ Feature works as specified [C: 0.93]
- ⚠️ Edge case handling [C: 0.75]
- ❌ Error handling incomplete [C: 0.40]
```

## Applied Principles

Document which principles guided implementation:

- **Occam's Razor**: Simplest solution chosen
- **TIDYINGS**: Only touched relevant code
- **Progressive Enhancement**: CSS-first for UI
- **DRY**: Identified pattern duplication

## Escalation

When confidence < 0.7:

| Current Command | Escalation Path |
| --- | --- |
| `/fix` | → `/research` or `/think` |
| `/code` | → `/research` for deeper understanding |

## Related Principles

- [@./PROGRESSIVE_ENHANCEMENT.md](./PROGRESSIVE_ENHANCEMENT.md)
- [@./TIDYINGS.md](./TIDYINGS.md)
- [@./READABLE_CODE.md](./READABLE_CODE.md)
