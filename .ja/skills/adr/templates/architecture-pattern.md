# Architecture Pattern Template

複数ファイルに影響するアーキテクチャパターン、コンポーネント構造、または設計方針を採用する決定を記録する。

## When to Use

| シナリオ                                                      |
| ------------------------------------------------------------- |
| アーキテクチャパターン間の選択 (MVC, Clean Architecture など) |
| コンポーネント構造やモジュール境界の定義                      |
| 複数ファイルに影響する設計方針の確立                          |

## Template-Specific Topics

`## More Information` 配下に `### {topic}` として配置する。

| トピック                  | 目的                                         |
| ------------------------- | -------------------------------------------- |
| Architecture Diagram      | Mermaid またはテキスト図で構造を示す         |
| Quality Attributes        | 優先度表 (maintainability, performance など) |
| Trade-offs                | 何のために何を犠牲にするか                   |
| Implementation Guidelines | パターン適用の具体ルール                     |
| Monitoring                | パターンが機能していることをどう検証するか   |

## 例

`````markdown
---
status: "accepted"
date: 2026-01-08
decision-makers: Project owner
---

# Adopt Skill-Centric Architecture

## Context and Problem Statement

Command files grew bloated, with some exceeding 900 lines. Knowledge (skills) and workflows (commands) were not separated, causing DRY violations and declining maintainability. How should we restructure to keep commands lightweight and knowledge reusable?

## Decision Drivers

* Command files violating Miller's Law (responsibilities > 9)
* Same knowledge duplicated across multiple commands
* Unclear impact scope when adding new features

## Considered Options

* Skill-Centric Architecture
* Status Quo (Monolithic Commands)

## Decision Outcome

Chosen option: "Skill-Centric Architecture", because it achieves DRY by consolidating knowledge into `skills/` while keeping commands as thin wrappers.

### Consequences

* Good, because commands stay under 100 lines on average
* Good, because skills become reusable across commands
* Bad, because more inter-file navigation is required

### Confirmation

A line-count audit verifies commands stay under 100 lines. Skill reuse is tracked by counting cross-command references in skill files.

## Pros and Cons of the Options

### Skill-Centric Architecture

Commands act as thin wrappers, delegating knowledge to skills.

* Good, because achieves DRY (knowledge in one place)
* Good, because commands stay under 100 lines
* Bad, because increased indirection via references

### Status Quo (Monolithic Commands)

Each command contains all required knowledge inline.

* Good, because self-contained in one file
* Bad, because duplication keeps growing
* Bad, because hard to predict change impact

## More Information

### Architecture Diagram

```mermaid
graph TD
    CMD[commands/] --> SKILL[skills/]
    SKILL --> REF[references/]
```

### Quality Attributes

| Attribute         | Priority | Approach     |
| ----------------- | -------- | ------------ |
| Maintainability   | High     | Skill split  |
| Understandability | Medium   | Thin Wrapper |

### Trade-offs

More files in exchange for clear single-responsibility per file.

### Reassessment Triggers

* If command count exceeds 30 and skill dependency graph becomes tangled
`````
