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

### Path Differences

English references:

```markdown
[@./SOLID.md](./SOLID.md)                    # Same directory
[@../development/TDD_RGRC.md](../development/TDD_RGRC.md)    # Up one, into development
```

Japanese references:

```markdown
[@./SOLID.md](./SOLID.md)                    # Same directory
[@../development/TDD_RGRC.md](../development/TDD_RGRC.md)    # Up one, into development
```

### Exceptions: Japanese-Only Documentation

The following files exist only in Japanese (no English version):

- `ja/docs/ARCHITECTURE.md` - System architecture overview
- `ja/docs/WORKFLOW_GUIDE.md` - Quick start guide
- `ja/docs/DEVELOPMENT_WORKFLOW.md` - Practical development workflow

**Rationale**: These documents serve Japanese-speaking users and creating English versions would require significant translation effort without clear benefit. They are properly referenced within the Japanese documentation tree.

## Update Procedures

### Adding New Principles

1. **Evaluate Placement**
   - Theory/Principle → `/rules/reference/`
   - Practice/Method → `/rules/development/`

2. **Create Both Versions**

   ```bash
   # English
   /rules/reference/NEW_PRINCIPLE.md
   # Japanese
   /ja/rules/reference/NEW_PRINCIPLE.md
   ```

3. **Add References**
   - Add to CLAUDE.md if core principle
   - Add to relevant commands if applicable
   - Cross-reference with related docs

4. **Update Index**
   - Add to COMMANDS.md if relevant
   - Update any overview documents

### Modifying Existing Documentation

1. **Check Dependencies**

   ```bash
   # Find all references
   grep -r "FILENAME" ~/.claude/
   ```

2. **Update Both Languages**
   - Make changes to English version
   - Apply same changes to Japanese version
   - Maintain structural parity

3. **Verify References**
   - Test all incoming references still valid
   - Check outgoing references still correct
   - No broken links

### Moving Files

1. **Plan the Move**

   ```markdown
   Current: /rules/reference/FILE.md
   Target:  /rules/development/FILE.md
   ```

2. **Find All References**

   ```bash
   grep -r "FILE\.md" ~/.claude/
   ```

3. **Execute in Order**
   - Move English file
   - Move Japanese file
   - Update all references
   - Verify no broken links

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

Before committing documentation:

```markdown
## Structure
☐ Follows standard file structure
☐ Clear hierarchy of information
☐ Logical flow from simple to complex

## Content
☐ Examples are practical and clear
☐ No unnecessary complexity
☐ Applies Occam's Razor

## References
☐ All links tested and working
☐ No circular dependencies
☐ Appropriate reference depth

## Synchronization
☐ English version complete
☐ Japanese version complete
☐ Structure matches exactly
☐ References adjusted for paths

## Integration
☐ Added to appropriate index
☐ Referenced from CLAUDE.md if core
☐ Cross-referenced with related docs
```

## Common Patterns

### Adding a New Core Principle

```bash
1. Create /rules/reference/PRINCIPLE.md
2. Create /ja/rules/reference/PRINCIPLE.md
3. Add to CLAUDE.md:
   - **Core principle**: Name → [@path](path)
4. Find related practices
5. Add cross-references
```

### Adding a New Practice

```bash
1. Create /rules/development/PRACTICE.md
2. Create /ja/rules/development/PRACTICE.md
3. Reference from relevant principles
4. Add to command docs if applicable
```

### Creating Command Documentation

```bash
1. Create /commands/COMMAND.md
2. Create /ja/commands/COMMAND.md
3. Add to COMMANDS.md index
4. Reference relevant principles/practices
```

## Anti-Patterns to Avoid

### ❌ Don't Do This

1. **Single language updates** - Always update both EN/JP
2. **Deep nesting** - Max 3 levels of references
3. **Orphan documents** - Everything should be referenced
4. **Circular references** - A → B → A
5. **Misplaced files** - Principles in development/ folder
6. **Broken links** - Test all references
7. **Inconsistent structure** - EN/JP must match

### ✅ Do This Instead

1. **Synchronized updates** - Both languages together
2. **Flat hierarchy** - Direct references when possible
3. **Connected graph** - All docs referenced somewhere
4. **Tree structure** - Clear parent-child relationships
5. **Correct placement** - Follow decision framework
6. **Verified links** - Test before committing
7. **Matching structure** - Identical organization

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

## Tools and Commands

### Useful Commands

```bash
# Find all references to a file
grep -r "FILENAME" ~/.claude/

# Check EN/JP structure match
diff <(ls /rules/) <(ls /ja/rules/)

# Find orphaned documents
# (Files with no incoming references)
for file in $(find /rules -name "*.md"); do
  basename=$(basename $file)
  count=$(grep -r "$basename" ~/.claude/ | wc -l)
  if [ $count -eq 0 ]; then echo "Orphaned: $file"; fi
done

# Verify all links
# (Simple broken link checker)
grep -r "@\[.*\]" ~/.claude/ | while read line; do
  # Extract and verify each link
done
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

*Last updated: 2025-09-30*
