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

| Template | Use Case | Required Sections |
| --- | --- | --- |
| technology-selection | Library, framework choices | Options (min 3), Pros/Cons |
| architecture-pattern | Structure, design policy | Context, Consequences |
| process-change | Workflow, rule changes | Before/After comparison |
| deprecation | Retiring technology | Migration plan, Timeline |

## Execution Flow

### Phase Details

| Phase | Key Actions |
| --- | --- |
| 1. Pre-Check | `ls docs/adr/*.md`, check duplicates, get next number |
| 2. Template | Match keywords to template type |
| 3. References | Gather project docs, issues, external resources |
| 4. Validate | Check required sections (Title, Status, Context, Decision, Consequences) |
| 5. Index | Auto-generate `docs/adr/README.md` |
| 6. Recovery | Handle missing dirs, duplicates, missing sections |

## Skill vs Rule Decision

| Aspect | /adr:rule | /adr:skill |
| --- | --- | --- |
| Purpose | Enforce constraints | Suggest patterns |
| Application | Always active | Triggered by keywords |
| Output | docs/rules/ | .claude/skills/ |

**Use rule for**: Security requirements, absolute constraints
**Use skill for**: Implementation patterns, context-dependent guidance

## Best Practices

| Practice | Do | Don't |
| --- | --- | --- |
| Triggers | Specific terms: "React Query", "useQuery" | Generic: "code", "implement" |
| Examples | Project-specific code | Generic samples |
| Checklist | Actionable items | Vague guidance |
| Updates | Regenerate when ADR changes | Keep stale skills |

## Directory Structure

```text
docs/adr/
├── README.md          # Auto-generated index
├── 0001-*.md         # Sequential numbering
└── 0002-*.md

.claude/skills/
├── adr-0001-*/       # Generated skills
│   └── SKILL.md
└── adr-0002-*/
    └── SKILL.md
```

## References

- [MADR Official](https://adr.github.io/madr/)
- [@~/.claude/commands/adr.md](~/.claude/commands/adr.md) - /adr command
- [@~/.claude/commands/adr/skill.md](~/.claude/commands/adr/skill.md) - /adr:skill quick reference
