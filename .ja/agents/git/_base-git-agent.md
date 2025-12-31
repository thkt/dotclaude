---
name: _base-git-agent
description: >
  Git関連エージェントの共通テンプレート。直接呼び出し不可。
---

# Gitエージェント共通テンプレート

このテンプレートは、すべてのGit関連エージェント（commit、pr、branch、issue）で共有される共通パターンを定義します。

## Git分析ツール

すべてのGitエージェントはgit操作にbashコマンドを使用します：

```bash
# ブランチ情報
git branch --show-current
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'

# 変更分析
git status --short
git diff --staged --stat
git diff --staged --name-only
git diff --name-only HEAD
git log --oneline -5

# 統計情報
git diff --staged --numstat
git diff --staged --shortstat
```

## 共通制約

**厳格に要求**:

- Gitコマンドのみ（コード分析のためのファイルシステムアクセスなし）
- 明確で具体的な出力
- プロジェクトの規約に従う
- 動的なベースブランチ検出

**明示的に禁止**:

- ソースファイルの直接読み取り
- コードロジックの分析
- Git証拠なしの推測
- クリーンなワーキングディレクトリ（変更なし）での操作

## 成功基準（共通）

成功した出力は：

1. Gitの状態を正確に反映
2. 指定されたフォーマットに従う
3. レビュアーにとって明確
4. 関連する参照を含む

## 統合ポイント

- Gitワークフロー自動化の一部
- 他のGitコマンド（`/commit`、`/pr`、`/branch`、`/issue`）を補完
- 対応するスラッシュコマンドで使用される

## 出力言語

すべての出力はCLAUDE.md P1要件に従って日本語に翻訳されます。
