---
name: creating-adrs
description: >
  Structured ADR creation in MADR format. Triggers: ADR, Architecture Decision,
  決定記録, 技術選定, アーキテクチャ決定, design decision, 技術的決定, 設計判断,
  deprecation, 非推奨化, process change, プロセス変更
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# ADR Creator

## Purpose

Create Architecture Decision Records in MADR format through a structured 6-phase process.

## 6-Phase Process Overview

| Phase | Purpose | Key Actions |
| --- | --- | --- |
| 1. Pre-Check | Prevent duplicates | Check existing ADRs, validate naming, verify directory |
| 2. Template | Select structure | Choose from 4 templates based on decision type |
| 3. References | Gather evidence | Collect project docs, issues, PRs, external resources |
| 4. Validate | Quality assurance | Verify required sections, check completeness |
| 5. Index | Update documentation | Auto-generate ADR list, cross-link related ADRs |
| 6. Recovery | Handle errors | Auto-fix paths, fallback templates |

## Template Selection

| Template | Use Case |
| --- | --- |
| technology-selection | Library, framework, language choices |
| architecture-pattern | Structure, design policy decisions |
| process-change | Workflow, rule changes |
| deprecation | Retiring existing technology (migration plan required) |

## Required MADR Sections

All ADRs must include:

1. **Title** - ADR-NNNN: [Decision Name]
2. **Status** - proposed / accepted / deprecated / superseded
3. **Context** - Problem statement and background
4. **Decision** - What was decided and why
5. **Consequences** - Positive, negative, and neutral impacts

Optional but recommended:

- **Considered Options** - Alternatives evaluated (min 3 for technology-selection)
- **Pros/Cons** - Comparison of options
- **Confirmation** - How to verify implementation
- **Related ADRs** - Dependencies and superseded decisions

## Usage

```bash
/adr "Adopt Zustand for State Management"
```

Flow: Pre-Check → Template Selection → Reference Collection → Input → Generate → Validate → Index Update

## Directory Structure

```text
docs/adr/
├── README.md          # Auto-generated index
├── 0001-*.md         # Sequential numbering
└── 0002-*.md
```

## References

- [MADR Official](https://adr.github.io/madr/)
- [@~/.claude/commands/adr.md] - /adr command
