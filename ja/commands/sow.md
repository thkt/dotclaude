---
name: sow
description: SOW文書の一覧表示と閲覧
priority: medium
suitable_for:
  type: [documentation, review, planning]
  phase: [planning, review]
  understanding: "≥ 90%"
aliases: [show-sow, list-sow]
timeout: 10
allowed-tools: Read, Bash(ls:*), Bash(find:*), Bash(cat:*)
context:
  sow_directory: "~/.claude/workspace/sow/"
  display: "list_or_view"
---

# /sow - SOW文書ビューア

## 目的

ワークスペースに保存されているStatement of Work（SOW）文書の一覧表示と閲覧。

**簡略化**: 計画文書の読み取り専用ビューア。

## 機能

### SOWの一覧表示

```bash
!`ls -la ~/.claude/workspace/sow/`
```

### 最新のSOWを表示

```bash
!`ls -t ~/.claude/workspace/sow/*/sow.md | head -1 | xargs cat`
```

### 特定のSOWを表示

```bash
# 日付または機能名で
!`cat ~/.claude/workspace/sow/[directory]/sow.md`
```

## 出力フォーマット

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 利用可能なSOW文書

1. 2025-01-14-oauth-authentication
   作成日: 2025-01-14
   ステータス: ドラフト

2. 2025-01-13-api-refactor
   作成日: 2025-01-13
   ステータス: アクティブ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

特定のSOWを表示するには：
/sow "oauth-authentication"
```

## 使用例

### すべてのSOWを一覧表示

```bash
/sow
```

作成日と共にすべての利用可能なSOW文書を表示します。

### 最新のSOWを表示

```bash
/sow --latest
```

最も最近作成されたSOWを表示します。

### 特定のSOWを表示

```bash
/sow "feature-name"
```

特定の機能のSOWを表示します。

## ワークフローとの統合

```text
1. SOWを作成: /think "feature"
2. SOWを表示: /sow
3. タスクを追跡: TodoWriteを独立して使用
4. 実装中にSOWを参照
```

## 簡略化された設計

- **読み取り専用**: 変更機能なし
- **静的文書**: SOWは計画の参照
- **明確な分離**: 計画用のSOW、実行用のTodoWrite

## 関連コマンド

- `/think` - 新しいSOWを作成
- `/todos` - 現在のタスクを表示（SOWとは別）

## 適用された原則

### 単一責任

- SOWビューアは文書の表示のみ
- 複雑な同期なし

### オッカムの剃刀

- シンプルなファイルリストと表示
- 不必要な機能なし

### プログレッシブエンハンスメント

- 基本的な表示から開始
- 必要に応じて後で検索/フィルタを追加
