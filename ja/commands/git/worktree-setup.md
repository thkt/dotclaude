# Git Worktree Setup - 並列開発環境の構築

## 目的

`git worktree`を使用して、複数のブランチで並列作業を可能にします。

## 使用例

### 新しいworktreeを作成

```bash
# 現在のリポジトリ: ~/project/
# 新しいfeatureブランチをworktreeとして追加
git worktree add ../project-feature-x feature-x

# 結果:
# ~/project/        ← main branch (既存)
# ~/project-feature-x/ ← feature-x branch (新規worktree)
```

### Claude Codeでの活用

**シナリオ**: mainブランチで調査中、緊急のバグ修正が必要

```bash
# Step 1: 調査作業中 (mainブランチ)
cd ~/project
# Claude Code セッション1で /research 実行中...

# Step 2: 緊急バグ修正用worktree作成
git worktree add ../project-fix fix/critical-bug

# Step 3: 新しいターミナル + Claude Codeセッション2
cd ~/project-fix
# /fix でバグ修正

# Step 4: 修正完了後、worktree削除
git worktree remove ../project-fix
```

### worktree管理コマンド

```bash
# 一覧表示
git worktree list

# 削除
git worktree remove <path>

# クリーンアップ（削除済みworktreeの参照を削除）
git worktree prune
```

## 利点

1. **ブランチ切り替え不要** - コンテキストを失わない
2. **並列作業** - 複数のClaude Codeセッション
3. **安全性** - 各worktreeは独立、影響なし

## 注意点

- `.claude/`ディレクトリは各worktreeで共有される（シンボリックリンク推奨）
- `node_modules`などは各worktreeで独立（容量注意）

## 関連コマンド

- `/fix` - バグ修正（worktree推奨）
- `/research` - 調査（mainブランチでworktree推奨）
- `/code` - 実装（featureブランチでworktree推奨）
