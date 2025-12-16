---
description: >
  Display current SOW (Statement of Work) progress status.
  Shows acceptance criteria completion, tracks key metrics and build status.
  Read-only viewer for active work. Quick status check for monitoring implementation progress.
  SOW進捗状況を表示。受け入れ基準の完了状況、主要メトリクス、ビルドステータスを追跡。
allowed-tools: Read, Bash(ls:*), Bash(find:*), Bash(cat:*)
model: inherit
---

# /sow - SOW文書ビューア

## 目的

ワークスペースに保存されているStatement of Work（SOW）文書の一覧表示と閲覧。

**簡略化**: 計画文書の読み取り専用ビューア。

## 機能

### SOWの一覧表示

両方の場所からSOW文書を検索:

```bash
# プロジェクト固有のワークスペース（カレントプロジェクト）
!`ls -la .claude/workspace/planning/ 2>/dev/null`

# グローバルワークスペース（ユーザーレベル）
!`ls -la ~/.claude/workspace/planning/`
```

**検索優先順位**: プロジェクト固有のSOWが先に表示され、次にグローバルSOWが表示されます。

### 最新のSOWを表示

```bash
# プロジェクト固有とグローバルの両方から最新を取得
!`{ ls -t .claude/workspace/planning/*/sow.md 2>/dev/null; ls -t ~/.claude/workspace/planning/*/sow.md 2>/dev/null; } | head -1 | xargs cat`
```

### 特定のSOWを表示

```bash
# プロジェクト固有
!`cat .claude/workspace/planning/[directory]/sow.md`

# グローバル
!`cat ~/.claude/workspace/planning/[directory]/sow.md`
```

## 出力フォーマット

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 利用可能なSOW文書

📁 プロジェクト固有 (.claude/workspace/)
1. 2025-01-14-oauth-authentication
   作成日: 2025-01-14
   ステータス: ドラフト

📁 グローバル (~/.claude/workspace/)
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
