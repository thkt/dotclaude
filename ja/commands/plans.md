---
description: ワークスペースの計画ドキュメント（SOW/Spec）を一覧表示
allowed-tools: Read, Glob
model: inherit
---

# /plans - 計画ドキュメントビューア

## 目的

ワークスペースに保存されている計画ドキュメント（SOWとSpec）の一覧表示と閲覧。

**読み取り専用**: 計画ドキュメントのビューア。

## 機能

### SOW一覧表示

Globツールを使用して両方の場所からすべてのSOWドキュメントを検索:

```markdown
# グローバルワークスペース（ユーザーレベル）
Globパターン: ~/.claude/workspace/planning/**/sow.md

# プロジェクト固有ワークスペース（カレントプロジェクト）
Globパターン: .claude/workspace/planning/**/sow.md
```

**検索優先順位**: プロジェクト固有のSOWが先に表示され、次にグローバルSOW。

### 最新SOWを表示

1. Globを使用してSOWファイルを検索（更新日時順）
2. Readツールで最新ファイルを読み込み

### 特定SOWを表示

Readツールで特定パスを指定:

```text
Read: ~/.claude/workspace/planning/[directory]/sow.md
```

## 出力フォーマット

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 利用可能なSOWドキュメント

📁 プロジェクト固有 (.claude/workspace/)
1. 2025-01-14-oauth-authentication
   作成日: 2025-01-14
   ステータス: ドラフト

📁 グローバル (~/.claude/workspace/)
2. 2025-01-13-api-refactor
   作成日: 2025-01-13
   ステータス: アクティブ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

特定のドキュメントを表示するには:
/plans "oauth-authentication"
```

## 使用例

### すべての計画を一覧表示

```bash
/plans
```

作成日付と共にすべての利用可能な計画ドキュメントを表示。

### 最新を表示

```bash
/plans --latest
```

最も最近作成された計画を表示。

### 特定の計画を表示

```bash
/plans "feature-name"
```

特定の機能の計画ドキュメントを表示。

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
- `/validate` - 計画に対する実装を検証
