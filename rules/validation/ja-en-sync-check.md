# English-Japanese Synchronization Validation

## Purpose

Ensure English and Japanese versions of documentation remain synchronized in structure and content, maintaining consistency across both languages.

## Validation Checklist

### Directory Structure Parity

```bash
# Expected mirror structure
/Users/thkt/.claude/
├── [English files]
└── ja/
    └── [Japanese mirror of English files]
```

**Requirements**:
- [ ] Every `.md` file in English has corresponding `ja/*.md` file
- [ ] Every `.md` file in Japanese has corresponding English file
- [ ] Directory structure is identical in both versions

### File-Level Validation

For each document pair (e.g., `CLAUDE.md` and `ja/CLAUDE.md`):

- [ ] Same number of major sections (##)
- [ ] Section headers convey same meaning
- [ ] Same number of code examples
- [ ] Same file references (paths may differ but targets are equivalent)
- [ ] Same level of detail

### How to Validate

#### Check File Existence Parity

```bash
# Check that all English files have Japanese versions
cd /Users/thkt/.claude
find . -name "*.md" -not -path "./ja/*" | while read en_file; do
  ja_file="./ja/$en_file"
  if [ ! -f "$ja_file" ]; then
    echo "Missing Japanese version: $ja_file"
  fi
done

# Check that all Japanese files have English versions
cd /Users/thkt/.claude/ja
find . -name "*.md" | while read ja_relative; do
  en_file="../$ja_relative"
  if [ ! -f "$en_file" ]; then
    echo "Orphaned Japanese file: $ja_relative"
  fi
done
```

#### Check Section Count

```bash
# Compare number of ## headers
en_sections=$(grep -c "^##" /Users/thkt/.claude/CLAUDE.md)
ja_sections=$(grep -c "^##" /Users/thkt/.claude/ja/CLAUDE.md)

if [ "$en_sections" != "$ja_sections" ]; then
  echo "Section count mismatch: EN=$en_sections, JA=$ja_sections"
fi
```

#### Check Code Block Count

```bash
# Compare number of code blocks
en_blocks=$(grep -c '```' /Users/thkt/.claude/rules/reference/OCCAMS_RAZOR.md)
ja_blocks=$(grep -c '```' /Users/thkt/.claude/ja/rules/reference/OCCAMS_RAZOR.md)

if [ "$en_blocks" != "$ja_blocks" ]; then
  echo "Code block count mismatch"
fi
```

### Synchronization Points

#### Critical Files (Must Stay Synchronized)

| English Path | Japanese Path | Priority |
|--------------|---------------|----------|
| CLAUDE.md | ja/CLAUDE.md | 🔴 Critical |
| rules/PRINCIPLES_GUIDE.md | ja/rules/PRINCIPLES_GUIDE.md | 🔴 Critical |
| rules/core/*.md | ja/rules/core/*.md | 🔴 Critical |
| rules/reference/*.md | ja/rules/reference/*.md | 🟠 High |
| rules/development/*.md | ja/rules/development/*.md | 🟠 High |
| docs/*.md | ja/docs/*.md | 🟡 Medium |
| commands/*.md | ja/commands/*.md | 🟡 Medium |
| agents/**/*.md | ja/agents/**/*.md | 🟢 Low |

#### Path Reference Differences

English and Japanese files may have different relative paths due to nesting:

**English** (`rules/reference/OCCAMS_RAZOR.md`):
```markdown
[@../development/PROGRESSIVE_ENHANCEMENT.md]
```

**Japanese** (`ja/rules/reference/OCCAMS_RAZOR.md`):
```markdown
[@../development/PROGRESSIVE_ENHANCEMENT.md]
```

Note: Paths are actually the same because the directory structure is mirrored.

### Content Validation

#### Section Header Mapping

English headers should map to Japanese translations:

| English | Japanese |
|---------|----------|
| Priority Rules | 優先順位ルール |
| Development Approach | 開発アプローチ |
| Core Principles | 核心原則 |
| Applied Development Principles | 適用される開発原則 |
| Output Guidelines | 出力ガイドライン |
| Integration with Other Agents | 他のエージェントとの統合 |
| Related Principles | 関連する原則 |
| Examples | 例 |
| Key Questions | 主要な質問 |
| Remember | 覚えておく |

#### Code Examples

- Code blocks should be **identical** in both versions (code is language-neutral)
- Comments within code can be translated
- Variable names should remain in English for consistency

```typescript
// ✅ Identical code in both versions
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

### Quality Standards

#### Minimum Requirements

1. **Structural parity**: Same sections, same order
2. **Content equivalence**: Same meaning, adapted for cultural context
3. **File completeness**: No missing files in either language
4. **Reference consistency**: All cross-references work in both versions

#### Best Practices

- **Update both simultaneously**: When changing English, update Japanese immediately
- **Maintain example count**: Same number of code examples in both versions
- **Preserve formatting**: Section levels, lists, code blocks should match
- **Test links**: Verify cross-references work in both versions

### Update Workflow

When modifying documentation:

1. **Identify change scope**
   - Single file or multiple files?
   - Content change or structural change?

2. **Update English version**
   - Make necessary changes
   - Document what changed

3. **Update Japanese version**
   - Apply equivalent changes
   - Maintain structural parity
   - Verify references still work

4. **Validate synchronization**
   - Run validation checks
   - Verify section counts match
   - Test cross-references

### When to Validate

- **After each documentation update**: Immediate validation
- **Before major releases**: Full synchronization check
- **Monthly review**: Comprehensive validation of all files
- **When adding new files**: Ensure both versions are created

## Remediation

If synchronization fails:

### Missing Files

```bash
# If Japanese version is missing
cp /path/to/english.md /path/to/ja/english.md
# Translate content while preserving structure
```

### Section Count Mismatch

1. Compare side-by-side
2. Identify missing sections
3. Add equivalent content to the version missing sections
4. Verify numbering and hierarchy match

### Structure Divergence

1. Use English version as canonical reference
2. Restructure Japanese version to match
3. Maintain translations while fixing structure
4. Validate both versions work independently

### Broken References

1. Identify broken `[@...]` references
2. Calculate correct relative path
3. Update references in affected language
4. Test that links resolve correctly

## Automated Validation (Future)

```bash
#!/bin/bash
# /Users/thkt/.claude/scripts/validate-ja-en-sync.sh

# Compare file lists
# Check section counts
# Verify code block counts
# Report missing files
# Highlight structural differences
```

## Related Documentation

- [@../../docs/DOCUMENTATION_RULES.md](../../docs/DOCUMENTATION_RULES.md) - Documentation standards
- [@./agent-principle-coverage.md](./agent-principle-coverage.md) - Agent validation
- [@./principle-reference-check.md](./principle-reference-check.md) - Principle validation
