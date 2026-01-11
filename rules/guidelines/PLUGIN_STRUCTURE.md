# Plugin Structure

Rules for maintaining the Claude Code plugin architecture.

## Rule

1. **Monolithic Maintenance**: Keep `source: "./"` in marketplace.json for all plugins
2. **Cross-Reference Preservation**: Never break cross-references between skills/, rules/, agents/
3. **External Sharing Restriction**: Do not attempt to externalize individual plugins

## Rationale

Extracted from ADR 0003. Due to Claude Code plugin cache constraints:

- **Plugin Cache Limitation**: The plugin system caches plugins at load time, preventing `shared/` directory access across plugin boundaries
- **Reference Integrity**: 394+ cross-references exist between components; breaking these would cause widespread failures
- **Stability**: The monolithic structure has proven stable for existing workflows (/think, /code, /audit, /commit)

## When to Apply

| Scenario                        | Action                         |
| ------------------------------- | ------------------------------ |
| Adding new plugin               | Use `source: "./"`             |
| Considering external sharing    | **Don't** - explain limitation |
| Refactoring plugin structure    | Preserve all cross-references  |
| Moving files between components | Update all references          |

## Structure

```text
.claude/
├── .claude-plugin/
│   └── marketplace.json    # All plugins use source: "./"
├── skills/                 # Educational content
├── rules/                  # Enforced guidelines
├── agents/                 # Specialized agents
├── commands/               # User-facing commands
└── [cross-references between all of the above]
```

## marketplace.json Pattern

```json
{
  "plugins": [
    {
      "name": "core-rules",
      "source": "./" // Always local
    },
    {
      "name": "development-skills",
      "source": "./" // Always local
    }
  ]
}
```

## Exceptions

This rule may be reconsidered if:

1. **Official plugin system update**: Claude Code adds `shared/` directory support
2. **New isolation mechanism**: A way to share resources across plugin boundaries is provided
3. **Alternative architecture**: A pattern emerges that enables external sharing without breaking references

Until then, maintain the monolithic structure.

## Anti-Patterns

### Bad: Attempting Plugin Separation

```json
{
  "plugins": [
    {
      "name": "core-rules",
      "source": "git://example.com/rules.git" // Won't work
    }
  ]
}
```

**Issues**:

- Cross-references to skills/ will fail
- Plugin cache won't include shared resources
- Workflows will break

### Bad: Breaking Cross-References

```text
Before:
  skills/tdd/ → rules/development/

After (broken):
  plugins/skills/tdd/ → ??? (reference broken)
```

## Checklist

Before modifying plugin structure:

- [ ] All cross-references remain valid
- [ ] source: "./" is maintained
- [ ] Existing workflows function correctly
- [ ] No external plugin dependencies added

## Verification

```bash
# Check for broken references
rg "@\.\.\/" --glob "*.md" | wc -l

# Verify marketplace.json
jq '.plugins[].source' .claude-plugin/marketplace.json
# Should all return "./"
```

## Related ADRs

- [ADR 0003](../../adr/0003-marketplace.md) - Marketplace structure maintenance decision

## Related Documentation

- [@../../.claude-plugin/marketplace.json](../../.claude-plugin/marketplace.json) - Plugin configuration
