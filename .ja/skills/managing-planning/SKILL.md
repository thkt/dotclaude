---
name: managing-planning
description: >
  プランニングワークフローパターン：SOW生成、Spec作成、Q&A明確化、検証。
  トリガー: SOW, Spec, planning, validation, acceptance criteria, requirements, /think, /sow, /spec.
allowed-tools: [Read, Write, Grep, Glob, Task]
user-invocable: false
---

# プランニングワークフロー管理

SOW、Spec、検証プロセスのためのプランニングワークフローパターン。

## ワークフロー参照

| ワークフロー              | 参照                                   | コマンド  |
| ------------------------- | -------------------------------------- | --------- |
| SOW生成                   | [@./references/sow-generation.md]      | /sow      |
| Spec生成                  | [@./references/spec-generation.md]     | /spec     |
| Thinkオーケストレーション | [@./references/think-workflow.md]      | /think    |
| 検証                      | [@./references/validation-criteria.md] | /validate |

## プランニングフロー

```text
/research → /think → /code → /test → /audit → /validate
```

## SOW構造

| セクション             | 目的                     |
| ---------------------- | ------------------------ |
| エグゼクティブサマリー | 1-2文の概要              |
| 問題分析               | 現状、課題               |
| 前提条件               | 事実、仮定、未知         |
| ソリューション設計     | アプローチ、代替案       |
| 受け入れ基準           | AC-001, AC-002, ...      |
| 実装計画               | フェーズ、進捗マトリクス |
| リスク                 | R-001, R-002, ...        |

## Spec構造

| セクション                 | 目的                       |
| -------------------------- | -------------------------- |
| 機能要件                   | FR-001, FR-002, ...        |
| データモデル               | TypeScriptインターフェース |
| テストシナリオ             | T-001, T-002, ...          |
| 非機能要件                 | NFR-001, NFR-002, ...      |
| トレーサビリティマトリクス | AC → FR → Test → NFR       |

## 信頼度マーカー

| マーカー | 信頼度 | 使用法                    |
| -------- | ------ | ------------------------- |
| [✓]      | ≥95%   | 検証済み（file:line必須） |
| [→]      | 70-94% | 推論（理由を記載）        |
| [?]      | <70%   | 仮説（確認が必要）        |

## テンプレート

- SOW: `~/.claude/templates/sow/template.md`
- Spec: `~/.claude/templates/spec/template.md`
