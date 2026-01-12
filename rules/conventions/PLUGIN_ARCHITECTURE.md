# Plugin Architecture

Rules for maintaining the Claude Code plugin architecture.

## Rule

1. **Monolithic Maintenance**: Keep `source: "./"` in marketplace.json for all plugins
2. **Cross-Reference Preservation**: Never break cross-references between skills/, rules/, agents/
3. **External Sharing Restriction**: Do not attempt to externalize individual plugins

## Rationale

The plugin system caches at load time, preventing `shared/` directory access across plugin boundaries. This means:

- **External sharing is impossible**: Plugins cannot reference files outside their boundary
- **Cross-references are critical**: 390+ references exist between components; breaking them causes widespread failures
- **Monolithic is stable**: Current structure works for /think, /code, /audit, /commit

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
