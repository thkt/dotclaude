---
paths:
  - ".claude/.claude-plugin/**"
---

# Plugin Architecture

Rules for maintaining the Claude Code plugin architecture.

## Rules

| Rule                         | Guideline                                                     |
| ---------------------------- | ------------------------------------------------------------- |
| Monolithic Maintenance       | Keep `source: "./"` in marketplace.json                       |
| Cross-Reference Preservation | Never break cross-references between skills/, rules/, agents/ |
| External Sharing Restriction | Never externalize individual plugins                          |

## Rationale

Plugin system caches at load time, preventing `shared/` directory access across
boundaries.

| Constraint                  | Reason                                                |
| --------------------------- | ----------------------------------------------------- |
| External sharing impossible | Plugins cannot reference files outside their boundary |
| Cross-references critical   | 390+ references exist; breaking causes failures       |
| Monolithic is stable        | Current structure works for /think, /code, /audit     |

## When to Apply

| Scenario                        | Action                        |
| ------------------------------- | ----------------------------- |
| Adding new plugin               | Use `source: "./"`            |
| Considering external sharing    | Never - explain limitation    |
| Refactoring plugin structure    | Preserve all cross-references |
| Moving files between components | Update all references         |

## Structure

```text
.claude/
├── .claude-plugin/
│   └── marketplace.json    # All plugins use source: "./"
├── skills/                 # User-facing commands + educational content
├── rules/                  # Enforced guidelines
├── agents/                 # Specialized agents
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

| Issue                       | Result                         |
| --------------------------- | ------------------------------ |
| Cross-references to skills/ | Fail                           |
| Plugin cache                | Won't include shared resources |
| Workflows                   | Break                          |
