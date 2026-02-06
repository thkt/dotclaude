---
name: utilizing-worktrees
description: >
  wt CLI (claude-worktree) による Git worktree 管理。
  ユーザーが worktree, ワークツリー, 並行開発, parallel branch に
  言及したとき、またはワークツリーの作成/切替/一覧/削除を行うときに使用。
allowed-tools: [Bash, Read]
user-invocable: false
---

# Git Worktree 管理 (wt)

`wt` CLI による並行開発用ワークツリー管理。

## 制約

`wt cd` と `wt new` はサブシェル内で `cd` を行うため、Claude Code の Bash ツールから呼んでも親シェルのディレクトリは変わらない。`wt-core` を直接使用してパスを取得し、後続コマンドで利用する。

## コマンド

### ワークツリーの作成

```bash
# デフォルトベース（main/develop/master）から新規ブランチ
wt-core new feature-auth

# 特定ベースから新規ブランチ
wt-core new feature-auth develop

# 既存ブランチをチェックアウト
wt-core new existing-branch
```

戻り値: ワークツリーのディレクトリパス（stdout）。ロックファイルに基づき依存インストールを自動実行。

### ワークツリー一覧

```bash
wt-core ls
```

出力: ブランチ名、変更数、ahead/behind、最終コミットメッセージ。`★` は現在のディレクトリ。

### ワークツリーのパス取得

```bash
wt-core cd feature-auth
```

戻り値: ワークツリーのディレクトリパス（stdout）。

### ワークツリーの削除

```bash
wt-core rm feature-auth
```

未コミットの変更がある場合は拒否。

## 使用パターン

| 意図                         | コマンド                                             |
| ---------------------------- | ---------------------------------------------------- |
| ワークツリーを作成して作業   | `path=$(wt-core new feat-x) && cd "$path" && pwd`    |
| ワークツリー内でコマンド実行 | `path=$(wt-core cd feat-x) && git -C "$path" status` |
| 全ワークツリーを一覧表示     | `wt-core ls`                                         |
| 完了したワークツリーを削除   | `wt-core rm feat-x`                                  |

`cd` は同じ `&&` チェーン内でのみ有効。別の呼び出しでは `git -C "$path"` を使用する。

## ディレクトリ構成

```text
parent/
├── my-repo/                    # メインリポジトリ
└── worktrees/
    └── my-repo/
        ├── feature-auth/       # ワークツリー
        └── bugfix-123/         # ワークツリー
```

## 自動検出セットアップ (new 時)

| ファイル                        | コマンド       |
| ------------------------------- | -------------- |
| `pnpm-lock.yaml`                | `pnpm install` |
| `package-lock.json`             | `npm install`  |
| `yarn.lock`                     | `yarn install` |
| `bun.lockb`                     | `bun install`  |
| `.mise.toml` / `.tool-versions` | `mise install` |
| `.envrc`                        | `direnv allow` |

Security: `direnv allow` は `.envrc` を自動信頼する。信頼できないリポジトリでは `wt-core new` 前に内容を確認すること。

## 注意点

| 操作                                           | リスク                             | 解決策                   |
| ---------------------------------------------- | ---------------------------------- | ------------------------ |
| ワークツリー内で `gh pr merge --delete-branch` | 現在のワークツリーのブランチを削除 | メインリポジトリから実行 |
| 対象ワークツリー内で `wt-core rm`              | ディレクトリが無効になる           | 先にワークツリーから出る |
