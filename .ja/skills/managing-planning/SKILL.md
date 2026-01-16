---
name: managing-planning
description: >
  Planning workflow patterns: SOW generation, Spec creation, Q&A clarification, validation.
  Triggers: SOW, Spec, planning, validation, acceptance criteria, requirements, /think, /sow, /spec.
allowed-tools: [Read, Write, Grep, Glob, Task]
user-invocable: false
---

# プランニングワークフロー管理

## ワークフロー

| ワークフロー              | 参照                                   | コマンド  |
| ------------------------- | -------------------------------------- | --------- |
| SOW生成                   | [@./references/sow-generation.md]      | /sow      |
| Spec生成                  | [@./references/spec-generation.md]     | /spec     |
| Thinkオーケストレーション | [@./references/think-workflow.md]      | /think    |
| 検証                      | [@./references/validation-criteria.md] | /validate |

## プランニングフロー

/research → /think → /code → /test → /audit → /validate

## 信頼度マーカー

| マーカー | 信頼度 | 使用法                    |
| -------- | ------ | ------------------------- |
| [✓]      | ≥95%   | 検証済み（file:line必須） |
| [→]      | 70-94% | 推論（理由を記載）        |
| [?]      | <70%   | 仮説（確認が必要）        |

## テンプレート

- SOW: `~/.claude/templates/sow/template.md`
- Spec: `~/.claude/templates/spec/template.md`
