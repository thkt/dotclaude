# Definition of Done & Decision Framework

This module defines completion criteria and decision support for `/code` command.

→ **Common criteria**: [@../../../rules/development/COMPLETION_CRITERIA.md](~/.claude/rules/development/COMPLETION_CRITERIA.md)

## /code Specific Criteria

Implementation complete when:

- [x] All RGRC cycles complete
- [x] Feature works as specified
- [x] Edge cases handled
- [x] Quality gates passed (see shared criteria)

If confidence < 0.8 on any critical metric, continue improving.

## Decision Framework

### When Implementation Confidence is Low

```markdown
## Low Confidence Detected (< 0.7)
### Issue: [Uncertain about implementation approach]

Options:
1. **Research More** (/research)
   - Time: +30 min
   - Confidence gain: +0.3

2. **Prototype First**
   - Time: +15 min
   - Confidence gain: +0.2

3. **Consult Documentation**
   - Time: +10 min
   - Confidence gain: +0.15

Recommendation: Option 1 for complex features
```

### Confidence-Based Decisions

Make implementation choices based on evidence:

- **High Confidence (>0.8)**: Proceed with implementation
- **Medium (0.5-0.8)**: Add defensive checks
- **Low (<0.5)**: Research before implementing

## Implementation Patterns

### Pattern Selection by Confidence

```markdown
## Available Patterns (Choose based on context)

### High Confidence Patterns (>0.9)
1. **Factory Pattern** - Object creation
   - When: Multiple similar objects
   - Confidence: 0.95
   - Example in: src/factories/

2. **Repository Pattern** - Data access
   - When: Database operations
   - Confidence: 0.92
   - Example in: src/repositories/

### Medium Confidence Patterns (0.7-0.9)
1. **Observer Pattern** - Event handling
   - When: Loose coupling needed
   - Confidence: 0.85
   - Consider: Built-in EventEmitter

### Experimental Patterns (<0.7)
1. **New architectural pattern**
   - Confidence: 0.6
   - Recommendation: Prototype first
```

## Next Steps Based on Outcome

- **High Confidence (>0.9)** → Ready for `/test` or review
- **Medium (0.7-0.9)** → Consider additional testing
- **Low (<0.7)** → Need `/research` or planning
- **Quality Issues** → Fix before proceeding
- **All Green** → Ready for PR/commit
