---
name: creating-adrs
description: >
  Structured ADR creation in MADR format. Use when creating architecture decision
  records, documenting technology choices, or when user mentions ADR, Architecture
  Decision, 決定記録, 技術選定, アーキテクチャ決定, deprecation, 非推奨化.
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash(ls:*, mkdir:*), Task]
user-invocable: false
---

# ADR Creator

## 6-Phase Process

| Phase         | Actions                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| 1. Pre-Check  | `ls adr/*.md`, check duplicates, get next number                         |
| 2. Template   | Match keywords to template type                                          |
| 3. References | Gather project docs, issues, external resources                          |
| 4. Validate   | Check required sections (Title, Status, Context, Decision, Consequences) |
| 5. Index      | Auto-generate `adr/README.md`                                            |
| 6. Recovery   | Handle missing dirs, duplicates, missing sections                        |

## Template Selection

| Template             | Use Case                   | Required Sections          |
| -------------------- | -------------------------- | -------------------------- |
| technology-selection | Library, framework choices | Options (min 3), Pros/Cons |
| architecture-pattern | Structure, design policy   | Context, Consequences      |
| process-change       | Workflow, rule changes     | Before/After comparison    |
| deprecation          | Retiring technology        | Migration plan, Timeline   |

## Directory Structure

```text
adr/
├── README.md          # Auto-generated index
├── 0001-*.md         # Sequential numbering
└── 0002-*.md
```

## References

| Topic     | Resource                      |
| --------- | ----------------------------- |
| MADR      | <https://adr.github.io/madr/> |
| Command   | `../../commands/adr.md`       |
| Templates | `../../templates/adr/`        |
| Scripts   | `./scripts/`                  |
