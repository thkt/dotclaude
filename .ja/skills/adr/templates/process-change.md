# Process Change Template

ワークフロー、ルール、レビュー手順、品質ゲートを変更する決定を記録する。

## When to Use

| シナリオ                         |
| -------------------------------- |
| 開発ワークフローや規約の変更     |
| レビュー手順や品質ゲートの修正   |
| 新規ルールの導入や旧ルールの廃止 |

## Template-Specific Topics

`## More Information` 配下に `### {topic}` として配置する。

| トピック                       | 目的                                 |
| ------------------------------ | ------------------------------------ |
| Current Process vs New Process | Before / After 比較表                |
| Transition Plan                | フェーズ別移行と各フェーズの達成基準 |
| Team Impact                    | 影響を受けるロール、トレーニング要件 |
| Rollback Plan                  | 変更が失敗した場合の差し戻し方法     |
| Review Schedule                | 効果評価のタイミング                 |

## 例

````markdown
---
status: "accepted"
date: 2026-01-28
decision-makers: Project owner
---

# Adopt Audience-Optimized Templates

## Context and Problem Statement

SOW, Spec, and ADR serve different audiences, but all templates used the same placeholder-list format. As a result, ADR templates were effectively unused, and 24 SOWs diverged from the template structure. How should we restructure templates to close the gap?

## Decision Drivers

* Structured tables are optimal for AI readers
* Prose and guidelines are optimal for human readers
* Large gap between templates and actual documents

## Considered Options

* Audience-Optimized
* Unified Placeholder Format

## Decision Outcome

Chosen option: "Audience-Optimized", because each document type matches the format that best serves its primary audience.

### Consequences

* Good, because templates are actually used in practice
* Good, because document quality improves
* Bad, because increased template management complexity

### Confirmation

After 1 month, audit ADR usage and SOW divergence. Templates remain in use if usage rate stays above 50%.

## Pros and Cons of the Options

### Audience-Optimized

Keep structured tables for SOW and Spec. Switch ADR to guideline format.

* Good, because optimal format for each document's audience
* Good, because eliminates template-reality gap
* Bad, because reduced uniformity across template types

### Unified Placeholder Format

Keep all templates in placeholder format.

* Good, because consistency
* Bad, because ADR reality gap persists

## More Information

### Current Process vs New Process

| Aspect        | Before                   | After                 |
| ------------- | ------------------------ | --------------------- |
| SOW templates | Excessive IDs (8 types)  | Reality-based (AC-N)  |
| ADR templates | Placeholder lists        | Guidelines + examples |
| Reviewer      | Mismatched with template | Synced with template  |

### Review Schedule

* 1 week. Check template usability.
* 1 month. Quantitative evaluation of SOW and ADR quality.

### Reassessment Triggers

* If template usage rate drops below 50% in new ADRs
````
