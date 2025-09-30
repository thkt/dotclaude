# Principle Reference Validation

## Purpose

Ensure all principle files maintain correct cross-references and structural integrity within the rules system.

## Validation Checklist

### Structure Requirements

All principle files in `rules/reference/` and `rules/development/` should have:

- [ ] Clear title and purpose statement
- [ ] "Related Principles" section
- [ ] Practical code examples (❌ Bad vs ✅ Good pattern)
- [ ] Cross-references using relative paths
- [ ] No broken links

### Reference Integrity

#### Internal References

**Format**: `[@./FILE.md]` (same directory) or `[@../category/FILE.md]` (different directory)

**Rules**:

1. All `[@...]` references must point to existing files
2. Relative paths must be correct from the referencing file's location
3. No circular references without purpose

#### Cross-Reference Matrix

| Principle | Should Reference | Category |
|-----------|-----------------|----------|
| OCCAMS_RAZOR.md | (none - it's the meta-principle) | reference |
| SOLID.md | OCCAMS_RAZOR.md | reference |
| DRY.md | OCCAMS_RAZOR.md | reference |
| MILLERS_LAW.md | READABLE_CODE.md | reference |
| PROGRESSIVE_ENHANCEMENT.md | OCCAMS_RAZOR.md | development |
| READABLE_CODE.md | MILLERS_LAW.md, OCCAMS_RAZOR.md | development |
| TDD_RGRC.md | OCCAMS_RAZOR.md | development |
| CONTAINER_PRESENTATIONAL.md | SOLID.md, PROGRESSIVE_ENHANCEMENT.md | development |
| LAW_OF_DEMETER.md | SOLID.md | development |
| LEAKY_ABSTRACTION.md | OCCAMS_RAZOR.md | development |
| TIDYINGS.md | DRY.md, READABLE_CODE.md | development |

### How to Validate

#### Check for Broken Links

```bash
# Find all principle references
grep -r "@\[.*\.md\]" /Users/thkt/.claude/rules/reference/
grep -r "@\[.*\.md\]" /Users/thkt/.claude/rules/development/

# For each reference, verify the file exists
# Example check:
cd /Users/thkt/.claude/rules/reference/
grep -o "@\[.*\]" OCCAMS_RAZOR.md | sed 's/@\[\(.*\)\]/\1/' | while read file; do
  if [ ! -f "$file" ]; then
    echo "Broken link in OCCAMS_RAZOR.md: $file"
  fi
done
```

#### Check Reference Depth

```bash
# Principle references should not exceed 3 levels deep
# Example: A → B → C (OK)
# Example: A → B → C → D (Too deep)

# Manual trace required
```

#### Detect Circular References

```bash
# Check if A references B and B references A
# This is allowed if there's a clear reason
# But should be documented

# Manual check required
```

### Reference Path Patterns

#### From `rules/reference/`

- Same directory: `[@./OTHER_PRINCIPLE.md]`
- To development: `[@../development/PRINCIPLE.md]`
- To core: `[@../core/FILE.md]`

#### From `rules/development/`

- Same directory: `[@./OTHER_PRINCIPLE.md]`
- To reference: `[@../reference/PRINCIPLE.md]`
- To core: `[@../core/FILE.md]`

#### From agent files

- To rules: `[@~/.claude/rules/reference/PRINCIPLE.md]`
- To rules (relative from agents/): `[@../../rules/reference/PRINCIPLE.md]`

## Quality Standards

### Minimum Requirements

1. **No broken links**: All `[@...]` references must resolve
2. **Bidirectional references**: If A references B significantly, B should acknowledge A
3. **Maximum depth**: No more than 3 levels of reference chain

### Best Practices

- **Purpose-driven references**: Only reference principles that genuinely relate
- **Avoid redundancy**: Don't reference transitively (if A→B and B→C, A shouldn't directly reference C unless there's a specific reason)
- **Document rationale**: Explain WHY principles are related

## Dependency Graph Validation

The dependency graph in PRINCIPLES_GUIDE.md should match actual references:

```markdown
Expected relationships (from graph):
- OCCAMS_RAZOR → PROGRESSIVE_ENHANCEMENT ✅
- OCCAMS_RAZOR → DRY ✅
- OCCAMS_RAZOR → READABLE_CODE ✅
- READABLE_CODE → MILLERS_LAW ✅
- PROGRESSIVE_ENHANCEMENT → TDD_RGRC ✅
- SOLID → CONTAINER_PRESENTATIONAL ✅
- SOLID → LAW_OF_DEMETER ✅
```

**Validation**: Check that these relationships exist in actual principle files.

## When to Update

- Adding new principle → Update dependency graph and related principles
- Modifying principle relationships → Update cross-references
- Refactoring directory structure → Update all relative paths
- Monthly review → Verify graph matches reality

## Remediation

If validation fails:

1. **Broken links**
   - Update file paths to correct location
   - Remove references to non-existent files
   - Create missing principle files if needed

2. **Missing cross-references**
   - Add "Related Principles" section
   - Reference appropriate principles based on dependency graph

3. **Incorrect paths**
   - Verify current file location
   - Calculate correct relative path
   - Update reference

4. **Circular references**
   - Document the circular relationship
   - Ensure it serves a purpose
   - Consider if one direction is more primary

## Automated Validation (Future)

```bash
#!/bin/bash
# /Users/thkt/.claude/scripts/validate-principle-references.sh

# Check all [@...] references
# Verify files exist
# Detect broken links
# Report inconsistencies with dependency graph
```

## Related Documentation

- [@../PRINCIPLES_GUIDE.md](../PRINCIPLES_GUIDE.md) - Dependency graph
- [@./agent-principle-coverage.md](./agent-principle-coverage.md) - Agent validation
- [@../../docs/DOCUMENTATION_RULES.md](../../docs/DOCUMENTATION_RULES.md) - Documentation standards
