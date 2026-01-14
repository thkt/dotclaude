---
name: managing-documentation
description: >
  ドキュメント生成ワークフロー：ADR作成、スキル生成、ルール生成。
  トリガー: ADR, documentation, architecture decision, rulify, skill generation, MADR.
allowed-tools: [Read, Write, Grep, Glob, Edit]
user-invocable: false
---

# ドキュメント管理

ADR、スキル、ルールのドキュメント生成ワークフロー。

## ワークフローリファレンス

| ワークフロー | リファレンス                       | コマンド |
| ------------ | ---------------------------------- | -------- |
| ADR作成      | [@./references/adr-workflow.md]    | /adr     |
| Rulify       | [@./references/rulify-workflow.md] | /rulify  |

## ADRフォーマット（MADR）

```markdown
# ADR-NNNN: [タイトル]

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

[課題は何か？]

## Decision

[決定は何か？]

## Consequences

[結果は何か？]
```

場所: `~/.claude/adr/ADR-NNNN-title.md`

## Rulifyフロー

```text
ADR (決定) → Rule (強制) → CLAUDE.md (統合)
```

## ドキュメントガイドライン

| 原則            | 適用                   |
| --------------- | ---------------------- |
| 明確性 > 完全性 | オッカムの剃刀を適用   |
| EN/JP同期       | 両バージョンは一致必須 |
| 循環参照禁止    | 最大3レベル深さ        |
| Mermaid > ASCII | Mermaid図を使用        |
