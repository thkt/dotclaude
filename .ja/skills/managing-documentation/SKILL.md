---
name: managing-documentation
description: >
  Documentation generation workflows: ADR creation, skill generation, rule generation.
  Triggers: ADR, documentation, architecture decision, rulify, skill generation, MADR.
allowed-tools: [Read, Write, Grep, Glob, Edit]
user-invocable: false
---

# ドキュメント管理

## ワークフロー

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

## Rulifyフロー

ADR (決定) → Rule (強制) → CLAUDE.md (統合)
