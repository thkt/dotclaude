---
name: branch
description: Git差分を分析して適切なブランチ名を自動生成
priority: medium
suitable_for:
  type: [naming, git, workflow]
  phase: [planning, development]
  understanding: "≥ 70%"
aliases: [br, branch-name]
timeout: 10
allowed-tools: Bash(git diff*), Bash(git status*), Bash(git log*), Bash(git branch*), Read, Grep
context:
  changes_analyzed: "dynamic"
  naming_convention: "feature/fix/chore/docs"
  file_patterns: "detected"
---

# /branch - Gitブランチ名ジェネレーター

## 目的

現在のGit変更を分析し、従来のパターンに従った適切なブランチ名を提案します。

## 動的コンテキスト分析

### 現在のブランチステータス

```bash
!`git branch --show-current`
```

### コミットされていない変更

```bash
!`git status --short`
```

### ステージング済み変更のサマリー

```bash
!`git diff --staged --stat`
```

### 変更されたファイル

```bash
!`git diff --name-only HEAD`
```

### 最近のコミット（コンテキスト用）

```bash
!`git log --oneline -5`
```

## ブランチ名生成プロセス

### 1. 変更分析

Git変更を分析して以下を判定：

1. **変更タイプの検出**：
   - 新機能（`feature/`）
   - バグ修正（`fix/`）
   - リファクタリング（`refactor/`）
   - ドキュメント（`docs/`）
   - 雑務/メンテナンス（`chore/`）
   - パフォーマンス（`perf/`）

2. **スコープの特定**：
   - 影響を受けるコンポーネント/モジュール
   - 変更された主要機能
   - ファイルパターン分析

3. **説明の生成**：
   - 簡潔だが説明的
   - ケバブケースを使用
   - 言及された場合はチケット番号を含める

### 2. パターン検出

```bash
# ファイルパターンを分析
!`git diff --name-only | head -10 | xargs -I {} basename {} | cut -d. -f1 | sort -u`
```

```bash
# テスト変更をチェック
!`git diff --name-only | grep -E "(test|spec)" | wc -l`
```

```bash
# ドキュメント変更を検出
!`git diff --name-only | grep -E "\.(md|txt|doc)" | wc -l`
```

### 3. ブランチ名の提案

以下に基づいて複数の提案を生成：

```markdown
## 🌿 ブランチ名の提案

変更内容に基づいた推奨ブランチ名：

### 主要な提案
`[type]/[scope]-[description]`
- **タイプ**: [検出されたタイプ]
- **スコープ**: [主要コンポーネント/エリア]
- **説明**: [機能内容]
- **例**: `feature/auth-add-oauth-support`

### 代替提案
1. `[type]/[ticket]-[description]`（チケット番号が提供された場合）
2. `[type]/[date]-[description]`（時間制約のある作業用）
3. `[type]/[author]-[description]`（個人ブランチ用）

### 適用された規約
- ✅ 小文字のみ
- ✅ 複数単語の説明にはケバブケース
- ✅ 明確なタイププレフィックス
- ✅ 説明的だが簡潔
```

## 命名規約

### タイププレフィックス

| プレフィックス | 使用場面 | 例 |
|--------------|---------|-----|
| `feature/` | 新機能 | `feature/user-profile-page` |
| `fix/` | バグ修正 | `fix/login-validation-error` |
| `hotfix/` | 緊急修正 | `hotfix/payment-gateway-timeout` |
| `refactor/` | コード改善 | `refactor/auth-service-cleanup` |
| `docs/` | ドキュメント | `docs/api-usage-guide` |
| `test/` | テスト追加/修正 | `test/user-service-coverage` |
| `chore/` | メンテナンスタスク | `chore/update-dependencies` |
| `perf/` | パフォーマンス改善 | `perf/query-optimization` |
| `style/` | フォーマット/スタイリング | `style/button-consistency` |

### スコープガイドライン

- 可能な限り単数名詞を使用
- 変更の主要エリアに焦点を当てる
- 最大1-2語に保つ
- 例：`auth`、`user`、`api`、`ui`、`db`

### 説明のベストプラクティス

- 該当する場合は動詞で始める
- 具体的だが簡潔に
- 冗長な単語を避ける
- 最大3-4語

## 高度な機能

### チケット統合

ユーザー入力にチケット参照が含まれる場合（例：JIRA-123）：

```markdown
## チケットベースの命名
検出されたチケット：[TICKET-ID]
提案：`[type]/[TICKET-ID]-[brief-description]`
例：`feature/PROJ-123-add-user-search`
```

### 複数コンポーネントの変更

複数のエリアにまたがる変更の場合：

```markdown
## マルチコンポーネントブランチ
主要スコープ：[メインエリア]
副次的スコープ：[その他のエリア]
提案：`[type]/[primary]-with-[secondary]`
例：`feature/auth-with-ui-updates`
```

## 出力フォーマット

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌿 ブランチ名ジェネレーター

## 現在のステータス
- 現在のブランチ：[ブランチ名]
- 変更ファイル数：[数]
- 追加/削除行数：+[追加] -[削除]

## 分析
- **変更タイプ**：[検出されたタイプ]
- **主要スコープ**：[メインコンポーネント]
- **主な変更**：[簡潔な要約]

## 推奨ブランチ名

### 🎯 主要推奨
`[生成されたブランチ名]`

### 📝 代替案
1. `[代替案-1]` - [この選択肢の理由]
2. `[代替案-2]` - [この選択肢の理由]
3. `[代替案-3]` - [この選択肢の理由]

## 使用方法
ブランチを作成するには：
```bash
git checkout -b [推奨名]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 使用例

### 基本的な使用法

```bash
/branch
```

現在の変更を分析してブランチ名を提案します。

### コンテキスト付き

```bash
/branch "OAuthでユーザー認証を追加"
```

説明を提案に組み込みます。

### チケット付き

```bash
/branch "PROJ-456"
```

ブランチ名にチケット番号を含めます。

## ワークフローとの統合

このコマンドは以下と連携して動作します：

- `/commit` - ブランチ作成後、コミットメッセージを生成
- `/pr` - 準備ができたらPR説明を生成
- `/think` - ブランチ作成前の計画用

## 判断要因

コマンドは以下を考慮します：

1. **変更されたファイルタイプ**：
   - `.tsx/.ts` → feature/fix
   - `.md` → docs
   - `test.ts` → test
   - `package.json` → chore

2. **変更量**：
   - 小さな変更 → 具体的な名前
   - 大きな変更 → より広いスコープの名前

3. **既存のパターン**：
   - 一貫性のために最近のブランチ名を分析
   - 検出可能な場合はプロジェクトの規約に従う
