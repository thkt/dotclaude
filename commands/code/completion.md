# Definition of Done & Decision Framework

This module defines completion criteria and decision support.

## Definition of Done with Confidence Metrics

Implementation complete when all metrics achieved:

```markdown
## Completion Checklist
### Core Implementation
- ✅ All RGRC cycles complete [C: 0.95]
- ✅ Feature works as specified [C: 0.93]
- ✅ Edge cases handled [C: 0.88]

### Quality Metrics
- ✅ All tests passing (47/47) [C: 1.0]
- ✅ Coverage ≥ 80% (current: 82%) [C: 0.95]
- ✅ Zero lint errors [C: 0.98]
- ✅ Zero type errors [C: 1.0]
- ⚠️ 2 lint warnings (documented) [C: 0.85]

### Code Quality
- ✅ SOLID principles applied [C: 0.90]
- ✅ DRY - No duplication [C: 0.92]
- ✅ Readable code standards [C: 0.88]
- ✅ Consistent with codebase [C: 0.94]

### Documentation
- ✅ Code comments where needed [C: 0.85]
- ✅ README updated if required [C: 0.90]
- ✅ API docs current [C: 0.87]

### Overall Confidence: 0.92 (HIGH)
Status: ✅ READY FOR REVIEW
```

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
