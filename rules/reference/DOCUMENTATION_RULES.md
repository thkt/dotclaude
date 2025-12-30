# Documentation Rules and Guidelines

Guidelines for maintaining consistent, well-organized documentation in the Claude Code ecosystem.

## Core Principles

1. **Clarity Over Completeness** - Apply Occam's Razor to documentation
2. **Consistency Across Languages** - Maintain EN/JP synchronization
3. **Logical Hierarchy** - Clear separation between principles and practices
4. **No Circular References** - Maintain clean dependency graphs

## Directory Structure

### Placement Criteria

```markdown
/rules/
├── reference/        # Principles & Theory
│   ├── OCCAMS_RAZOR.md   # Fundamental principles
│   ├── SOLID.md          # Abstract design principles
│   └── DRY.md            # Core concepts
│
└── development/      # Practical Application
    ├── TDD_RGRC.md          # Implementation methods
    ├── PROGRESSIVE_ENHANCEMENT.md  # Development approaches
    ├── READABLE_CODE.md     # Coding practices
    └── TIDYINGS.md          # Improvement techniques
```

### Decision Framework

When adding new documentation:

```markdown
Is it a fundamental principle or theory?
  YES → /rules/reference/
  NO  → Continue

Is it a practical method or technique?
  YES → /rules/development/
  NO  → Continue

Is it a command or tool?
  YES → /commands/
  NO  → /docs/
```

## Reference Management

### Reference Hierarchy

```markdown
Level 1: CLAUDE.md (Top-level configuration)
  ├─→ Level 2: Core Principles (/rules/reference/)
  ├─→ Level 2: Development Practices (/rules/development/)
  └─→ Level 2: Commands (/commands/)
      └─→ Level 3: Cross-references between docs
```

### Reference Rules

1. **Maximum Depth**: 3 levels of references
2. **Avoid Circular**: A → B → A is forbidden
3. **Direct Important**: Core principles should be directly referenced from CLAUDE.md
4. **Group Related**: Use section headers to group references

### Reference Format

```markdown
## Related Principles

### Core Principles (Same Level)
- [@./SOLID.md](./SOLID.md) - Description
- [@./DRY.md](./DRY.md) - Description

### Applied in Practice
- [@../development/TDD_RGRC.md](../development/TDD_RGRC.md) - Description
```

## Language Synchronization

### Dual-Language Requirements

**Every documentation file MUST have:**

- English version: `/path/to/FILE.md`
- Japanese version: `/ja/path/to/FILE.md`

### Synchronization Checklist

When updating documentation:

```markdown
☐ Update English version
☐ Update Japanese version
☐ Verify structure matches
☐ Check reference paths (relative paths differ!)
☐ Confirm section headers align
☐ Test cross-references work
```

### Path References

Both EN and JP use identical relative path patterns within their respective directories:

```markdown
[@./SOLID.md](./SOLID.md)                    # Same directory
[@../development/TDD_RGRC.md](../development/TDD_RGRC.md)    # Up one level
```

### Exceptions: Japanese-Only Documentation

The following files exist only in Japanese (no English version):

- `ja/docs/ARCHITECTURE.md` - System architecture overview
- `ja/docs/WORKFLOW_GUIDE.md` - Quick start guide
- `ja/docs/DEVELOPMENT_WORKFLOW.md` - Practical development workflow
- `ja/docs/PROJECT_SETUP.md` - Project-specific setup guide
- `ja/commands/git/worktree-setup.md` - Git worktree setup guide
- `ja/commands/context.md` - Context management command
- `ja/skills/generating-esa-reports/` - esa daily report automation skill

**Rationale**: These documents serve Japanese-speaking users and creating English versions would require significant translation effort without clear benefit. They are properly referenced within the Japanese documentation tree.

### Exceptions: English-Only Documentation

The following files exist only in English (no Japanese version):

- `skills/automating-browser/` - Browser automation skill (technical reference)
- `skills/utilizing-cli-tools/` - CLI tools guide skill (technical reference)
- `rules/core/PRE_TASK_CHECK_COMPACT.md` - Hook-injected task verification rules
- `rules/core/PRE_TASK_CHECK_VERBOSE.md` - Detailed PRE_TASK_CHECK specification

**Rationale**: These are technical reference skills that primarily document tool APIs and command syntax. The content is largely code examples and tool names that don't require translation. PRE_TASK_CHECK files are injected via hook and referenced from both EN/JA CLAUDE.md - maintaining a single English source prevents synchronization issues. Creating Japanese versions would add maintenance burden without proportional benefit.

## Update Procedures

| Operation | Steps |
| --- | --- |
| **Add New** | 1. Create EN/JP both 2. Add ref to CLAUDE.md 3. Update related docs |
| **Modify** | 1. `grep -r "FILENAME"` check refs 2. Update EN/JP together 3. Verify links |
| **Move File** | 1. Search refs 2. Move EN/JP 3. Update all refs |

## Documentation Standards

### File Structure

```markdown
# Title - Clear and Descriptive

## Core Philosophy
Brief explanation of why this exists

## Key Concepts
Main ideas, clearly explained

## Practical Application
Examples and use cases

## Related Principles
Links to related documentation
```

### Writing Style

1. **Headers**: Use sentence case, not CAPS
2. **Examples**: Include practical code examples
3. **Comparisons**: Show ❌ Bad vs ✅ Good
4. **Summaries**: Key points in bullet lists

### Code Examples

```typescript
// ❌ Avoid: Complex example first
complexImplementation()

// ✅ Prefer: Simple example first
simpleImplementation()

// Then show progression to complex
advancedImplementation()
```

## Quality Checklist

- [ ] EN/JP synchronized
- [ ] All links tested
- [ ] No circular references
- [ ] Correct placement (reference/ vs development/)

## Common Patterns

| Pattern | Steps |
| --- | --- |
| New Principle | Create EN/JP in reference/ → Add to CLAUDE.md |
| New Practice | Create EN/JP in development/ → Reference from principles |
| New Command | Create EN/JP in commands/ → Add to COMMANDS.md |

## Anti-Patterns

| ❌ Avoid | ✅ Instead |
| --- | --- |
| Single language updates | Synchronized updates (EN/JP together) |
| Deep nesting (>3 levels) | Flat hierarchy |
| Orphan documents | Connected graph |
| Circular references | Tree structure |
| Misplaced files | Follow decision framework |

## Maintenance Tasks

### Regular Reviews

Weekly:

- Check for broken references
- Verify EN/JP synchronization
- Review recent changes for consistency

Monthly:

- Evaluate directory structure
- Check for orphaned documents
- Review reference depth

### Refactoring Signals

Consider refactoring when:

- Reference depth exceeds 3 levels
- Circular dependencies detected
- Placement confusion (principle vs practice)
- EN/JP drift in structure
- Too many cross-references (>5 per doc)

## Tools

```bash
grep -r "FILENAME" ~/.claude/           # Find references
diff <(ls /rules/) <(ls /ja/rules/)     # Check EN/JP match
```

## Evolution Guidelines

### When to Create New Categories

Create new directories when:

- 5+ related documents in same category
- Clear conceptual boundary emerges
- Confusion about placement recurring

### When to Merge Categories

Consider merging when:

- Categories have <3 documents each
- Conceptual boundaries unclear
- Frequent placement confusion

### Version Control

Always commit with clear messages:

```bash
# Good commit messages
docs: add Occam's Razor principle to reference
docs: synchronize EN/JP for TDD_RGRC
docs: move TIDYINGS from reference to development
refactor: reorganize principle documentation structure

# Include what changed and why
```

## Remember

> "The best documentation is not the most comprehensive, but the most comprehensible" - Occam's Razor applied to docs

Keep it:

- **Simple** - Easy to understand
- **Organized** - Easy to find
- **Synchronized** - Consistent across languages
- **Connected** - Well-referenced
- **Maintained** - Regularly updated

---

*Last updated: 2025-12-30*
