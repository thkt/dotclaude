---
description: ワークスペース内の計画ドキュメント（SOW/Spec）を一覧・表示
allowed-tools: Read, Glob
model: inherit
dependencies: []
---

# /plans - 計画ドキュメントビューアー

## 目的

ワークスペースに保存されている計画ドキュメント（SOWとSpec）を一覧・表示。

**読み取り専用**: 計画ドキュメントのビューアー。

## 機能

### SOW一覧

Globツールを使用して両方の場所からすべてのSOWドキュメントを検索:

```markdown
# グローバルワークスペース（ユーザーレベル）
Globパターン: ~/.claude/workspace/planning/**/sow.md

# プロジェクト固有ワークスペース（現在のプロジェクト）
Globパターン: .claude/workspace/planning/**/sow.md
```

**検索優先度**: プロジェクト固有のSOWが先に表示、その後グローバルSOW。

### 最新SOWを表示

1. Globを使用してSOWファイルを検索（更新日時でソート）
2. 最新ファイルにReadツールを使用

### 特定SOWを表示

特定パスでReadツールを使用:

```text
Read: ~/.claude/workspace/planning/[directory]/sow.md
```

## 出力フォーマット

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 利用可能なSOWドキュメント

📁 プロジェクト固有（.claude/workspace/）
1. 2025-01-14-oauth-authentication
   作成: 2025-01-14
   ステータス: ドラフト

📁 グローバル（~/.claude/workspace/）
2. 2025-01-13-api-refactor
   作成: 2025-01-13
   ステータス: アクティブ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

特定のドキュメントを表示:
/plans "oauth-authentication"
```

## 使用例

### すべての計画を一覧

```bash
/plans
```

作成日付付きですべての利用可能な計画ドキュメントを表示。

### 最新を表示

```bash
/plans --latest
```

最新の計画を表示。

### 特定の計画を表示

```bash
/plans "feature-name"
```

特定機能の計画ドキュメントを表示。

## ワークフローとの統合

```text
1. 作成: /sow "feature" または /think "feature"
2. 表示: /plans
3. 実装: /code
4. 検証: /validate
```

## 関連コマンド

- `/sow` - SOWのみ作成
- `/spec` - Specのみ作成
- `/think` - SOW + Spec作成（オーケストレーター）
- `/validate` - 計画に対して実装を検証
